import { useState, useCallback } from 'react'
import { addToastToList, removeToastFromList, dismissToastsByKey } from './toastStore.js'

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  // `toastKey` (optional) groups related toasts: a new toast with a key
  // replaces the previous one with the same key, and dismissByKey removes
  // every toast with that key. Used for sync notices so a stale pre-setup
  // error can be cleared without touching other toasts.
  const showToast = useCallback((message, type = 'info', duration = 3000, toastKey = null) => {
    const id = toastId++
    setToasts(prev => addToastToList(prev, { id, message, type, duration, key: toastKey }))
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => removeToastFromList(prev, id))
  }, [])

  const dismissByKey = useCallback((toastKey) => {
    setToasts(prev => dismissToastsByKey(prev, toastKey))
  }, [])

  const success = useCallback((message, duration, toastKey) => {
    showToast(message, 'success', duration, toastKey)
  }, [showToast])

  const error = useCallback((message, duration, toastKey) => {
    showToast(message, 'error', duration, toastKey)
  }, [showToast])

  const warning = useCallback((message, duration, toastKey) => {
    showToast(message, 'warning', duration, toastKey)
  }, [showToast])

  const info = useCallback((message, duration, toastKey) => {
    showToast(message, 'info', duration, toastKey)
  }, [showToast])

  return {
    toasts,
    showToast,
    removeToast,
    dismissByKey,
    success,
    error,
    warning,
    info
  }
}
