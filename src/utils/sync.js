/**
 * Backend Sync Manager — end-to-end encrypted sync (v1.5.0).
 *
 * Local tokens hold PLAINTEXT secrets. Before anything leaves the device,
 * each secret is encrypted individually with the user's master password
 * (tv3: envelope, see syncCrypto.js). The server stores the envelope
 * opaque and can never decrypt it.
 *
 * The master password lives in memory ONLY (this.syncPassword) and is
 * cleared on lock / logout / master-password removal. Sync is disabled
 * until a master password is set and unlocked; enableSync() throws
 * otherwise instead of silently syncing plaintext.
 *
 * Error contract (v1.5.0): syncToBackend() returns
 *   { ok: true }  on success, or
 *   { ok: false, error: <message> } on failure — it never swallows an
 *   error into a bare `false`. Callers (App.jsx) surface the error.
 * loadFromBackend() throws on failure (including a decryption failure)
 * instead of returning null, so a failed load can never be mistaken
 * for "no cloud data".
 */

import { api } from './api.js'
import {
  decryptSecretFromSync,
  encryptSecretForSync,
  isLegacyServerSecret,
  isSyncEncryptedSecret
} from './syncCrypto.js'

export class SyncManager {
  constructor(apiClient = api) {
    this.api = apiClient
    this.syncEnabled = false
    this.syncInProgress = false
    this.backendIds = new Map()
    // Master password for E2EE sync. Memory only — never localStorage.
    this.syncPassword = null
  }

  // Master password (in-memory only)
  setSyncPassword(password) {
    this.syncPassword = password || null
  }

  clearSyncPassword() {
    this.syncPassword = null
  }

  hasSyncPassword() {
    return Boolean(this.syncPassword)
  }

  requireSyncPassword() {
    if (!this.syncPassword) {
      throw new Error('需要先设置并解锁主密码才能启用同步：同步数据用主密码端到端加密，服务端无法解密')
    }
    return this.syncPassword
  }

  // 检查是否启用后端同步：必须已登录、已启用、且已解锁主密码。
  isSyncEnabled() {
    return this.syncEnabled && this.api.isAuthenticated() && this.hasSyncPassword()
  }

  // 启用后端同步（无主密码时拒绝，避免明文同步）
  enableSync() {
    this.requireSyncPassword()
    this.syncEnabled = true
    localStorage.setItem('backend-sync-enabled', 'true')
  }

  // 禁用后端同步
  disableSync() {
    this.syncEnabled = false
    this.clearSyncPassword()
    localStorage.removeItem('backend-sync-enabled')
  }

  // 初始化同步状态：只恢复“曾启用”标记；主密码仍需解锁后重新设置。
  initSync() {
    const enabled = localStorage.getItem('backend-sync-enabled')
    this.syncEnabled = enabled === 'true' && this.api.isAuthenticated()
    return this.syncEnabled
  }

  // 从后端加载令牌并解密 secret。失败时抛出错误。
  // 旧版明文 secret 行会被当作明文返回，下次推送时重新加密。
  async loadFromBackend() {
    if (!this.isSyncEnabled()) return null
    const password = this.requireSyncPassword()

    const { tokens } = await this.api.getTokens()
    const transformedTokens = []
    for (const token of tokens) {
      if (isLegacyServerSecret(token.secret) && !isSyncEncryptedSecret(token.secret)) {
        // Pre-1.5.0 plaintext row: keep it locally; syncToBackend
        // re-encrypts it on the next push. An `enc:v1:` row cannot be
        // decrypted by the client (fresh DB required) — skip it loudly.
        if (typeof token.secret === 'string' && token.secret.startsWith('enc:v1:')) {
          console.warn('Skipping a pre-1.5.0 server-encrypted token that cannot be decrypted by the client:', token.issuer)
          continue
        }
      }
      transformedTokens.push(await this.transformBackendToken(token, password))
    }
    transformedTokens.forEach(token => {
      this.backendIds.set(String(token.id), token.backendId)
    })
    return transformedTokens
  }

