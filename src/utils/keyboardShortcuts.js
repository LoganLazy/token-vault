import { useEffect } from 'react'

/**
 * 全局快捷键 Hook
 * @param {Object} shortcuts - 快捷键映射 { 'Ctrl+K': callback, 'Escape': callback }
 * @param {boolean} enabled - 是否启用快捷键
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event) => {
      // 如果在输入框中，只处理 Escape
      const isInput = ['INPUT', 'TEXTAREA'].includes(event.target.tagName)

      // 构建快捷键字符串
      const modifiers = []
      if (event.ctrlKey || event.metaKey) modifiers.push('Ctrl')
      if (event.altKey) modifiers.push('Alt')
      if (event.shiftKey) modifiers.push('Shift')

      let key = event.key
      if (key === ' ') key = 'Space'
      if (key.length === 1) key = key.toUpperCase()

      const shortcut = modifiers.length > 0
        ? `${modifiers.join('+')}+${key}`
        : key

      // 查找匹配的快捷键
      const handler = shortcuts[shortcut]

      if (handler) {
        // 在输入框中只允许 Escape
        if (isInput && shortcut !== 'Escape') {
          return
        }

        event.preventDefault()
        handler(event)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}

/**
 * 快捷键帮助数据
 */
export const KEYBOARD_SHORTCUTS = [
  {
    category: '常规',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: '聚焦搜索框', mac: ['⌘', 'K'] },
      { keys: ['Ctrl', 'N'], description: '添加新账号', mac: ['⌘', 'N'] },
      { keys: ['Ctrl', 'B'], description: '打开备份窗口', mac: ['⌘', 'B'] },
      { keys: ['Ctrl', ','], description: '打开设置', mac: ['⌘', ','] },
      { keys: ['Ctrl', 'A'], description: '批量操作模式', mac: ['⌘', 'A'] },
      { keys: ['Escape'], description: '关闭弹窗/取消选择', mac: ['Esc'] }
    ]
  },
  {
    category: '安全',
    shortcuts: [
      { keys: ['Ctrl', 'L'], description: '锁定应用', mac: ['⌘', 'L'] },
      { keys: ['Ctrl', 'Shift', 'L'], description: '强制锁定', mac: ['⌘', '⇧', 'L'] }
    ]
  },
  {
    category: '导航',
    shortcuts: [
      { keys: ['1-7'], description: '切换分类', mac: ['1-7'] },
      { keys: ['Ctrl', 'D'], description: '切换暗色模式', mac: ['⌘', 'D'] }
    ]
  },
  {
    category: '快速操作',
    shortcuts: [
      { keys: ['Ctrl', '1-9'], description: '复制第 N 个验证码', mac: ['⌘', '1-9'] },
      { keys: ['Ctrl', 'Shift', 'C'], description: '复制第一个验证码', mac: ['⌘', '⇧', 'C'] }
    ]
  }
]

/**
 * 格式化快捷键显示
 */
export function formatShortcut(keys, isMac = false) {
  const mapped = keys.map(key => {
    if (isMac) {
      const macMap = {
        'Ctrl': '⌘',
        'Alt': '⌥',
        'Shift': '⇧',
        'Escape': 'Esc',
        'Space': '␣'
      }
      return macMap[key] || key
    }
    return key
  })
  return mapped.join(isMac ? '' : '+')
}
