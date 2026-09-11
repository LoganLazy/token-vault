/**
 * Backend Sync Manager
 * 混合模式：localStorage + 可选的后端同步
 */

import { api } from './api.js'

export class SyncManager {
  constructor(apiClient = api) {
    this.api = apiClient
    this.syncEnabled = false
    this.syncInProgress = false
    this.backendIds = new Map()
  }

  // 检查是否启用后端同步
  isSyncEnabled() {
    return this.syncEnabled && this.api.isAuthenticated()
  }

  // 启用后端同步
  enableSync() {
    this.syncEnabled = true
    localStorage.setItem('backend-sync-enabled', 'true')
  }

  // 禁用后端同步
  disableSync() {
    this.syncEnabled = false
    localStorage.removeItem('backend-sync-enabled')
  }

  // 初始化同步状态
  initSync() {
    const enabled = localStorage.getItem('backend-sync-enabled')
    this.syncEnabled = enabled === 'true' && this.api.isAuthenticated()
    return this.syncEnabled
  }

  // 从后端加载令牌
  async loadFromBackend() {
    if (!this.isSyncEnabled()) return null

    try {
      const { tokens } = await this.api.getTokens()
      const transformedTokens = this.transformBackendTokens(tokens)
      transformedTokens.forEach(token => {
        this.backendIds.set(String(token.id), token.backendId)
      })
      return transformedTokens
    } catch (error) {
      console.error('Failed to load from backend:', error)
      return null
    }
  }

  // 同步令牌到后端
  async syncToBackend(tokens) {
    if (!this.isSyncEnabled() || this.syncInProgress) return

    this.syncInProgress = true

    try {
      // 获取后端令牌
      const { tokens: backendTokens } = await this.api.getTokens()
      const backendMap = new Map(backendTokens.map(t => [t.id, t]))
      const backendByKey = new Map(backendTokens.map(t => [this.tokenKey(t), t]))

      // 遍历本地令牌，同步到后端
      for (const token of tokens) {
        const mappedId = token.backendId || this.backendIds.get(String(token.id))
        const backendToken = (mappedId && backendMap.get(Number(mappedId)))
          || backendByKey.get(this.tokenKey(token))

        if (!backendToken) {
          // 新增令牌
          const result = await this.api.addToken(this.transformToBackendFormat(token))
          if (result?.token?.id) {
            this.backendIds.set(String(token.id), result.token.id)
            backendMap.set(result.token.id, result.token)
            backendByKey.set(this.tokenKey(token), result.token)
          }
        } else if (Number(token.updatedAt || 0) > Number(backendToken.updated_at || 0)) {
          // 更新令牌
          await this.api.updateToken(backendToken.id, this.transformToBackendFormat(token))
        }

        if (backendToken) {
          this.backendIds.set(String(token.id), backendToken.id)
        }
      }

      return true
    } catch (error) {
      console.error('Failed to sync to backend:', error)
      return false
    } finally {
      this.syncInProgress = false
    }
  }

  // 添加令牌（同时保存到后端）
  async addToken(token) {
    if (!this.isSyncEnabled()) return token

    try {
      const result = await this.api.addToken(this.transformToBackendFormat(token))
      if (result?.token?.id) {
        this.backendIds.set(String(token.id), result.token.id)
      }
      // 使用后端返回的 ID
      return {
        ...token,
        id: result.token.id.toString(),
        backendId: result.token.id
      }
    } catch (error) {
      console.error('Failed to add token to backend:', error)
      return token // 降级到本地
    }
  }

  // 更新令牌
  async updateToken(id, tokenData) {
    if (!this.isSyncEnabled()) return

    try {
      const stringId = String(id)
      const backendId = tokenData.backendId
        || this.backendIds.get(stringId)
        || (stringId.length < 10 ? id : null)
      if (backendId) {
        await this.api.updateToken(backendId, this.transformToBackendFormat(tokenData))
      }
    } catch (error) {
      console.error('Failed to update token on backend:', error)
    }
  }

  // 删除令牌
  async deleteToken(tokenOrId) {
    if (!this.isSyncEnabled()) return

    try {
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
    } catch (error) {
      console.error('Failed to delete token from backend:', error)
    }
  }

  // 批量导入
  async bulkImport(tokens) {
    if (!this.isSyncEnabled()) return

    try {
      const backendTokens = tokens.map(t => this.transformToBackendFormat(t))
      await this.api.bulkImport(backendTokens)
    } catch (error) {
      console.error('Failed to bulk import to backend:', error)
    }
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

  // 转换后端令牌格式到前端格式
  transformBackendTokens(backendTokens) {
    return backendTokens.map(t => ({
      id: t.id.toString(),
      issuer: t.issuer,
      account: t.account,
      secret: t.secret,
      algorithm: t.algorithm,
      digits: t.digits,
      period: t.period,
      category: t.category,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      backendId: t.id
    }))
  }

  // 转换前端令牌格式到后端格式
  transformToBackendFormat(token) {
    return {
      issuer: token.issuer,
      account: token.account,
      secret: token.secret,
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
