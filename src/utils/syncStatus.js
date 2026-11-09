/**
 * Sync status derivation (pure functions, unit-tested in test/sync.test.js).
 *
 * The app previously showed no sync state anywhere. deriveSyncStatus turns
 * the app's sync facts into one displayable status; App.jsx owns the facts
 * (lastSyncAt, lastSyncError, syncing) and this module only derives.
 *
 * Precedence (most current first): no master password -> locked -> syncing
 * -> failed (most recent outcome) -> synced (last success time) -> idle.
 * A successful sync must clear lastSyncError (App.jsx does that), so a
 * stale failure can never outrank a later success.
 */

export function formatSyncTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function deriveSyncStatus({
  authenticated,
  hasMasterPassword,
  isLocked,
  syncing,
  lastSyncAt,
  lastSyncError
}) {
  if (!authenticated) {
    return { key: 'signed-out', label: '未登录', detail: '', dotClass: 'bg-gray-400' }
  }
  if (!hasMasterPassword) {
    return { key: 'no-password', label: '未设置主密码', detail: '', dotClass: 'bg-amber-500' }
  }
  if (isLocked) {
    return { key: 'locked', label: '已锁定', detail: '', dotClass: 'bg-gray-400' }
  }
  if (syncing) {
    return { key: 'syncing', label: '同步中', detail: '', dotClass: 'bg-amber-500 animate-pulse' }
  }
  if (lastSyncError) {
    return { key: 'failed', label: '同步失败', detail: lastSyncError, dotClass: 'bg-red-500' }
  }
  if (lastSyncAt) {
    return { key: 'synced', label: '已同步', detail: formatSyncTime(lastSyncAt), dotClass: 'bg-green-500' }
  }
  return { key: 'idle', label: '未同步', detail: '', dotClass: 'bg-gray-400' }
}
