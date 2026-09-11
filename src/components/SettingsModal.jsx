import { useState } from 'react'
import { X, Settings, Clock, Globe } from 'lucide-react'
import { TIMEOUT_OPTIONS } from '../utils/sessionTimeout'

export default function SettingsModal({ onClose, settings, onSave }) {
  const [timeoutMinutes, setTimeoutMinutes] = useState(settings.timeoutMinutes || 15)
  const [autoTheme, setAutoTheme] = useState(settings.autoTheme || false)
  const handleSave = () => {
    onSave({ timeoutMinutes, autoTheme })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
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
            <Settings className="w-5 h-5 text-terracotta" />
          </div>
          <h2 className="text-xl sm:text-2xl font-light text-ink dark:text-surface">应用设置</h2>
        </div>

        {/* Settings */}
        <div className="space-y-6">
          {/* Session Timeout */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-terracotta" />
              <label className="text-sm font-medium text-ink dark:text-surface">
                会话超时时间
              </label>
            </div>
            <p className="text-xs text-muted mb-3">
              无操作自动锁定应用的时间。锁定前 30 秒会显示提醒。
            </p>
            <select
              value={timeoutMinutes}
              onChange={(e) => setTimeoutMinutes(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors dark:bg-ink dark:text-surface"
            >
              {TIMEOUT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {timeoutMinutes === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ 禁用自动锁定会降低安全性，仅建议在私人设备上使用
              </p>
            )}
          </div>

          {/* 暗色模式设置 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-terracotta" />
              <label className="text-sm font-medium text-ink dark:text-surface">
                暗色模式
              </label>
            </div>
            <p className="text-xs text-muted mb-3">
              跟随系统自动切换明暗主题
            </p>
            <label className="flex items-center justify-between p-3 bg-surface dark:bg-ink rounded-xl border border-border cursor-pointer hover:border-terracotta transition-colors">
              <span className="text-sm text-ink dark:text-surface">跟随系统</span>
              <input
                type="checkbox"
                checked={autoTheme}
                onChange={(e) => setAutoTheme(e.target.checked)}
                className="w-5 h-5 text-terracotta rounded focus:ring-terracotta"
              />
            </label>
            {!autoTheme && (
              <p className="text-xs text-muted mt-2">
                💡 关闭后可通过右上角按钮手动切换
              </p>
            )}
          </div>

        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full mt-6 px-6 py-3 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-light"
        >
          保存设置
        </button>
      </div>
    </div>
  )
}
