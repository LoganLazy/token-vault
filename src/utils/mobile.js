/**
 * 移动端工具函数
 */

/**
 * 触发振动反馈（如果设备支持）
 */
export function vibrate(pattern = [10]) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch (e) {
      console.warn('Vibration not supported:', e)
    }
  }
}

/**
 * 检测是否为移动设备
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * 检测是否为 iOS
 */
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

/**
 * 获取安全区域
 */
export function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement)
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
  }
}

/**
 * 下拉刷新 Hook
 */
export function usePullToRefresh(onRefresh) {
  let startY = 0
  let currentY = 0
  let pulling = false

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].pageY
      pulling = true
    }
  }

  const handleTouchMove = (e) => {
    if (!pulling) return

    currentY = e.touches[0].pageY
    const diff = currentY - startY

    if (diff > 80) {
      // 触发刷新
      pulling = false
      onRefresh()
    }
  }

  const handleTouchEnd = () => {
    pulling = false
    startY = 0
    currentY = 0
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }
}
