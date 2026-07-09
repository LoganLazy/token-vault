import { useState } from 'react'
import { X, Upload, Download, Shield, Lock } from 'lucide-react'
import { exportBackup, importBackup } from '../utils/encryption'

export default function BackupModal({ tokens, onClose, onImport }) {
  const [importPassword, setImportPassword] = useState('')
  const [exportPassword, setExportPassword] = useState('')
  const [useEncryption, setUseEncryption] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleExport = () => {
    try {
      const backup = exportBackup(tokens, useEncryption ? exportPassword : null)
      const blob = new Blob([backup], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `totp-hub-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSuccess('备份已导出')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = importBackup(event.target.result, importPassword || null)
        onImport(imported)
        setSuccess(`成功导入 ${imported.length} 个账号`)
        setTimeout(() => {
          onClose()
        }, 1500)
      } catch (err) {
        setError(err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
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
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-terracotta" />
          <h2 className="text-xl sm:text-2xl font-light text-ink">备份与恢复</h2>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            {success}
          </div>
        )}

        {/* Export Section */}
        <div className="mb-6 p-4 border border-border rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-5 h-5 text-terracotta" />
            <h3 className="font-normal text-ink">导出备份</h3>
          </div>
          <p className="text-sm text-muted mb-4">
            将所有账号导出为 JSON 文件
          </p>

          <div className="mb-3">
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
                className="rounded border-border"
              />
              <Lock className="w-4 h-4" />
              使用密码加密备份
            </label>
          </div>

          {useEncryption && (
            <input
              type="password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              placeholder="输入加密密码"
              className="w-full px-3 py-2 mb-3 text-sm border border-border rounded-lg focus:outline-none focus:border-terracotta"
            />
          )}

          <button
            onClick={handleExport}
            disabled={useEncryption && !exportPassword}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-terracotta hover:bg-terracotta-hover disabled:bg-muted disabled:cursor-not-allowed text-white rounded-full transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            导出备份
          </button>
        </div>

        {/* Import Section */}
        <div className="p-4 border border-border rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-5 h-5 text-terracotta" />
            <h3 className="font-normal text-ink">导入备份</h3>
          </div>
          <p className="text-sm text-muted mb-4">
            从 JSON 文件恢复账号（会覆盖现有数据）
          </p>

          <input
            type="password"
            value={importPassword}
            onChange={(e) => setImportPassword(e.target.value)}
            placeholder="如果备份已加密，请输入密码"
            className="w-full px-3 py-2 mb-3 text-sm border border-border rounded-lg focus:outline-none focus:border-terracotta"
          />

          <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-terracotta text-terracotta hover:bg-terracotta-tint rounded-full transition-colors cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            选择备份文件
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
