import * as OTPAuth from 'otpauth'
import protobuf from 'protobufjs/light.js'

const googleMigrationRoot = protobuf.Root.fromJSON({
  nested: {
    MigrationPayload: {
      fields: {
        otpParameters: { rule: 'repeated', type: 'OtpParameters', id: 1 },
        version: { type: 'int32', id: 2 },
        batchSize: { type: 'int32', id: 3 },
        batchIndex: { type: 'int32', id: 4 },
        batchId: { type: 'int32', id: 5 }
      }
    },
    OtpParameters: {
      fields: {
        secret: { type: 'bytes', id: 1 },
        name: { type: 'string', id: 2 },
        issuer: { type: 'string', id: 3 },
        algorithm: { type: 'int32', id: 4 },
        digits: { type: 'int32', id: 5 },
        type: { type: 'int32', id: 6 },
        counter: { type: 'int64', id: 7 }
      }
    }
  }
})

const GoogleMigrationPayload = googleMigrationRoot.lookupType('MigrationPayload')

function bytesToBase32(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31]
  return output
}

/**
 * 多格式导入工具
 * 支持：Google Authenticator、Authy、2FAS、Microsoft Authenticator
 */

/**
 * 解析 Google Authenticator 导出格式
 * 格式：otpauth-migration://offline?data=<base64>
 */
export function parseGoogleAuthenticatorExport(uri) {
  try {
    const url = new URL(uri)

    if (url.protocol !== 'otpauth-migration:') {
      throw new Error('不是 Google Authenticator 导出格式')
    }

    const dataParam = url.searchParams.get('data')
    if (!dataParam) {
      throw new Error('缺少 data 参数')
    }

    // Google Authenticator 使用 Protocol Buffers 编码
    // 这里需要解码 base64 并解析 protobuf
    // 由于浏览器环境限制，我们使用简化的解析方式

    const normalized = dataParam.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const decoded = atob(padded)
    const bytes = Uint8Array.from(decoded, character => character.charCodeAt(0))
    const tokens = parseGoogleAuthProtobuf(bytes)

    return tokens.map(token => ({
      id: crypto.randomUUID(),
      issuer: token.issuer || 'Unknown',
      account: token.name || '',
      secret: token.secret,
      algorithm: token.algorithm || 'SHA1',
      digits: token.digits || 6,
      period: token.period || 30,
      type: token.type || 'totp',
      category: 'personal',
      copyCount: 0,
      lastCopy: null
    }))
  } catch (error) {
    console.error('Google Authenticator 解析失败:', error)
    throw new Error(`解析失败: ${error.message}`)
  }
}

/**
 * 简化的 Google Auth Protobuf 解析
 * 实际生产环境建议使用 protobuf.js
 */
function parseGoogleAuthProtobuf(data) {
  const payload = GoogleMigrationPayload.decode(data)
  const algorithms = { 1: 'SHA1', 2: 'SHA256', 3: 'SHA512' }
  const digits = { 1: 6, 2: 8 }

  const parameters = payload.otpParameters || []
  if (parameters.length === 0) throw new Error('迁移数据中没有账号')

  const tokens = parameters
    .filter(parameter => parameter.type === 0 || parameter.type === 2)
    .map(parameter => ({
      issuer: parameter.issuer || parameter.name?.split(':')[0] || 'Unknown',
      name: parameter.name || '',
      secret: bytesToBase32(parameter.secret),
      algorithm: algorithms[parameter.algorithm] || 'SHA1',
      digits: digits[parameter.digits] || 6,
      period: 30,
      type: 'totp'
    }))

  if (tokens.length === 0) {
    throw new Error('迁移数据只包含当前不支持的 HOTP 账号')
  }
  return tokens
}

/**
 * 解析 2FAS 导出格式
 * 格式：JSON 数组
 */
export function parse2FASExport(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)

    if (!Array.isArray(data.services)) {
      throw new Error('不是有效的 2FAS 导出格式')
    }

    return data.services.map(service => ({
      id: crypto.randomUUID(),
      issuer: service.name || service.otp?.issuer || 'Unknown',
      account: service.otp?.account || service.otp?.label || '',
      secret: service.secret,
      algorithm: service.otp?.algorithm || 'SHA1',
      digits: service.otp?.digits || 6,
      period: service.otp?.period || 30,
      type: 'totp',
      category: mapCategory(service.group),
      copyCount: 0,
      lastCopy: null
    }))
  } catch (error) {
    throw new Error(`2FAS 解析失败: ${error.message}`)
  }
}

/**
 * 解析 Authy 导出格式
 * Authy 不提供官方导出，通常需要第三方工具
 */
export function parseAuthyExport(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)

    if (!Array.isArray(data)) {
      throw new Error('不是有效的 Authy 导出格式')
    }

    return data.map(item => ({
      id: crypto.randomUUID(),
      issuer: item.name || item.original_name || 'Unknown',
      account: item.account_type || '',
      secret: item.secret || item.decrypted_secret,
      algorithm: 'SHA1',
      digits: item.digits || 6,
      period: 30,
      type: 'totp',
      category: 'personal',
      copyCount: 0,
      lastCopy: null
    }))
  } catch (error) {
    throw new Error(`Authy 解析失败: ${error.message}`)
  }
}