  // 同步令牌到后端。返回 { ok: true } 或 { ok: false, error }。
  // 先成功加载一次后端列表（同一轮），只有加载成功后，才删除本地
  // 已不存在的后端令牌；加载失败时绝不删除任何云端数据。
  async syncToBackend(tokens) {
    if (!this.isSyncEnabled()) {
      return { ok: false, error: '同步未启用：需要先设置并解锁主密码' }
    }
    if (this.syncInProgress) return { ok: false, error: '同步正在进行中' }

    this.syncInProgress = true

    try {
      const password = this.requireSyncPassword()

      // Load first — this load succeeding is what makes deletion safe.
      const { tokens: backendTokens } = await this.api.getTokens()
      const backendMap = new Map(backendTokens.map(t => [t.id, t]))
      const backendByKey = new Map(backendTokens.map(t => [this.tokenKey(t), t]))

      // Local backend ids (tokens already known to the server).
      const localBackendIds = new Set()
      for (const token of tokens) {
        const mappedId = token.backendId || this.backendIds.get(String(token.id))
        if (mappedId) localBackendIds.add(Number(mappedId))
      }

      // 遍历本地令牌，同步到后端（逐条端到端加密）
      for (const token of tokens) {
        const mappedId = token.backendId || this.backendIds.get(String(token.id))
        const backendToken = (mappedId && backendMap.get(Number(mappedId)))
          || backendByKey.get(this.tokenKey(token))

        if (!backendToken) {
          // 新增令牌
          const result = await this.api.addToken(await this.transformToBackendFormat(token, password))
          if (result?.token?.id) {
            this.backendIds.set(String(token.id), result.token.id)
            backendMap.set(result.token.id, result.token)
            backendByKey.set(this.tokenKey(token), result.token)
          }
        } else if (
          Number(token.updatedAt || 0) > Number(backendToken.updated_at || 0)
          || !isSyncEncryptedSecret(backendToken.secret)
        ) {
          // 本地更新，或后端还是旧版明文行：重新加密后上传。
          await this.api.updateToken(backendToken.id, await this.transformToBackendFormat(token, password))
        }

        if (backendToken) {
          this.backendIds.set(String(token.id), backendToken.id)
        }
      }

      // 删除本地已不存在的后端令牌（仅在本次加载成功的前提下）。
      for (const backendToken of backendTokens) {
        if (!localBackendIds.has(Number(backendToken.id))) {
          await this.api.deleteToken(backendToken.id)
          backendMap.delete(backendToken.id)
        }
      }

      return { ok: true }
    } catch (error) {
      return { ok: false, error: error?.message || '同步失败' }
    } finally {
      this.syncInProgress = false
    }
  }

  // 添加令牌（同时保存到后端，加密后上传）。失败时抛出错误。
  async addToken(token) {
    if (!this.isSyncEnabled()) return token
    const password = this.requireSyncPassword()
    const result = await this.api.addToken(await this.transformToBackendFormat(token, password))
    if (result?.token?.id) {
      this.backendIds.set(String(token.id), result.token.id)
    }
    // 使用后端返回的 ID
    return {
      ...token,
      id: result.token.id.toString(),
      backendId: result.token.id
    }
  }

  // 更新令牌（加密后上传）。失败时抛出错误。
  async updateToken(id, tokenData) {
    if (!this.isSyncEnabled()) return
    const password = this.requireSyncPassword()
    const stringId = String(id)
    const backendId = tokenData.backendId
      || this.backendIds.get(stringId)
      || (stringId.length < 10 ? id : null)
    if (backendId) {
      await this.api.updateToken(backendId, await this.transformToBackendFormat(tokenData, password))
    }
  }

  // 删除令牌。失败时抛出错误（调用方决定如何提示）。
  async deleteToken(tokenOrId) {
    if (!this.isSyncEnabled()) return
    const token = typeof tokenOrId === 'object' ? tokenOrId : null
    const id = token?.id ?? tokenOrId
    const stringId = String(id)
    const backendId = token?.backendId
      || this.backendIds.get(stringId)
      || (stringId.length < 10 ? id : null)
    if (backendId) {
      await this.api.deleteToken(backendId)
      this.backendIds.delete(stringId)
    }
  }

  // 批量导入（加密后上传）。失败时抛出错误。
  async bulkImport(tokens) {
    if (!this.isSyncEnabled()) return
    const password = this.requireSyncPassword()
    const backendTokens = []
    for (const token of tokens) {
      backendTokens.push(await this.transformToBackendFormat(token, password))
    }
    await this.api.bulkImport(backendTokens)
  }

  // 记录使用统计
  async recordUse(id) {
    if (!this.isSyncEnabled()) return
    try {
      const backendId = this.backendIds.get(String(id)) || id
      await this.api.recordTokenUse(backendId)
    } catch (error) {
      console.error('Failed to record token use:', error)
    }
  }

  // 转换后端令牌格式到前端格式（解密 secret）
  async transformBackendToken(token, password) {
    return {
      id: token.id.toString(),
      issuer: token.issuer,
      account: token.account,
      secret: await decryptSecretFromSync(token.secret, password),
      algorithm: token.algorithm,
      digits: token.digits,
      period: token.period,
      category: token.category,
      createdAt: token.created_at,
      updatedAt: token.updated_at,
      backendId: token.id
    }
  }

  async transformBackendTokens(backendTokens) {
    const password = this.requireSyncPassword()
    const result = []
    for (const token of backendTokens) {
      result.push(await this.transformBackendToken(token, password))
    }
    return result
  }

  // 转换前端令牌格式到后端格式（逐条加密 secret）
  async transformToBackendFormat(token, password = this.syncPassword) {
    if (!password) this.requireSyncPassword()
    return {
      issuer: token.issuer,
      account: token.account,
      secret: await encryptSecretForSync(token.secret, password),
      algorithm: token.algorithm || 'SHA1',
      digits: token.digits || 6,
      period: token.period || 30,
      category: token.category || 'personal'
    }
  }

  tokenKey(token) {
    return `${token.issuer || ''}\u0000${token.account || ''}`.trim().toLocaleLowerCase()
  }
}

export const syncManager = new SyncManager()
