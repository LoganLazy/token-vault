import { useState } from 'react'
import { X, Upload, Camera } from 'lucide-react'
import { categories } from '../utils/services'
import QRScanModal from './QRScanModal'

export default function AddTokenModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    issuer: '',
    account: '',
    secret: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    category: 'personal'
  })
  const [showScanner, setShowScanner] = useState(false)
  const [batchImportMode, setBatchImportMode] = useState(false)
  const [batchUris, setBatchUris] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.secret || !formData.account) {
      alert('请至少填写账号名称和密钥')
      return
    }
    onAdd(formData)
  }

  const handleImportUri = () => {
    const uri = prompt('请粘贴 TOTP URI (格式: otpauth://totp/...)')
    if (!uri) return

    parseUri(uri)
  }

  const handleBatchImport = () => {
    if (!batchUris.trim()) {
      alert('请粘贴至少一个 URI')
      return
    }

    const uris = batchUris.split('\n').filter(line => line.trim().startsWith('otpauth://'))

    if (uris.length === 0) {
      alert('未找到有效的 URI，请确保每行一个 otpauth:// 链接')
      return
    }

    let successCount = 0
    const failedUris = []

    uris.forEach(uri => {
      try {
        const tokenData = parseUriToData(uri.trim())
        if (tokenData && tokenData.secret) {
          onAdd(tokenData)
          successCount++
        } else {
          failedUris.push({ uri, reason: '缺少必要信息' })
        }
      } catch (e) {
        console.error('Failed to parse URI:', uri, e)
        failedUris.push({ uri, reason: e.message || '解析失败' })
      }
    })

    let message = `批量导入完成！\n成功: ${successCount} 个\n失败: ${failedUris.length} 个`

    if (failedUris.length > 0 && failedUris.length <= 5) {
      message += '\n\n失败的 URI:'
      failedUris.forEach(({ uri, reason }) => {
        const shortUri = uri.length > 50 ? uri.substring(0, 50) + '...' : uri
        message += `\n- ${shortUri}\n  (${reason})`
      })
    } else if (failedUris.length > 5) {
      message += `\n\n(失败的 URI 过多，已记录到控制台)`
      console.error('Failed URIs:', failedUris)
    }

    alert(message)

    if (successCount > 0) {
      onClose()
    }
  }

  const parseUriToData = (uri) => {
    const url = new URL(uri)
    const params = new URLSearchParams(url.search)
    const pathParts = url.pathname.split('/')
    const label = decodeURIComponent(pathParts[pathParts.length - 1])

    let issuer = params.get('issuer') || ''
    let account = label

    if (label.includes(':')) {
      const [labelIssuer, labelAccount] = label.split(':')
      issuer = issuer || labelIssuer
      account = labelAccount
    }

    return {
      issuer,
      account,
      secret: params.get('secret') || '',
      algorithm: params.get('algorithm') || 'SHA1',
      digits: parseInt(params.get('digits') || '6'),
      period: parseInt(params.get('period') || '30'),
      category: 'personal'
    }
  }

  const parseUri = (uri) => {
    try {
      const url = new URL(uri)
      const params = new URLSearchParams(url.search)
      const pathParts = url.pathname.split('/')
      const label = decodeURIComponent(pathParts[pathParts.length - 1])

      let issuer = params.get('issuer') || ''
      let account = label

      // Handle label format "Issuer:Account"
      if (label.includes(':')) {
        const [labelIssuer, labelAccount] = label.split(':')
        issuer = issuer || labelIssuer
        account = labelAccount
      }

      setFormData({
        issuer,
        account,
        secret: params.get('secret') || '',
        algorithm: params.get('algorithm') || 'SHA1',
        digits: parseInt(params.get('digits') || '6'),
        period: parseInt(params.get('period') || '30'),
        category: formData.category
      })
    } catch (e) {
      console.error('Invalid TOTP URI:', e)
      alert('无效的 TOTP URI 格式')
    }
  }

  const handleScanResult = (tokenData) => {
    setShowScanner(false)
    // QRScanModal already parsed the data
    setFormData({
      ...tokenData,
      category: formData.category
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted hover:text-ink transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Header */}
          <h2 className="text-xl sm:text-2xl font-light text-ink mb-4 sm:mb-6 pr-8">
            {batchImportMode ? '批量导入账号' : '添加两步验证账号'}
          </h2>

          {!batchImportMode ? (
            <>
              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4 sm:mb-6">
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 sm:py-3 border-2 border-border hover:border-terracotta text-muted hover:text-terracotta rounded-xl transition-colors font-light text-xs sm:text-sm"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                  扫码
                </button>
                <button
                  onClick={handleImportUri}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 sm:py-3 border-2 border-border hover:border-terracotta text-muted hover:text-terracotta rounded-xl transition-colors font-light text-xs sm:text-sm"
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  URI 导入
                </button>
                <button
                  onClick={() => setBatchImportMode(true)}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 sm:py-3 border-2 border-terracotta text-terracotta hover:bg-terracotta hover:text-white rounded-xl transition-colors font-light text-xs sm:text-sm"
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  批量导入
                </button>
              </div>

              <div className="text-center text-muted text-xs sm:text-sm mb-4 sm:mb-6">或手动填写</div>
            </>
          ) : (
            <>
              {/* Batch Import UI */}
              <div className="mb-4">
                <label className="block text-sm text-muted mb-2">
                  粘贴 URI 列表（每行一个 otpauth:// 链接）
                </label>
                <textarea
                  value={batchUris}
                  onChange={(e) => setBatchUris(e.target.value)}
                  placeholder="otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&#10;otpauth://totp/GitHub:username?secret=ABCDEFGHIJKLMNOP&issuer=GitHub&#10;..."
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors font-mono text-xs resize-none"
                  rows="10"
                />
                <p className="text-xs text-muted mt-2">
                  💡 支持从 Google Authenticator、Authy 等应用导出的 URI 列表
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBatchImportMode(false)
                    setBatchUris('')
                  }}
                  className="flex-1 px-4 py-2.5 border border-border text-muted hover:bg-surface rounded-full transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleBatchImport}
                  className="flex-1 px-4 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-medium"
                >
                  导入
                </button>
              </div>
            </>
          )}

          {!batchImportMode && (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm text-muted mb-1.5">分类</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors"
              >
                {categories.filter(c => c.id !== 'all').map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm text-muted mb-1.5">服务商 *</label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                placeholder="例如: GitHub, Google"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm text-muted mb-1.5">账号名称 *</label>
              <input
                type="text"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                placeholder="例如: user@example.com"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm text-muted mb-1.5">密钥 (Secret) *</label>
              <input
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value.replace(/\s/g, '') })}
                placeholder="例如: JBSWY3DPEHPK3PXP"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-border rounded-xl focus:outline-none focus:border-terracotta transition-colors font-mono"
                required
              />
            </div>

            {/* Advanced Options */}
            <details className="text-xs sm:text-sm">
              <summary className="cursor-pointer text-muted hover:text-ink mb-3">高级选项</summary>
              <div className="space-y-3 pl-2">
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">算法</label>
                    <select
                      value={formData.algorithm}
                      onChange={(e) => setFormData({ ...formData, algorithm: e.target.value })}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-border rounded-lg focus:outline-none focus:border-terracotta text-xs sm:text-sm"
                    >
                      <option value="SHA1">SHA1</option>
                      <option value="SHA256">SHA256</option>
                      <option value="SHA512">SHA512</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">位数</label>
                    <input
                      type="number"
                      value={formData.digits}
                      onChange={(e) => setFormData({ ...formData, digits: parseInt(e.target.value) })}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-border rounded-lg focus:outline-none focus:border-terracotta text-xs sm:text-sm"
                      min="6"
                      max="8"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">周期(秒)</label>
                    <input
                      type="number"
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: parseInt(e.target.value) })}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-border rounded-lg focus:outline-none focus:border-terracotta text-xs sm:text-sm"
                      min="15"
                      max="60"
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full px-6 py-2.5 sm:py-3 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-light mt-4 sm:mt-6 text-sm sm:text-base"
            >
              添加账号
            </button>
          </form>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanModal
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScanResult}
        />
      )}
    </>
  )
}
