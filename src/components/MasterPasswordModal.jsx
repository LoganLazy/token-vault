import { useState, useEffect } from 'react'
import { X, Lock, AlertCircle, Eye, EyeOff, Fingerprint } from 'lucide-react'
import { setMasterPassword, verifyMasterPassword, removeMasterPassword, validatePasswordStrength } from '../utils/encryption'
import {
  isWebAuthnAvailable,
  isPlatformAuthenticatorAvailable,
  authenticateCredential,
  registerCredential,
  isWebAuthnEnabled,
  getDeviceTypeDescription
} from '../utils/webauthn'

export default function MasterPasswordModal({ mode = 'setup', onClose, onSuccess }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [strengthMessage, setStrengthMessage] = useState('')
  const [webauthnAvailable, setWebauthnAvailable] = useState(false)
  const [useBiometric, setUseBiometric] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  // 检测 WebAuthn 支持
  useEffect(() => {
    const checkWebAuthn = async () => {
      if (mode === 'verify' && isWebAuthnEnabled()) {
        const available = await isPlatformAuthenticatorAvailable()
        setWebauthnAvailable(available)
        // 如果可用，默认显示生物识别
        if (available) {
          setUseBiometric(true)
        }
      }
    }
    checkWebAuthn()
  }, [mode])

  // 处理生物识别验证
  const handleBiometricAuth = async () => {
    setBiometricLoading(true)
    setError(null)

    try {
      await authenticateCredential()
      // 验证成功
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message)
      setBiometricLoading(false)
    }
  }

  const handlePasswordChange = (value) => {
    setPassword(value)
    setError(null)

    if (mode === 'setup' && value) {
      const validation = validatePasswordStrength(value)
      setStrengthMessage(validation.valid ? '✓ 密码强度符合要求' : validation.message)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (mode === 'setup') {
      const validation = validatePasswordStrength(password)
      if (!validation.valid) {
        setError(validation.message)
        return
      }

      if (password !== confirmPassword) {
        setError('两次输入的密码不一致')
        return
      }

      try {
        setMasterPassword(password)
        onSuccess?.(password)
        onClose()

        // 提示设置生物识别
        setTimeout(async () => {
          const available = await isPlatformAuthenticatorAvailable()
          if (available && isWebAuthnAvailable()) {
            const enableBio = window.confirm(
              `检测到您的设备支持 ${getDeviceTypeDescription()}。\n\n是否启用生物识别快速解锁？`
            )
            if (enableBio) {
              try {
                await registerCredential()
                alert('✅ 生物识别已启用！下次解锁时可使用生物识别。')
              } catch (err) {
                console.error('生物识别注册失败:', err)
              }
            }
          }
        }, 500)
      } catch (err) {
        setError(err.message)
      }
    } else if (mode === 'verify') {
      if (!verifyMasterPassword(password)) {
        setError('密码错误')
        return
      }
      onSuccess?.(password)
      onClose()
    } else if (mode === 'remove') {
      if (!verifyMasterPassword(password)) {
        setError('密码错误')
        return
      }
      removeMasterPassword()
      onSuccess?.()
      onClose()
    }
  }

  const titles = {
    setup: '设置主密码',
    verify: '输入主密码',
    remove: '移除主密码'
  }

  const descriptions = {
    setup: '设置主密码以加密保护您的所有验证码数据',
    verify: '请输入主密码以解锁应用',
    remove: '请输入当前密码以移除保护并解密数据'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted hover:text-ink dark:text-muted dark:hover:text-surface transition-colors"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-terracotta" />
          </div>
          <h2 className="text-xl sm:text-2xl font-light text-ink dark:text-surface">{titles[mode]}</h2>
        </div>

        <p className="text-sm text-muted mb-6">{descriptions[mode]}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        {/* 生物识别选项 (仅验证模式) */}
        {mode === 'verify' && webauthnAvailable && (
          <div className="mb-6">
            {useBiometric ? (
              <>
                {/* 生物识别按钮 */}
                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  disabled={biometricLoading}
                  className="w-full py-4 bg-gradient-to-r from-terracotta to-terracotta-hover text-white rounded-2xl transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-medium"
                >
                  {biometricLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      验证中...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-6 h-6" />
                      使用 {getDeviceTypeDescription()} 解锁
                    </>
                  )}
                </button>

                {/* 切换到密码 */}
                <button
                  type="button"
                  onClick={() => setUseBiometric(false)}
                  className="w-full mt-3 text-sm text-muted hover:text-terracotta transition-colors"
                >
                  使用密码解锁
                </button>

                <div className="mt-4 text-center text-xs text-muted">
                  或使用下方密码输入框
                </div>
              </>
            ) : (
              <>
                {/* 切换到生物识别 */}
                <button
                  type="button"
                  onClick={() => setUseBiometric(true)}
                  className="w-full py-3 border-2 border-terracotta text-terracotta rounded-xl transition-colors hover:bg-terracotta hover:text-white flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-5 h-5" />
                  切换到生物识别
                </button>
              </>
            )}

            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">或</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">
              {mode === 'setup' ? '密码' : '主密码'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder={mode === 'setup' ? '至少 8 位，包含大小写字母和数字' : '输入密码'}
                className="w-full px-4 py-2.5 pr-10 border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors dark:bg-ink dark:text-surface"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:hover:text-surface transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === 'setup' && password && (
              <p className={`text-xs mt-1.5 ${strengthMessage.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-muted'}`}>
                {strengthMessage}
              </p>
            )}
          </div>

          {mode === 'setup' && (
            <div>
              <label className="block text-sm text-muted mb-1.5">确认密码</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors dark:bg-ink dark:text-surface"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full px-6 py-3 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-light"
          >
            {mode === 'setup' ? '设置密码并加密数据' : mode === 'verify' ? '解锁' : '移除密码并解密数据'}
          </button>

          {mode === 'setup' && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-400">
                ⚠️ <strong>重要提示</strong>
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 mt-2 space-y-1 ml-4 list-disc">
                <li>请牢记密码，忘记后将<strong>无法恢复</strong>数据</li>
                <li>设置后所有数据将被<strong>加密存储</strong></li>
                <li>每次打开应用需要输入密码解锁</li>
                <li>建议定期导出加密备份</li>
              </ul>
            </div>
          )}

          {mode === 'remove' && (
            <p className="text-xs text-muted text-center mt-2">
              移除主密码后，数据将以明文形式存储在浏览器中
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
