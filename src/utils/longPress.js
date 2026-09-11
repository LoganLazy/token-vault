import { useState, useRef, useCallback } from 'react'
import { vibrateMedium } from '../utils/mobile'

/**
 * 长按手势 Hook
 * @param {Function} onLongPress - 长按触发的回调
 * @param {number} delay - 长按延迟（毫秒）
 */
export function useLongPress(onLongPress, delay = 500) {
  const [isLongPressing, setIsLongPressing] = useState(false)
  const timerRef = useRef(null)
  const touchStartPos = useRef({ x: 0, y: 0 })

  const start = useCallback((e) => {
    // 记录起始位置
    const touch = e.touches?.[0] || e
    touchStartPos.current = {
      x: touch.clientX,
      y: touch.clientY
    }

    timerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      vibrateMedium() // 长按振动反馈
      onLongPress(e)
    }, delay)
  }, [onLongPress, delay])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsLongPressing(false)
  }, [])

  const move = useCallback((e) => {
    // 如果移动距离超过 10px，取消长按
    const touch = e.touches?.[0] || e
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y)

    if (deltaX > 10 || deltaY > 10) {
      cancel()
    }
  }, [cancel])

  return {
    isLongPressing,
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchMove: move,
      onTouchCancel: cancel
    }
  }
}

/**
 * 上下文菜单位置计算
 */
export function getContextMenuPosition(triggerElement, menuWidth = 200, menuHeight = 150) {
  if (!triggerElement) return { x: 0, y: 0 }

  const rect = triggerElement.getBoundingClientRect()
  const viewportWidth = window.innerWidth

  let x = rect.left + rect.width / 2 - menuWidth / 2
  let y = rect.top - menuHeight - 10 // 默认在上方

  // 水平边界检查
  if (x < 10) x = 10
  if (x + menuWidth > viewportWidth - 10) {
    x = viewportWidth - menuWidth - 10
  }

  // 垂直边界检查
  if (y < 10) {
    // 上方空间不足，显示在下方
    y = rect.bottom + 10
  }

  return { x, y }
}
