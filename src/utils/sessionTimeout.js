import { useState, useEffect, useCallback } from 'react'

// 会话超时管理 Hook
export function useSessionTimeout(onTimeout, timeoutMinutes = 15) {
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [timeoutEnabled, setTimeoutEnabled] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const timeoutDuration = timeoutMinutes * 60 * 1000 // 转换为毫秒
  const warningThreshold = 30 * 1000 // 锁定前30秒警告

  // 重置活动时间
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now())
    setShowWarning(false)
  }, [])

  // 监听用户活动
  useEffect(() => {
    if (!timeoutEnabled) return

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']

    const handleActivity = () => {
      resetActivity()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [timeoutEnabled, resetActivity])

  // 检查超时
  useEffect(() => {
    if (!timeoutEnabled) return

    const checkInterval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastActivity
      const remaining = timeoutDuration - elapsed

      if (remaining <= 0) {
        // 超时，触发锁定
        setShowWarning(false)
        onTimeout?.()
      } else if (remaining <= warningThreshold && !showWarning) {
        // 显示警告
        setShowWarning(true)
        setRemainingSeconds(Math.ceil(remaining / 1000))
      } else if (remaining > warningThreshold && showWarning) {
        // 取消警告
        setShowWarning(false)
      }

      if (showWarning) {
        setRemainingSeconds(Math.ceil(remaining / 1000))
      }
    }, 1000) // 每秒检查一次

    return () => clearInterval(checkInterval)
  }, [timeoutEnabled, lastActivity, timeoutDuration, warningThreshold, showWarning, onTimeout])

  return {
    showWarning,
    remainingSeconds,
    resetActivity,
    timeoutEnabled,
    setTimeoutEnabled
  }
}

// 会话超时设置
export const TIMEOUT_OPTIONS = [
  { value: 5, label: '5 分钟' },
  { value: 10, label: '10 分钟' },
  { value: 15, label: '15 分钟 (推荐)' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '60 分钟' },
  { value: 0, label: '禁用' }
]
