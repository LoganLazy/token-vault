import assert from 'node:assert/strict'
import test from 'node:test'
import { SecretCipher } from '../src/utils/secretCipher.js'
import {
  normalizeEmail,
  normalizeTokenInput,
  validateAccountPassword
} from '../src/utils/validation.js'

test('shared secret cipher encrypts and authenticates database values', () => {
  const cipher = new SecretCipher('a'.repeat(64))
  const encrypted = cipher.encrypt('JBSWY3DPEHPK3PXP')
  assert.match(encrypted, /^enc:v1:/)
  assert.equal(encrypted.includes('JBSWY3DPEHPK3PXP'), false)
  assert.equal(cipher.decrypt(encrypted), 'JBSWY3DPEHPK3PXP')

  const parts = encrypted.split(':')
  const ciphertext = Buffer.from(parts[4], 'base64url')
  ciphertext[0] ^= 0xff
  parts[4] = ciphertext.toString('base64url')
  const tampered = parts.join(':')
  assert.throws(() => cipher.decrypt(tampered), /verify DATA_ENCRYPTION_KEY/)
})

test('API validation normalizes safe values and rejects invalid input', () => {
  assert.equal(normalizeEmail(' User@Example.com '), 'user@example.com')
  assert.doesNotThrow(() => validateAccountPassword('ReleasePass123'))
  assert.throws(() => validateAccountPassword('short'), /between 12 and 128/)

  const token = normalizeTokenInput({
    issuer: ' Example ',
    account: ' user@example.com ',
    secret: 'jbsw-y3dp ehpk3pxp'
  })
  assert.equal(token.issuer, 'Example')
  assert.equal(token.secret, 'JBSWY3DPEHPK3PXP')
  assert.throws(
    () => normalizeTokenInput({ issuer: 'A', account: 'B', secret: '<script>' }),
    /Base32/
  )
})
