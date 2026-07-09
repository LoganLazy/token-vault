import { X, Keyboard } from 'lucide-react'
import { KEYBOARD_SHORTCUTS, formatShortcut } from '../utils/keyboardShortcuts'

export default function KeyboardShortcutsHelp({ onClose }) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted hover:text-ink dark:text-muted dark:hover:text-surface transition-colors"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
            <Keyboard className="w-5 h-5 text-terracotta" />
          </div>
          <h2 className="text-xl sm:text-2xl font-light text-ink dark:text-surface">键盘快捷键</h2>
        </div>

        {/* Shortcuts */}
        <div className="space-y-6">
          {KEYBOARD_SHORTCUTS.map((category, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-medium text-muted mb-3">{category.category}</h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between p-3 bg-surface dark:bg-ink/50 rounded-lg"
                  >
                    <span className="text-sm text-ink dark:text-surface">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {(isMac && shortcut.mac ? shortcut.mac : shortcut.keys).map((key, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 text-xs font-mono bg-white dark:bg-surface border border-border rounded shadow-sm text-ink dark:text-surface min-w-[28px] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 p-3 bg-terracotta-tint dark:bg-terracotta/20 rounded-lg">
          <p className="text-xs text-muted">
            💡 <strong>提示</strong>: 按 <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-surface border border-border rounded">?</kbd> 可随时打开此帮助窗口
          </p>
        </div>
      </div>
    </div>
  )
}
