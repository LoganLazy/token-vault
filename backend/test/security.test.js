import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeEmail,
  normalizeTokenInput,
  validateAccountPassword
} from '../src/utils/validation.js'

// v1.5.0: there is no server-side SecretCipher any more. The sync API
// accepts only opaque tv3: envelopes produced by the client; the server
// stores them as-is and cannot decrypt them.
test('API validation accepts only tv3 envelopes and rejects plaintext secrets', () => {
  assert.equal(normalizeEmail(' User@Example.com '), 'user@example.com')
  assert.doesNotThrow(() => validateAccountPassword('ReleasePass123'))
  assert.throws(() => validateAccountPassword('short'), /between 12 and 128/)

  const token = normalizeTokenInput({
    issuer: ' Example ',
    account: ' user@example.com ',
    secret: 'tv3:opaque-envelope'
  })
  assert.equal(token.issuer, 'Example')
  assert.equal(token.secret, 'tv3:opaque-envelope')

  // Plaintext Base32 must be rejected on the sync API.
  assert.throws(
    () => normalizeTokenInput({ issuer: 'A', account: 'B', secret: 'JBSWY3DPEHPK3PXP' }),
    /tv3:/
  )
  assert.throws(
    () => normalizeTokenInput({ issuer: 'A', account: 'B', secret: '<script>' }),
    /tv3:/
  )
  // Over-long envelopes are rejected.
  assert.throws(
    () => normalizeTokenInput({ issuer: 'A', account: 'B', secret: `tv3:${'x'.repeat(3000)}` }),
    /at most 2048/
  )
})
