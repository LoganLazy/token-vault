import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from 'node:crypto'

const PREFIX = 'enc:v1'

export class SecretCipher {
  constructor(key) {
    const value = key || 'dev-encryption-key-change-in-production'
    this.key = /^[a-fA-F0-9]{64}$/.test(value)
      ? Buffer.from(value, 'hex')
      : createHash('sha256').update(value, 'utf8').digest()
  }

  isEncrypted(secret) {
    return typeof secret === 'string' && secret.startsWith(`${PREFIX}:`)
  }

  encrypt(secret) {
    if (typeof secret !== 'string' || !secret) {
      throw new Error('Token secret must be a non-empty string')
    }
    if (this.isEncrypted(secret)) return secret

    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const ciphertext = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final()
    ])

    return [
      PREFIX,
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ciphertext.toString('base64url')
    ].join(':')
  }

  decrypt(secret) {
    if (!this.isEncrypted(secret)) return secret

    const parts = secret.split(':')
    if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== PREFIX) {
      throw new Error('Stored token secret has an invalid encrypted format')
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(parts[2], 'base64url')
      )
      decipher.setAuthTag(Buffer.from(parts[3], 'base64url'))
      return Buffer.concat([
        decipher.update(Buffer.from(parts[4], 'base64url')),
        decipher.final()
      ]).toString('utf8')
    } catch (error) {
      throw new Error('Unable to decrypt token secret; verify DATA_ENCRYPTION_KEY', {
        cause: error
      })
    }
  }

  decryptToken(token) {
    return token ? { ...token, secret: this.decrypt(token.secret) } : token
  }
}
