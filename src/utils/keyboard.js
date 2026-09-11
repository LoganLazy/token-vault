/**
 * 键盘弹出适配工具
 */

let originalViewportHeight = 0

/**
 * 初始化键盘监听
 */
export function initKeyboardHandler() {
  if (!window.visualViewport) return

  originalViewportHeight = window.visualViewport.height

  window.visualViewport.addEventListener('resize', handleViewportResize)
  window.visualViewport.addEventListener('scroll', handleViewportScroll)
}

/**
 * 清理键盘监听
 */
export function cleanupKeyboardHandler() {
  if (!window.visualViewport) return

  window.visualViewport.removeEventListener('resize', handleViewportResize)
  window.visualViewport.removeEventListener('scroll', handleViewportScroll)
}

/**
 * 处理视口大小变化（键盘弹出/收起）
 */
function handleViewportResize() {
  const viewport = window.visualViewport
  const currentHeight = viewport.height

  // 键盘弹出（视口高度减少）
  if (currentHeight < originalViewportHeight - 100) {
    document.documentElement.style.setProperty('--keyboard-open', '1')
    document.documentElement.style.setProperty('--keyboard-height', `${originalViewportHeight - currentHeight}px`)

    // 确保输入框可见
    scrollToFocusedInput()
  } else {
    // 键盘收起
    document.documentElement.style.setProperty('--keyboard-open', '0')
    document.documentElement.style.setProperty('--keyboard-height', '0px')
  }
}

/**
 * 处理视口滚动
 */
function handleViewportScroll() {
  // iOS Safari 修复：键盘弹出时保持滚动位置
  if (document.activeElement && isInputElement(document.activeElement)) {
    scrollToFocusedInput()
  }
}

/**
 * 滚动到聚焦的输入框
 */
function scrollToFocusedInput() {
  const activeElement = document.activeElement
  if (!activeElement || !isInputElement(activeElement)) return

  setTimeout(() => {
    activeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    })
  }, 100)
}

/**
 * 检查是否为输入元素
 */
function isInputElement(element) {
  const tagName = element.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || element.isContentEditable
}

/**
 * 防止键盘遮挡的样式
 */
export function getKeyboardAwareStyles() {
  return {
    paddingBottom: 'calc(1rem + var(--keyboard-height, 0px))'
  }
}
