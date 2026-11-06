import CryptoJS from 'crypto-js'

const MASTER_PASSWORD_KEY = 'totp-hub-master-password'
const SALT_KEY = 'totp-hub-salt'
const ENCRYPTED_DATA_KEY = 'totp-hub-encrypted-data'
const PASSWORD_HASH_PREFIX = 'tv3'
const ENCRYPTION_PREFIX = 'tv3:'
const LEGACY_ENCRYPTION_PREFIX = 'tv2:'
const PBKDF2_ITERATIONS = 600000
const AAD = new TextEncoder().encode('token-vault:v3')
let latestVaultWrite = 0

function bytesToBase64(bytes) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function encodeEnvelope(envelope) {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(envelope)))
}

function decodeEnvelope(value) {
  return JSON.parse(new TextDecoder().decode(base64ToBytes(value)))
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]
  return difference === 0
}

async function importPassword(password) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
}

async function derivePasswordHash(password, salt, iterations) {
  const passwordKey = await importPassword(password)
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    passwordKey,
    256
  )
  return new Uint8Array(bits)
}

async function deriveEncryptionKey(password, salt, iterations) {
  const passwordKey = await importPassword(password)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function legacyHashPassword(password, salt, iterations) {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations,
    hasher: CryptoJS.algo.SHA256
  }).toString(CryptoJS.enc.Hex)
}

function legacyConstantTimeEqual(left, right) {
  return constantTimeEqual(
    Uint8Array.from(left, character => character.charCodeAt(0)),
    Uint8Array.from(right, character => character.charCodeAt(0))
  )
}

function decryptV2(encrypted, password) {
  const envelope = JSON.parse(
    CryptoJS.enc.Base64.parse(encrypted.slice(LEGACY_ENCRYPTION_PREFIX.length))
      .toString(CryptoJS.enc.Utf8)
  )
  const salt = CryptoJS.enc.Hex.parse(envelope.salt)
  const keyMaterial = CryptoJS.PBKDF2(password, salt, {
    keySize: 512 / 32,
    iterations: envelope.iterations,
    hasher: CryptoJS.algo.SHA256
  })
  const encryptionKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(0, 8), 32)
  const authenticationKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(8, 16), 32)
  const authenticatedData = [
    envelope.version,
    envelope.iterations,
    envelope.salt,
    envelope.iv,
    envelope.ciphertext
  ].join(':')
  const expectedMac = CryptoJS.HmacSHA256(authenticatedData, authenticationKey)
    .toString(CryptoJS.enc.Hex)
  if (!legacyConstantTimeEqual(expectedMac, envelope.mac || '')) {
    throw new Error('Encrypted data authentication failed')
  }

  const bytes = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext)
    }),
    encryptionKey,
    {
      iv: CryptoJS.enc.Hex.parse(envelope.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  )
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
}

export function validatePasswordStrength(password) {
  if (password.length < 12) return { valid: false, message: '密码至少需要 12 位' }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含大写字母、小写字母和数字' }
  }
  return { valid: true }
}

export function hasMasterPassword() {
  return localStorage.getItem(MASTER_PASSWORD_KEY) !== null
}

export async function setMasterPassword(password) {
  const validation = validatePasswordStrength(password)
  if (!validation.valid) throw new Error(validation.message)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS)
  const saltValue = bytesToBase64(salt)
  localStorage.setItem(SALT_KEY, saltValue)
  localStorage.setItem(
    MASTER_PASSWORD_KEY,
    `${PASSWORD_HASH_PREFIX}$${PBKDF2_ITERATIONS}$${saltValue}$${bytesToBase64(hash)}`
  )
}

