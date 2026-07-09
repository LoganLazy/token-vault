import { useState, useEffect } from 'react'
import { X, Settings, Clock, Fingerprint, CheckCircle, XCircle } from 'lucide-react'
import { TIMEOUT_OPTIONS } from '../utils/sessionTimeout'
import { hasMasterPassword } from '../utils/encryption'
import {
  isPlatformAuthenticatorAvailable,
  isWebAuthnEnabled,
  registerCredential,
  deleteCredential,
  getDeviceTypeDescription
} from '../utils/webauthn'

export default function SettingsModal({ onClose, settings, onSave }) {
  const [timeoutMinutes, setTimeoutMinutes] = useState(settings.timeoutMinutes || 15)
  const [webauthnSupported, setWebauthnSupported] = useState(false)
  const [webauthnEnabled, setWebauthnEnabled] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  useEffect(() => {
    const checkWebAuthn = async () => {
      if (hasMasterPassword()) {
        const supported = await isPlatformAuthenticatorAvailable()
        setWebauthnSupported(supported)
        setWebauthnEnabled(isWebAuthnEnabled())
      }
    }
    checkWebAuthn()
  }, [])

  const handleToggleBiometric = async () => {
    if (webauthnEnabled) {
      // 禁用生物识别
      const confirmed = window.confirm('确定要禁用生物识别解锁吗？')
      if (confirmed) {
        deleteCredential()
        setWebauthnEnabled(false)
      }
    } else {
      // 启用生物识别
      setBiometricLoading(true)
      try {
        await registerCredential()
        setWebauthnEnabled(true)
        alert('✅ 生物识别已启用！')
      } catch (err) {
        alert('❌ ' + err.message)
      } finally {
        setBiometricLoading(false)
      }
    }
  }

  const handleSave = () => {
    onSave({ timeoutMinutes })
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

          {/* 生物识别设置 */}
          {hasMasterPassword() && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Fingerprint className="w-5 h-5 text-terracotta" />
                <label className="text-sm font-medium text-ink dark:text-surface">
                  生物识别解锁
                </label>
              </div>
              <p className="text-xs text-muted mb-3">
                使用 {getDeviceTypeDescription()} 快速解锁应用
              </p>

              {webauthnSupported ? (
                <div className="space-y-3">
                  {/* 状态显示 */}
                  <div className="flex items-center justify-between p-3 bg-surface dark:bg-ink rounded-xl border border-border">
                    <div className="flex items-center gap-2">
                      {webauthnEnabled ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-ink dark:text-surface">已启用</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-muted" />
                          <span className="text-sm text-muted">未启用</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={handleToggleBiometric}
                      disabled={biometricLoading}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        webauthnEnabled
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-terracotta hover:bg-terracotta-hover text-white'
                      } disabled:opacity-50`}
                    >
                      {biometricLoading ? '处理中...' : webauthnEnabled ? '禁用' : '启用'}
                    </button>
                  </div>

                  {/* 提示信息 */}
                  <p className="text-xs text-muted">
                    💡 启用后，下次解锁时可使用生物识别，无需输入密码
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ 您的设备或浏览器不支持生物识别功能
                  </p>
                </div>
              )}
            </div>
          )}
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
