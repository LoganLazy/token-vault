import { useState } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { api } from '../utils/api'

export default function AuthModal({ onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const result = await api.login(email, password)
        onAuthSuccess?.(result.user)
      } else {
        const result = await api.register(email, password, name, inviteCode || undefined)
        onAuthSuccess?.(result.user)
      }
      onClose()
    } catch (err) {
      setError(err.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBF9F5] dark:bg-[#2A2825] rounded-2xl max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-[#E7E1D7] dark:border-[#3A3835]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif text-[#1F2421] dark:text-[#F7F4EF]">
              {mode === 'login' ? '登录账户' : '注册账户'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#E7E1D7] dark:hover:bg-[#3A3835] rounded-lg transition-colors"
            >
              <X size={20} className="text-[#5C635D] dark:text-[#B5B8B6]" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Name (Register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-[#5C635D] dark:text-[#B5B8B6] mb-2">
                <User size={16} className="inline mr-2" />
                姓名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-[#1F2421] border border-[#E7E1D7] dark:border-[#3A3835] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4612F] text-[#1F2421] dark:text-[#F7F4EF]"
                placeholder="输入您的姓名"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#5C635D] dark:text-[#B5B8B6] mb-2">
              <Mail size={16} className="inline mr-2" />
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white dark:bg-[#1F2421] border border-[#E7E1D7] dark:border-[#3A3835] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4612F] text-[#1F2421] dark:text-[#F7F4EF]"
              placeholder="your@email.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#5C635D] dark:text-[#B5B8B6] mb-2">
              <Lock size={16} className="inline mr-2" />
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 12 : undefined}
                className="w-full px-4 py-3 bg-white dark:bg-[#1F2421] border border-[#E7E1D7] dark:border-[#3A3835] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4612F] text-[#1F2421] dark:text-[#F7F4EF] pr-12"
                placeholder={mode === 'register' ? '至少 12 位字符' : '输入密码'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5C635D] dark:text-[#B5B8B6] hover:text-[#1F2421] dark:hover:text-[#F7F4EF]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {mode === 'register' && (
              <p className="text-xs text-[#5C635D] dark:text-[#B5B8B6] mt-1">
                密码必须至少包含 12 个字符
              </p>
            )}
          </div>

          {/* Invite Code (Register only; registration is closed by default) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-[#5C635D] dark:text-[#B5B8B6] mb-2">
                邀请码
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-[#1F2421] border border-[#E7E1D7] dark:border-[#3A3835] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4612F] text-[#1F2421] dark:text-[#F7F4EF]"
                placeholder="管理员提供的邀请码"
              />
              <p className="text-xs text-[#5C635D] dark:text-[#B5B8B6] mt-1">
                注册默认关闭，请向管理员索取邀请码。
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C4612F] hover:bg-[#A94E22] text-white py-3 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              '处理中...'
            ) : mode === 'login' ? (
              <>
                <LogIn size={20} />
                登录
              </>
            ) : (
              <>
                <UserPlus size={20} />
                注册
              </>
            )}
          </button>

          {/* Switch Mode */}
          <div className="text-center pt-4 border-t border-[#E7E1D7] dark:border-[#3A3835]">
            <button
              type="button"
              onClick={switchMode}
              className="text-sm text-[#C4612F] hover:underline"
            >
              {mode === 'login' ? '还没有账户？立即注册' : '已有账户？立即登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
