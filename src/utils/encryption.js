import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = 'totp-hub-encryption-key'
const MASTER_PASSWORD_KEY = 'totp-hub-master-password'

// 检查是否设置了主密码
export function hasMasterPassword() {
  return localStorage.getItem(MASTER_PASSWORD_KEY) !== null
}

// 设置主密码
export function setMasterPassword(password) {
  const hash = CryptoJS.SHA256(password).toString()
  localStorage.setItem(MASTER_PASSWORD_KEY, hash)
}

// 验证主密码
export function verifyMasterPassword(password) {
  const hash = CryptoJS.SHA256(password).toString()
  const stored = localStorage.getItem(MASTER_PASSWORD_KEY)
  return hash === stored
}

// 移除主密码
export function removeMasterPassword() {
  localStorage.removeItem(MASTER_PASSWORD_KEY)
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
