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
 * 增强的振动反馈模式
 */
export const VibratePatterns = {
  light: [10],              // 轻触 - 复制
  medium: [15],             // 中等 - 删除单个
  heavy: [20, 50, 20],      // 重 - 批量删除
  success: [10, 30, 10],    // 成功 - 操作完成
  error: [50, 50, 50],      // 错误 - 失败
  warning: [30, 100, 30],   // 警告
}

/**
 * 语义化的振动函数
 */
export function vibrateLight() {
  vibrate(VibratePatterns.light)
}

export function vibrateMedium() {
  vibrate(VibratePatterns.medium)
}

export function vibrateHeavy() {
  vibrate(VibratePatterns.heavy)
}

export function vibrateSuccess() {
  vibrate(VibratePatterns.success)
}

export function vibrateError() {
  vibrate(VibratePatterns.error)
}

export function vibrateWarning() {
  vibrate(VibratePatterns.warning)
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
