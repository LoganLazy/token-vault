import assert from 'node:assert/strict'
import test from 'node:test'
import protobuf from 'protobufjs/light.js'
import { parseGoogleAuthenticatorExport } from '../src/utils/importFormats.js'

const root = protobuf.Root.fromJSON({
  nested: {
    MigrationPayload: {
      fields: {
        otpParameters: { rule: 'repeated', type: 'OtpParameters', id: 1 }
      }
    },
    OtpParameters: {
      fields: {
        secret: { type: 'bytes', id: 1 },
        name: { type: 'string', id: 2 },
        issuer: { type: 'string', id: 3 },
        algorithm: { type: 'int32', id: 4 },
        digits: { type: 'int32', id: 5 },
        type: { type: 'int32', id: 6 }
      }
    }
  }
})

test('Google Authenticator migration payload imports TOTP accounts', () => {
  const type = root.lookupType('MigrationPayload')
  const bytes = type.encode(type.create({
    otpParameters: [{
      secret: Uint8Array.from([72, 101, 108, 108, 111, 33]),
      name: 'user@example.com',
      issuer: 'Example',
      algorithm: 1,
      digits: 1,
      type: 2
    }]
  })).finish()
  const base64 = Buffer.from(bytes).toString('base64url')
  const tokens = parseGoogleAuthenticatorExport(`otpauth-migration://offline?data=${base64}`)

  assert.equal(tokens.length, 1)
  assert.equal(tokens[0].issuer, 'Example')
  assert.equal(tokens[0].account, 'user@example.com')
  assert.equal(tokens[0].secret, 'JBSWY3DPEE')
})
