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
const { deriveSyncStatus, formatSyncTime } = await import('../src/utils/syncStatus.js')
const { addToastToList, removeToastFromList, dismissToastsByKey } = await import('../src/utils/toastStore.js')

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

// --- Sync status display (Issue 2) ----------------------------------------

test('formatSyncTime renders local HH:MM and empty for no timestamp', () => {
  // Constructed in local time so the test is timezone-independent.
  assert.equal(formatSyncTime(new Date(2026, 10, 9, 19, 24, 0).getTime()), '19:24')
  assert.equal(formatSyncTime(new Date(2026, 10, 9, 5, 3, 0).getTime()), '05:03')
  assert.equal(formatSyncTime(null), '')
  assert.equal(formatSyncTime(0), '')
  assert.equal(formatSyncTime(undefined), '')
})

test('deriveSyncStatus covers every state', () => {
  const base = {
    authenticated: true,
    hasMasterPassword: true,
    isLocked: false,
    syncing: false,
    lastSyncAt: null,
    lastSyncError: null
  }

  assert.equal(deriveSyncStatus({ ...base, authenticated: false }).key, 'signed-out')
  assert.equal(deriveSyncStatus({ ...base, authenticated: false }).label, '未登录')
  assert.equal(deriveSyncStatus({ ...base, hasMasterPassword: false }).key, 'no-password')
  assert.equal(deriveSyncStatus({ ...base, hasMasterPassword: false }).label, '未设置主密码')
  assert.equal(deriveSyncStatus({ ...base, isLocked: true }).key, 'locked')
  assert.equal(deriveSyncStatus({ ...base, isLocked: true }).label, '已锁定')
  assert.equal(deriveSyncStatus({ ...base, syncing: true }).key, 'syncing')
  assert.equal(deriveSyncStatus({ ...base, syncing: true }).label, '同步中')

  const failed = deriveSyncStatus({ ...base, lastSyncError: '网络异常' })
  assert.equal(failed.key, 'failed')
  assert.equal(failed.label, '同步失败')
  assert.equal(failed.detail, '网络异常')

  const syncedAt = new Date(2026, 10, 9, 19, 24, 0).getTime()
  const synced = deriveSyncStatus({ ...base, lastSyncAt: syncedAt })
  assert.equal(synced.key, 'synced')
  assert.equal(synced.label, '已同步')
  assert.equal(synced.detail, '19:24')

  assert.equal(deriveSyncStatus(base).key, 'idle')
  assert.equal(deriveSyncStatus(base).label, '未同步')
})

test('deriveSyncStatus precedence: locked beats syncing, syncing beats failure, failure beats last success', () => {
  const base = {
    authenticated: true,
    hasMasterPassword: true,
    isLocked: false,
    syncing: false,
    lastSyncAt: new Date(2026, 10, 9, 19, 24, 0).getTime(),
    lastSyncError: null
  }
  // A stale failure must not outrank a later success: success clears the
  // error in App.jsx, so a state with both set is treated as failed only
  // until the next success clears it.
  assert.equal(deriveSyncStatus({ ...base, lastSyncError: '网络异常' }).key, 'failed')
  assert.equal(deriveSyncStatus({ ...base, lastSyncError: '网络异常', syncing: true }).key, 'syncing')
  assert.equal(deriveSyncStatus({ ...base, isLocked: true, syncing: true }).key, 'locked')
  assert.equal(deriveSyncStatus({ ...base, hasMasterPassword: false }).key, 'no-password')
})

// --- Stale sync-error notice clearing (Issue 1) ----------------------------

test('dismissing the master-password notice leaves other toasts untouched', () => {
  let toasts = []
  toasts = addToastToList(toasts, {
    id: 1, message: '需要先设置并解锁主密码才能启用同步', type: 'error', duration: 5000, key: 'sync-master-password'
  })
  toasts = addToastToList(toasts, {
    id: 2, message: '同步失败：网络异常，本地数据已保留', type: 'error', duration: 5000, key: 'sync-failed'
  })
  assert.equal(toasts.length, 2)

  // Master password set / app unlocked: the pre-setup notice is stale and
  // goes away, the genuine sync failure stays visible.
  toasts = dismissToastsByKey(toasts, 'sync-master-password')
  assert.deepEqual(toasts.map(t => t.id), [2])

  // A fresh sync failure after the clear still surfaces as a new toast.
  toasts = addToastToList(toasts, {
    id: 3, message: '同步失败：网络异常，本地数据已保留', type: 'error', duration: 5000, key: 'sync-failed'
  })
  assert.deepEqual(toasts.map(t => t.id), [3])

  // A subsequent successful sync clears the failure notice.
  toasts = dismissToastsByKey(toasts, 'sync-failed')
  assert.deepEqual(toasts, [])
})

test('same-key toasts replace instead of stacking; dismiss with no key is a no-op', () => {
  let toasts = []
  toasts = addToastToList(toasts, { id: 1, message: '同步失败：A', type: 'error', duration: 5000, key: 'sync-failed' })
  toasts = addToastToList(toasts, { id: 2, message: '同步失败：B', type: 'error', duration: 5000, key: 'sync-failed' })
  assert.deepEqual(toasts.map(t => t.id), [2])
  assert.equal(toasts[0].message, '同步失败：B')

  // Unkeyed toasts always append.
  toasts = addToastToList(toasts, { id: 3, message: '普通提示', type: 'info', duration: 2000, key: null })
  assert.deepEqual(toasts.map(t => t.id), [2, 3])

  assert.strictEqual(dismissToastsByKey(toasts, null), toasts)
  assert.deepEqual(dismissToastsByKey(toasts, 'no-such-key').map(t => t.id), [2, 3])
  assert.deepEqual(removeToastFromList(toasts, 2).map(t => t.id), [3])
})

// --- Toast auto-dismiss timer (Issue 1 root cause) -------------------------
// Regression test: the old Toast effect depended on onClose, and the parent
// passed a fresh inline arrow every render; the app re-renders every second
// for the TOTP clock, so the timer was reset forever and no toast ever
// auto-dismissed. The fix (useStableTimeout) keeps the latest callback in
// a ref and only depends on the delay, so the timer fires once even while
// the parent keeps re-rendering.

test('toast timer fires once even while the parent re-renders every 100ms', async () => {
  const { JSDOM } = await import('jsdom')
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  // Node 24 exposes navigator as a getter-only global; define it instead.
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.Node = dom.window.Node
  globalThis.IS_REACT_ACT_ENVIRONMENT = true

  const React = await import('react')
  const { act } = React
  const { createRoot } = await import('react-dom/client')
  const { useStableTimeout } = await import('../src/utils/useStableTimeout.js')

  let closed = 0
  const container = document.getElementById('root')
  const root = createRoot(container)

  // Parent that re-renders every 100ms, like the 1s TOTP clock does.
  function ClockParent() {
    const [tick, setTick] = React.useState(0)
    React.useEffect(() => {
      const id = setInterval(() => setTick(t => t + 1), 100)
      return () => clearInterval(id)
    }, [])
    useStableTimeout(() => { closed++ }, 300)
    return React.createElement('div', null, `tick ${tick}`)
  }

  await act(async () => {
    root.render(React.createElement(ClockParent))
  })
  assert.match(document.body.textContent, /tick \d+/)

  // Wait past the 300ms duration while the parent keeps re-rendering.
  // With the old [duration, onClose] effect the timer would reset every
  // 100ms and never fire, leaving closed at 0.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 700))
  })
  assert.equal(closed, 1)

  await act(async () => {
    root.unmount()
  })
})
