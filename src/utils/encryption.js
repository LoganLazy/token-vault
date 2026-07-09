import CryptoJS from 'crypto-js'

const MASTER_PASSWORD_KEY = 'totp-hub-master-password'
const SALT_KEY = 'totp-hub-salt'
const ENCRYPTED_DATA_KEY = 'totp-hub-encrypted-data'

// 生成随机盐值
function generateSalt() {
  return CryptoJS.lib.WordArray.random(128/8).toString()
}

// 使用密码和盐值生成强哈希
function hashPassword(password, salt) {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString()
}

// 检查密码强度
export function validatePasswordStrength(password) {
  if (password.length < 8) {
    return { valid: false, message: '密码至少需要 8 位' }
  }

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return {
      valid: false,
      message: '密码必须包含大写字母、小写字母和数字'
    }
  }

  return { valid: true }
}

// 检查是否设置了主密码
export function hasMasterPassword() {
  return localStorage.getItem(MASTER_PASSWORD_KEY) !== null
}

// 设置主密码
export function setMasterPassword(password) {
  const validation = validatePasswordStrength(password)
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  const salt = generateSalt()
  const hash = hashPassword(password, salt)

  localStorage.setItem(SALT_KEY, salt)
  localStorage.setItem(MASTER_PASSWORD_KEY, hash)
}

// 验证主密码
export function verifyMasterPassword(password) {
  const storedHash = localStorage.getItem(MASTER_PASSWORD_KEY)
  const salt = localStorage.getItem(SALT_KEY)

  if (!storedHash || !salt) {
    return false
  }

  const hash = hashPassword(password, salt)
  return hash === storedHash
}

// 移除主密码（同时清除加密数据）
export function removeMasterPassword() {
  localStorage.removeItem(MASTER_PASSWORD_KEY)
  localStorage.removeItem(SALT_KEY)
  localStorage.removeItem(ENCRYPTED_DATA_KEY)
}

// 使用主密码加密所有 tokens 数据
export function encryptTokens(tokens, password) {
  const json = JSON.stringify(tokens)
  const encrypted = CryptoJS.AES.encrypt(json, password).toString()
  localStorage.setItem(ENCRYPTED_DATA_KEY, encrypted)
  // 清除明文数据
  localStorage.removeItem('totp-tokens')
}

// 使用主密码解密 tokens 数据
export function decryptTokens(password) {
  const encrypted = localStorage.getItem(ENCRYPTED_DATA_KEY)

  if (!encrypted) {
    return null
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, password)
    const json = bytes.toString(CryptoJS.enc.Utf8)

    if (!json) {
      throw new Error('解密失败')
    }

    return JSON.parse(json)
  } catch (e) {
    throw new Error('解密失败，密码可能不正确')
  }
}

// 检查是否有加密数据
export function hasEncryptedData() {
  return localStorage.getItem(ENCRYPTED_DATA_KEY) !== null
}

// 加密数据
export function encryptData(data, password) {
  const json = JSON.stringify(data)
  return CryptoJS.AES.encrypt(json, password).toString()
}

// 解密数据
export function decryptData(encrypted, password) {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, password)
    const json = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(json)
  } catch (e) {
    throw new Error('解密失败，密码可能不正确')
  }
}

// 导出备份
export function exportBackup(tokens, password = null) {
  const backup = {
    version: '1.0',
    timestamp: Date.now(),
    encrypted: !!password,
    tokens: password ? encryptData(tokens, password) : tokens
  }
  return JSON.stringify(backup, null, 2)
}

// 导入备份
export function importBackup(jsonString, password = null) {
  try {
    const backup = JSON.parse(jsonString)

    if (backup.version !== '1.0') {
      throw new Error('不支持的备份版本')
    }

    if (backup.encrypted) {
      if (!password) {
        throw new Error('此备份需要密码')
      }
      return decryptData(backup.tokens, password)
    }

    return backup.tokens
  } catch (e) {
    throw new Error(`导入失败: ${e.message}`)
  }
}
