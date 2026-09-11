import { useState } from 'react'
import { X, Save, Folder } from 'lucide-react'
import { getServiceIcon, categories } from '../utils/services'

export default function EditTokenModal({ token, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    issuer: token.issuer || '',
    account: token.account || '',
    category: token.category || 'personal',
    algorithm: token.algorithm || 'SHA1',
    digits: token.digits || 6,
    period: token.period || 30
  })

  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.issuer.trim()) {
      newErrors.issuer = '服务商名称不能为空'
    }

    if (!formData.account.trim()) {
      newErrors.account = '账号名称不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    // 保留原有的密钥和其他数据，只更新允许修改的字段
    onUpdate({
      ...token,
      issuer: formData.issuer.trim(),
      account: formData.account.trim(),
      category: formData.category,
      algorithm: formData.algorithm,
      digits: parseInt(formData.digits),
      period: parseInt(formData.period)
    })

    onClose()
  }

  const serviceIcon = getServiceIcon(formData.issuer)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-terracotta-tint flex items-center justify-center text-2xl">
              {serviceIcon}
            </div>
            <h2 className="text-xl font-light text-ink dark:text-surface">
              编辑账号
            </h2>
          </div>
          <button
            onClick={onClose}
            className="touch-target p-2 text-muted hover:text-ink dark:hover:text-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 服务商 */}
          <div>
            <label className="block text-sm font-medium text-ink dark:text-surface mb-2">
              服务商 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.issuer}
              onChange={(e) => handleChange('issuer', e.target.value)}
              placeholder="例如：Google、GitHub"
              className={`w-full px-4 py-3 bg-surface dark:bg-ink border rounded-xl focus:outline-none focus:border-terracotta transition-colors text-ink dark:text-surface ${
                errors.issuer ? 'border-red-500' : 'border-border'
              }`}
            />
            {errors.issuer && (
              <p className="mt-1 text-sm text-red-500">{errors.issuer}</p>
            )}
          </div>

          {/* 账号名称 */}
          <div>
            <label className="block text-sm font-medium text-ink dark:text-surface mb-2">
              账号名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.account}
              onChange={(e) => handleChange('account', e.target.value)}
              placeholder="例如：user@example.com"
              className={`w-full px-4 py-3 bg-surface dark:bg-ink border rounded-xl focus:outline-none focus:border-terracotta transition-colors text-ink dark:text-surface ${
                errors.account ? 'border-red-500' : 'border-border'
              }`}
            />
            {errors.account && (
              <p className="mt-1 text-sm text-red-500">{errors.account}</p>
            )}
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-ink dark:text-surface mb-2">
              <Folder className="w-4 h-4 inline mr-1" />
              分类
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-4 py-3 bg-surface dark:bg-ink border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors text-ink dark:text-surface"
            >
              {categories.filter(c => c.id !== 'all').map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 高级选项 */}
          <details className="border border-border rounded-xl">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-muted hover:text-ink dark:hover:text-surface transition-colors">
              高级选项（不建议修改）
            </summary>
            <div className="px-4 pb-4 space-y-4 border-t border-border mt-2 pt-4">
              {/* 算法 */}
              <div>
                <label className="block text-sm font-medium text-ink dark:text-surface mb-2">
                  算法
                </label>
                <select
                  value={formData.algorithm}
                  onChange={(e) => handleChange('algorithm', e.target.value)}
                  className="w-full px-4 py-2 bg-surface dark:bg-ink border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors text-ink dark:text-surface"
                >
                  <option value="SHA1">SHA1</option>
                  <option value="SHA256">SHA256</option>
                  <option value="SHA512">SHA512</option>
                </select>
              </div>

              {/* 位数 */}
              <div>
                <label className="block text-sm font-medium text-ink dark:text-surface mb-2">
                  验证码位数
                </label>
                <select
                  value={formData.digits}
                  onChange={(e) => handleChange('digits', e.target.value)}
                  className="w-full px-4 py-2 bg-surface dark:bg-ink border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors text-ink dark:text-surface"
                >
                  <option value="6">6 位</option>
                  <option value="7">7 位</option>
                  <option value="8">8 位</option>
                </select>
              </div>

              {/* 刷新周期 */}
              <div>
                <label className="block text-sm font-medium text-ink dark:text-surface mb-2">
                  刷新周期（秒）
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => handleChange('period', e.target.value)}
                  className="w-full px-4 py-2 bg-surface dark:bg-ink border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors text-ink dark:text-surface"
                >
                  <option value="15">15 秒</option>
                  <option value="30">30 秒</option>
                  <option value="60">60 秒</option>
                </select>
              </div>

              <div className="text-xs text-muted bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                ⚠️ 修改这些高级选项可能导致验证码无法使用，除非您确定服务商支持这些设置
              </div>
            </div>
          </details>

          {/* 提示信息 */}
          <div className="text-xs text-muted bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            💡 密钥无法修改，如需更换密钥请删除后重新添加
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border rounded-full text-muted hover:text-ink hover:border-ink dark:hover:text-surface dark:hover:border-surface transition-colors font-light"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-light"
            >
              <Save className="w-5 h-5" />
              保存修改
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