export async function verifyMasterPassword(password) {
  const storedHash = localStorage.getItem(MASTER_PASSWORD_KEY)
  if (!storedHash) return false

  if (storedHash.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const [, iterationsValue, saltValue, hashValue] = storedHash.split('$')
    const iterations = Number.parseInt(iterationsValue, 10)
    if (!saltValue || !hashValue || !Number.isInteger(iterations)) return false
    const actual = await derivePasswordHash(password, base64ToBytes(saltValue), iterations)
    return constantTimeEqual(actual, base64ToBytes(hashValue))
  }

  const legacySalt = localStorage.getItem(SALT_KEY)
  if (!legacySalt) return false
  const [prefix, iterationsValue, salt, expectedHash] = storedHash.split('$')
  if (prefix === 'tv2') {
    return legacyConstantTimeEqual(
      legacyHashPassword(password, salt, Number.parseInt(iterationsValue, 10)),
      expectedHash
    )
  }
  return [100000, 10000].some(iterations => (
    legacyConstantTimeEqual(legacyHashPassword(password, legacySalt, iterations), storedHash)
  ))
}

export function removeMasterPassword() {
  latestVaultWrite += 1
  localStorage.removeItem(MASTER_PASSWORD_KEY)
  localStorage.removeItem(SALT_KEY)
  localStorage.removeItem(ENCRYPTED_DATA_KEY)
}

export async function encryptTokens(tokens, password) {
  const writeId = ++latestVaultWrite
  const encrypted = await encryptData(tokens, password)
  if (writeId !== latestVaultWrite) return false
  localStorage.setItem(ENCRYPTED_DATA_KEY, encrypted)
  localStorage.removeItem('totp-tokens')
  return true
}

export async function decryptTokens(password) {
  const encrypted = localStorage.getItem(ENCRYPTED_DATA_KEY)
  if (!encrypted) return null
  return decryptData(encrypted, password)
}

export function hasEncryptedData() {
  return localStorage.getItem(ENCRYPTED_DATA_KEY) !== null
}

export async function encryptData(data, password) {
  if (!password) throw new Error('加密密码不能为空')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveEncryptionKey(password, salt, PBKDF2_ITERATIONS)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: AAD, tagLength: 128 },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  )
  const envelope = {
    version: 3,
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  }
  return `${ENCRYPTION_PREFIX}${encodeEnvelope(envelope)}`
}

export async function decryptData(encrypted, password) {
  try {
    if (encrypted.startsWith(ENCRYPTION_PREFIX)) {
      const envelope = decodeEnvelope(encrypted.slice(ENCRYPTION_PREFIX.length))
      if (envelope.version !== 3) throw new Error('Unsupported encryption version')
      const salt = base64ToBytes(envelope.salt)
      const iv = base64ToBytes(envelope.iv)
      const key = await deriveEncryptionKey(password, salt, envelope.iterations)
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData: AAD, tagLength: 128 },
        key,
        base64ToBytes(envelope.ciphertext)
      )
      return JSON.parse(new TextDecoder().decode(plaintext))
    }
    if (encrypted.startsWith(LEGACY_ENCRYPTION_PREFIX)) return decryptV2(encrypted, password)

    // v1.5.0: the old unauthenticated CryptoJS passphrase fallback
    // (CryptoJS.AES.decrypt with a password, EVP_BytesToKey/MD5, no
    // authentication) was removed. Only tv3: and tv2: envelopes are
    // accepted now.
    throw new Error('Unsupported encryption format')
  } catch {
    throw new Error('解密失败，请检查密码是否正确')
  }
}

export async function exportBackup(tokens, password = null) {
  const backup = {
    version: '3.0',
    timestamp: Date.now(),
    encrypted: Boolean(password),
    tokens: password ? await encryptData(tokens, password) : tokens
  }
  return JSON.stringify(backup, null, 2)
}

export async function importBackup(jsonString, password = null) {
  try {
    const backup = JSON.parse(jsonString)
    if (!['1.0', '2.0', '3.0'].includes(backup.version)) throw new Error('不支持的备份版本')
    if (backup.encrypted) {
      if (!password) throw new Error('此备份需要密码')
      return await decryptData(backup.tokens, password)
    }
    if (!Array.isArray(backup.tokens)) throw new Error('备份内容无效')
    return backup.tokens
  } catch (error) {
    throw new Error(`导入失败: ${error.message}`)
  }
}
