import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decryptTokens,
  encryptTokens,
  hasEncryptedData,
  hasMasterPassword,
  removeMasterPassword,
  setMasterPassword,
  verifyMasterPassword
} from '../src/utils/encryption.js'

class MemoryStorage {
  constructor() {
    this.values = new Map()
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

test('vault encryption authenticates data and preserves tokens', async () => {
  const password = 'ReleasePass123!'
  const tokens = [{ issuer: 'Example', account: 'user@example.com', secret: 'JBSWY3DPEHPK3PXP' }]

  await setMasterPassword(password)
  assert.equal(hasMasterPassword(), true)
  assert.equal(await verifyMasterPassword(password), true)
  assert.equal(await verifyMasterPassword('WrongPassword123!'), false)

  await encryptTokens(tokens, password)
  const encrypted = localStorage.getItem('totp-hub-encrypted-data')
  assert.equal(hasEncryptedData(), true)
  assert.match(encrypted, /^tv3:/)
  assert.equal(encrypted.includes(tokens[0].secret), false)
  assert.deepEqual(await decryptTokens(password), tokens)

  const replacement = encrypted.endsWith('A') ? 'B' : 'A'
  localStorage.setItem('totp-hub-encrypted-data', encrypted.slice(0, -1) + replacement)
  await assert.rejects(() => decryptTokens(password), /解密失败/)
})

test('removing a master password keeps the decrypted plaintext copy', async () => {
  const password = 'ReleasePass123!'
  const tokens = [{ issuer: 'Example', account: 'user@example.com', secret: 'AAAA' }]
  await setMasterPassword(password)
  await encryptTokens(tokens, password)

  const decrypted = await decryptTokens(password)
  localStorage.setItem('totp-tokens', JSON.stringify(decrypted))
  removeMasterPassword()

  assert.equal(hasMasterPassword(), false)
  assert.equal(hasEncryptedData(), false)
  assert.deepEqual(JSON.parse(localStorage.getItem('totp-tokens')), tokens)
})
