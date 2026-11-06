/**
 * End-to-end encryption for sync (v1.5.0).
 *
 * Each TOTP secret is encrypted individually on the client with the user's
 * master password, using the same tv3 scheme as the local vault
 * (PBKDF2-SHA256 600,000 iterations + AES-256-GCM, see encryption.js).
 * The server only ever sees the opaque `tv3:` envelope: it stores and
 * returns it as-is and cannot decrypt it.
 *
 * The master password is held in memory only (SyncManager.syncPassword),
 * never in localStorage. Losing / changing the master password makes
 * previously synced secrets undecryptable — same as the local vault.
 */
import { decryptData, encryptData } from './encryption.js'

export const SYNC_ENCRYPTION_PREFIX = 'tv3:'

export function isSyncEncryptedSecret(value) {
  return typeof value === 'string' && value.startsWith(SYNC_ENCRYPTION_PREFIX)
}

/**
 * A legacy (pre-1.5.0) backend row whose secret was stored as plaintext
 * Base32, or as a server-side `enc:v1:` value the client cannot decrypt.
 * Plaintext rows are treated as plaintext locally and re-encrypted on the
 * next push. `enc:v1:` rows cannot be recovered by the client: they belong
 * to a pre-1.5.0 database, which the 1.5.0 upgrade requires discarding
 * (fresh DB required — see CHANGELOG.md).
 */
export function isLegacyServerSecret(value) {
  return typeof value === 'string'
    && value.length > 0
    && !isSyncEncryptedSecret(value)
}

export async function encryptSecretForSync(plaintextSecret, masterPassword) {
  if (!masterPassword) {
    throw new Error('需要先设置并解锁主密码才能启用同步')
  }
  if (typeof plaintextSecret !== 'string' || !plaintextSecret) {
    throw new Error('Token secret must be a non-empty string')
  }
  // Already an envelope (e.g. a token loaded from the server and not yet
  // decrypted): never double-encrypt.
  if (isSyncEncryptedSecret(plaintextSecret)) return plaintextSecret
  return encryptData(plaintextSecret, masterPassword)
}

export async function decryptSecretFromSync(storedSecret, masterPassword) {
  if (!masterPassword) {
    throw new Error('需要先设置并解锁主密码才能启用同步')
  }
  if (!isSyncEncryptedSecret(storedSecret)) {
    // Legacy plaintext row: return it as-is; the next syncToBackend push
    // re-encrypts it (see SyncManager.syncToBackend).
    return storedSecret
  }
  const plaintext = await decryptData(storedSecret, masterPassword)
  if (typeof plaintext !== 'string' || !plaintext) {
    throw new Error('同步数据解密失败：secret 不是有效的明文')
  }
  return plaintext
}
