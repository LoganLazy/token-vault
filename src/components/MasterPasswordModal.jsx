import { useState } from 'react'
import { X, Lock, AlertCircle } from 'lucide-react'
import { setMasterPassword, verifyMasterPassword, hasMasterPassword, removeMasterPassword } from '../utils/encryption'

export default function MasterPasswordModal({ mode = 'setup', onClose, onSuccess }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (mode === 'setup') {
      if (password.length < 6) {
        setError('密码至少需要 6 位')
        return
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致')
        return
      }
      setMasterPassword(password)
      onSuccess?.()
      onClose()
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
    setup: '设置主密码以保护您的验证码数据',
    verify: '请输入主密码以继续',
    remove: '请输入当前密码以移除保护'
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted hover:text-ink transition-colors"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-6 h-6 text-terracotta" />
          <h2 className="text-xl sm:text-2xl font-light text-ink">{titles[mode]}</h2>
        </div>

        <p className="text-sm text-muted mb-6">{descriptions[mode]}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">
              {mode === 'setup' ? '密码' : '主密码'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'setup' ? '至少 6 位' : '输入密码'}
              className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors"
              required
              autoFocus
            />
          </div>

          {mode === 'setup' && (
            <div>
              <label className="block text-sm text-muted mb-1.5">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full px-6 py-3 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-light"
          >
            {mode === 'setup' ? '设置密码' : mode === 'verify' ? '解锁' : '移除密码'}
          </button>

          {mode === 'setup' && (
            <p className="text-xs text-muted text-center">
              ⚠️ 请牢记密码，忘记密码将无法恢复数据
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
