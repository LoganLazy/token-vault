import assert from 'node:assert/strict'
import test from 'node:test'

class MemoryStorage {
  constructor() {
    this.values = new Map()
  }
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
}

globalThis.localStorage = new MemoryStorage()
const { SyncManager } = await import('../src/utils/sync.js')
const { decryptData, encryptData } = await import('../src/utils/encryption.js')

const MASTER_PASSWORD = 'ReleasePass123!'

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

function enabledManager(api) {
  const manager = new SyncManager(api)
  manager.setSyncPassword(MASTER_PASSWORD)
  manager.enableSync()
  return manager
}

test('enableSync refuses without a master password', () => {
  const manager = new SyncManager({ isAuthenticated: () => true })
  assert.throws(() => manager.enableSync(), /主密码/)
  assert.equal(manager.isSyncEnabled(), false)
})

test('sync encrypts each secret before upload and never sends plaintext', async () => {
  const uploaded = []
  const api = {
    isAuthenticated: () => true,
    getTokens: async () => ({ tokens: [] }),
    addToken: async token => {
      uploaded.push(token)
      return { token: { ...token, id: 10, updated_at: Date.now() } }
    },
    updateToken: async () => {},
    deleteToken: async () => {}
  }
  const manager = enabledManager(api)
  const localToken = {
    id: 'local-1',
    issuer: 'Local',
    account: 'local@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    updatedAt: 2
  }

  const result = await manager.syncToBackend([localToken])
  assert.equal(result.ok, true)
  assert.equal(uploaded.length, 1)
  assert.match(uploaded[0].secret, /^tv3:/)
  assert.equal(uploaded[0].secret.includes('JBSWY3DPEHPK3PXP'), false)
  assert.equal(await decryptData(uploaded[0].secret, MASTER_PASSWORD), 'JBSWY3DPEHPK3PXP')
})

test('loadFromBackend decrypts tv3 envelopes back to plaintext secrets', async () => {
  const envelope = await encryptData('JBSWY3DPEHPK3PXP', MASTER_PASSWORD)
  const api = {
    isAuthenticated: () => true,
    getTokens: async () => ({
      tokens: [{
        id: 9,
        issuer: 'Cloud',
        account: 'cloud@example.com',
        secret: envelope,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        category: 'personal',
        created_at: 1,
        updated_at: 1
      }]
    })
  }
  const manager = enabledManager(api)
  const tokens = await manager.loadFromBackend()
  assert.equal(tokens.length, 1)
  assert.equal(tokens[0].secret, 'JBSWY3DPEHPK3PXP')
  assert.equal(tokens[0].backendId, 9)
})

test('syncToBackend deletes backend tokens absent locally, but never on load failure', async () => {
  const deleted = []
  const cloudTokens = [{
    id: 9,
    issuer: 'Cloud only',
    account: 'cloud@example.com',
    secret: await encryptData('JBSWY3DPEHPK3PXP', MASTER_PASSWORD),
    updated_at: 1
  }]
  const api = {
    isAuthenticated: () => true,
    getTokens: async () => ({ tokens: cloudTokens.map(token => ({ ...token })) }),
    addToken: async token => ({ token: { ...token, id: 10, updated_at: Date.now() } }),
    updateToken: async () => {},
    deleteToken: async id => { deleted.push(id) }
  }
  const manager = enabledManager(api)
  const localToken = {
    id: 'local-1',
    issuer: 'Local',
    account: 'local@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    updatedAt: 2
  }

  const result = await manager.syncToBackend([localToken])
  assert.equal(result.ok, true)
  // Cloud-only token (id 9) was absent locally after a successful load.
  assert.deepEqual(deleted, [9])

  // Load failure: nothing is deleted and the failure is reported.
  const failingApi = {
    isAuthenticated: () => true,
    getTokens: async () => { throw new Error('network down') },
    deleteToken: async id => { deleted.push(id) }
  }
  const failingManager = enabledManager(failingApi)
  const failed = await failingManager.syncToBackend([localToken])
  assert.equal(failed.ok, false)
  assert.match(failed.error, /network down/)
  assert.deepEqual(deleted, [9])
})

test('a legacy plaintext backend row is loaded as plaintext and re-encrypted on push', async () => {
  const uploaded = []
  const cloudTokens = [{
    id: 9,
    issuer: 'Legacy',
    account: 'legacy@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    category: 'personal',
    created_at: 1,
    updated_at: 1
  }]
  const api = {
    isAuthenticated: () => true,
    getTokens: async () => ({ tokens: cloudTokens.map(token => ({ ...token })) }),
    addToken: async token => ({ token: { ...token, id: 10, updated_at: Date.now() } }),
    updateToken: async (id, token) => { uploaded.push(token) },
    deleteToken: async () => {}
  }
  const manager = enabledManager(api)
  const loaded = await manager.loadFromBackend()
  assert.equal(loaded[0].secret, 'JBSWY3DPEHPK3PXP')

  const result = await manager.syncToBackend(loaded)
  assert.equal(result.ok, true)
  assert.equal(uploaded.length, 1)
  assert.match(uploaded[0].secret, /^tv3:/)
  assert.equal(await decryptData(uploaded[0].secret, MASTER_PASSWORD), 'JBSWY3DPEHPK3PXP')
})

test('explicit deletion uses a token backend id', async () => {
  const deleted = []
  const api = {
    isAuthenticated: () => true,
    deleteToken: async id => deleted.push(id)
  }
  const manager = enabledManager(api)

  await manager.deleteToken({ id: 'local-1', backendId: 42 })
  assert.deepEqual(deleted, [42])
})
