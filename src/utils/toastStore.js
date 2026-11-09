/**
 * Pure toast-list helpers (used by useToast, unit-tested in test/sync.test.js).
 *
 * Toasts can carry a stable `key` (e.g. 'sync-master-password' for the
 * "set a master password first" error, 'sync-failed' for sync failures).
 * A new toast with a key replaces the previous toast with the same key, so
 * a repeated failure never stacks; dismissToastsByKey removes every toast
 * with that key while leaving other toasts untouched. That is how App.jsx
 * clears a stale pre-setup sync error once the master password is set or
 * a later sync succeeds — without hiding a genuine fresh failure.
 */

export function addToastToList(toasts, toast) {
  const filtered = toast.key ? toasts.filter(t => t.key !== toast.key) : toasts
  return [...filtered, toast]
}

export function removeToastFromList(toasts, id) {
  return toasts.filter(t => t.id !== id)
}

export function dismissToastsByKey(toasts, toastKey) {
  if (!toastKey) return toasts
  return toasts.filter(t => t.key !== toastKey)
}
