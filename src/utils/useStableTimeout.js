import { useEffect, useRef } from 'react'

/**
 * Run `callback` once after `delay` ms, always calling the LATEST
 * callback even if the component re-renders before the timer fires.
 *
 * A plain `useEffect(() => setTimeout(callback, delay), [delay, callback])`
 * resets the timer whenever the callback identity changes. Callers that pass
 * an inline arrow (e.g. Toast's onClose) re-render often — the app
 * re-renders every second for the TOTP clock — so the timer was reset
 * forever and toasts never auto-dismissed. This hook keeps the callback in
 * a ref and only depends on `delay`, so the timer is set once per mount
 * (or when `delay` changes).
 */
export function useStableTimeout(callback, delay) {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => callbackRef.current(), delay)
      return () => clearTimeout(timer)
    }
  }, [delay])
}