/**
 * 解析 Microsoft Authenticator 导出格式
 * 格式：JSON
 */
export function parseMicrosoftAuthenticatorExport(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)

    if (!Array.isArray(data.accounts)) {
      throw new Error('不是有效的 Microsoft Authenticator 导出格式')
    }

    return data.accounts
      .filter(account => account.oath) // 只处理 TOTP 账号
      .map(account => ({
        id: crypto.randomUUID(),
        issuer: account.issuer || 'Unknown',
        account: account.username || '',
        secret: account.oath.secret,
        algorithm: account.oath.algorithm || 'SHA1',
        digits: account.oath.digits || 6,
        period: account.oath.period || 30,
        type: 'totp',
        category: 'personal',
        copyCount: 0,
        lastCopy: null
      }))
  } catch (error) {
    throw new Error(`Microsoft Authenticator 解析失败: ${error.message}`)
  }
}

/**
 * 智能检测导入格式
 */
export function detectImportFormat(content) {
  // URI 格式
  if (content.startsWith('otpauth://')) {
    return 'uri'
  }

  // Google Authenticator 迁移格式
  if (content.startsWith('otpauth-migration://')) {
    return 'google-auth'
  }

  // JSON 格式
  try {
    const data = JSON.parse(content)

    // 2FAS 格式检测
    if (data.services && Array.isArray(data.services)) {
      return '2fas'
    }

    // Microsoft Authenticator 格式检测
    if (data.accounts && Array.isArray(data.accounts)) {
      return 'microsoft-auth'
    }

    // Authy 格式检测（通常是数组）
    if (Array.isArray(data) && data[0]?.secret) {
      return 'authy'
    }

    // Token Vault 原生备份格式（保留旧 ID 以兼容历史备份）
    if (Array.isArray(data) && data[0]?.id && data[0]?.issuer) {
      return 'totp-hub'
    }

    return 'unknown-json'
  } catch {
    return 'unknown'
  }
}

/**
 * 统一导入接口
 */
export function importFromFormat(content, format) {
  switch (format) {
    case 'uri':
      // 单个 URI
      return [parseOTPAuthURI(content)]

    case 'google-auth':
      return parseGoogleAuthenticatorExport(content)

    case '2fas':
      return parse2FASExport(content)

    case 'authy':
      return parseAuthyExport(content)

    case 'microsoft-auth':
      return parseMicrosoftAuthenticatorExport(content)

    case 'totp-hub':
      // 原生格式，直接解析
      return JSON.parse(content)

    default:
      throw new Error('不支持的导入格式')
  }
}

/**
 * 解析标准 otpauth:// URI
 */
function parseOTPAuthURI(uri) {
  try {
    const totp = OTPAuth.URI.parse(uri)

    return {
      id: crypto.randomUUID(),
      issuer: totp.issuer || 'Unknown',
      account: totp.label || '',
      secret: totp.secret.base32,
      algorithm: totp.algorithm,
      digits: totp.digits,
      period: totp.period,
      type: 'totp',
      category: 'personal',
      copyCount: 0,
      lastCopy: null
    }
  } catch (error) {
    throw new Error(`URI 解析失败: ${error.message}`)
  }
}

/**
 * 映射分类
 */
function mapCategory(groupName) {
  const mapping = {
    'work': 'work',
    'personal': 'personal',
    'finance': 'finance',
    'social': 'social',
    'developer': 'dev',
    'gaming': 'gaming'
  }

  const lowerName = (groupName || '').toLowerCase()
  return mapping[lowerName] || 'other'
}

/**
 * 获取支持的格式列表
 */
export function getSupportedFormats() {
  return [
    {
      id: 'uri',
      name: 'otpauth:// URI',
      description: '标准的 TOTP URI 格式',
      example: 'otpauth://totp/Example:user@example.com?secret=...'
    },
    {
      id: 'google-auth',
      name: 'Google Authenticator',
      description: '从 Google Authenticator 导出的迁移数据',
      example: 'otpauth-migration://offline?data=...',
      note: '支持 Google Authenticator 批量迁移二维码'
    },
    {
      id: '2fas',
      name: '2FAS',
      description: '2FAS Authenticator 的 JSON 导出',
      example: '{ "services": [...] }'
    },
    {
      id: 'authy',
      name: 'Authy',
      description: 'Authy 的备份数据（需第三方工具导出）',
      example: '[{ "name": "...", "secret": "..." }]',
      note: '⚠️ Authy 不提供官方导出功能'
    },
    {
      id: 'microsoft-auth',
      name: 'Microsoft Authenticator',
      description: 'Microsoft Authenticator 的备份 JSON',
      example: '{ "accounts": [...] }'
    },
    {
      id: 'totp-hub',
      name: 'Token Vault',
      description: 'Token Vault 原生备份格式',
      example: '[{ "id": "...", "issuer": "..." }]'
    }
  ]
}
