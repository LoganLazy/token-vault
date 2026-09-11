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

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

test('sync adds each local token once and never deletes unrelated cloud data', async () => {
  const calls = { add: 0, update: 0, delete: 0 }
  const cloudTokens = [{
    id: 9,
    issuer: 'Cloud only',
    account: 'cloud@example.com',
    secret: 'BBBB',
    updated_at: 1
  }]
  const api = {
    isAuthenticated: () => true,
    getTokens: async () => ({ tokens: cloudTokens.map(token => ({ ...token })) }),
    addToken: async token => {
      calls.add += 1
      const stored = { ...token, id: 10, updated_at: Date.now() }
      cloudTokens.push(stored)
      return { token: stored }
    },
    updateToken: async () => { calls.update += 1 },
    deleteToken: async () => { calls.delete += 1 }
  }
  const manager = new SyncManager(api)
  manager.enableSync()
  const localToken = {
    id: 'local-1',
    issuer: 'Local',
    account: 'local@example.com',
    secret: 'AAAA',
    updatedAt: 2
  }

  await manager.syncToBackend([localToken])
  await manager.syncToBackend([localToken])

  assert.equal(calls.add, 1)
  assert.equal(calls.delete, 0)
  assert.equal(cloudTokens.length, 2)
})

test('explicit deletion uses a token backend id', async () => {
  const deleted = []
  const api = {
    isAuthenticated: () => true,
    deleteToken: async id => deleted.push(id)
  }
  const manager = new SyncManager(api)
  manager.enableSync()

  await manager.deleteToken({ id: 'local-1', backendId: 42 })
  assert.deepEqual(deleted, [42])
})
