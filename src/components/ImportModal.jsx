import { useState } from 'react'
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react'
import { importFromFormat, detectImportFormat, getSupportedFormats } from '../utils/importFormats'

export default function ImportModal({ isOpen, onClose, onImport }) {
  const [importText, setImportText] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('auto')
  const [previewTokens, setPreviewTokens] = useState([])
  const [error, setError] = useState('')
  const [step, setStep] = useState('input') // input, preview, success

  const supportedFormats = getSupportedFormats()

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImportText(event.target.result)
      setError('')
    }
    reader.readAsText(file)
  }

  const handleParse = async () => {
    try {
      setError('')

      if (!importText.trim()) {
        setError('请输入或上传导入数据')
        return
      }

      // 检测格式
      const format = selectedFormat === 'auto'
        ? detectImportFormat(importText)
        : selectedFormat

      console.log('检测到的格式:', format)

      if (format === 'unknown' || format === 'unknown-json') {
        setError('无法识别的导入格式，请选择具体格式或检查数据是否正确')
        return
      }

      // 解析数据
      const tokens = importFromFormat(importText, format)

      if (!tokens || tokens.length === 0) {
        setError('未能解析出任何账号，请检查数据格式')
        return
      }

      setPreviewTokens(tokens)
      setStep('preview')
    } catch (err) {
      console.error('解析失败:', err)
      setError(err.message || '解析失败，请检查数据格式')
    }
  }

  const handleConfirmImport = () => {
    onImport(previewTokens)
    setStep('success')
    setTimeout(() => {
      handleClose()
    }, 1500)
  }

  const handleClose = () => {
    setImportText('')
    setSelectedFormat('auto')
    setPreviewTokens([])
    setError('')
    setStep('input')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1F2421] rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-muted hover:text-ink rounded-full hover:bg-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-serif text-ink dark:text-[#F7F4EF] mb-2">
            批量导入账号
          </h2>
          <p className="text-sm text-muted">
            支持从其他验证器应用导入数据
          </p>
        </div>

        {/* Step: Input */}
        {step === 'input' && (
          <>
            {/* Format Selector */}
            <div className="mb-4">
              <label className="block text-sm text-muted mb-2">导入格式</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full px-4 py-2.5 border border-border dark:border-[#3A3D3B] rounded-xl focus:outline-none focus:border-terracotta transition-colors bg-white dark:bg-[#2A2D2B] text-ink dark:text-[#F7F4EF]"
              >
                <option value="auto">🔍 自动检测</option>
                <option value="uri">📝 otpauth:// URI</option>
                <option value="2fas">🔐 2FAS</option>
                <option value="microsoft-auth">🔵 Microsoft Authenticator</option>
                <option value="authy">🔴 Authy</option>
                <option value="google-auth">🟢 Google Authenticator</option>
                <option value="totp-hub">🏠 Token Vault 备份</option>
              </select>
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm text-muted mb-2">上传文件</label>
              <div className="relative">
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border dark:border-[#3A3D3B] rounded-xl cursor-pointer hover:border-terracotta transition-colors"
                >
                  <Upload className="w-5 h-5 text-muted" />
                  <span className="text-sm text-muted">点击上传 JSON 或 TXT 文件</span>
                </label>
              </div>
            </div>

            {/* Text Input */}
            <div className="mb-4">
              <label className="block text-sm text-muted mb-2">或粘贴文本</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="粘贴导出的 JSON 或 URI 列表..."
                className="w-full px-4 py-3 border border-border dark:border-[#3A3D3B] rounded-xl focus:outline-none focus:border-terracotta transition-colors font-mono text-xs resize-none bg-white dark:bg-[#2A2D2B] text-ink dark:text-[#F7F4EF]"
                rows="10"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Format Info */}
            <div className="mb-6 p-4 bg-surface dark:bg-[#2A2D2B] rounded-xl">
              <h3 className="text-sm font-medium text-ink dark:text-[#F7F4EF] mb-2">
                💡 支持的格式
              </h3>
              <ul className="space-y-1 text-xs text-muted">
                {supportedFormats.map(format => (
                  <li key={format.id}>
                    <strong>{format.name}</strong>: {format.description}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-border dark:border-[#3A3D3B] text-muted hover:bg-surface dark:hover:bg-[#2A2D2B] rounded-full transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleParse}
                disabled={!importText.trim()}
                className="flex-1 px-4 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                解析数据
              </button>
            </div>
          </>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <>
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600 dark:text-green-400">
                成功解析 {previewTokens.length} 个账号
              </p>
            </div>

            <div className="mb-6 max-h-[400px] overflow-y-auto">
              <h3 className="text-sm font-medium text-ink dark:text-[#F7F4EF] mb-3">
                预览账号列表
              </h3>
              <div className="space-y-2">
                {previewTokens.map((token, index) => (
                  <div
                    key={index}
                    className="p-3 bg-surface dark:bg-[#2A2D2B] rounded-xl border border-border dark:border-[#3A3D3B]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-[#F7F4EF] truncate">
                          {token.issuer}
                        </p>
                        <p className="text-xs text-muted truncate">
                          {token.account}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="px-2 py-0.5 bg-white dark:bg-[#1F2421] rounded-full">
                          {token.digits} 位
                        </span>
                        <span className="px-2 py-0.5 bg-white dark:bg-[#1F2421] rounded-full">
                          {token.period}s
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 px-4 py-2.5 border border-border dark:border-[#3A3D3B] text-muted hover:bg-surface dark:hover:bg-[#2A2D2B] rounded-full transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 px-4 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-medium"
              >
                确认导入
              </button>
            </div>
          </>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-medium text-ink dark:text-[#F7F4EF] mb-2">
              导入成功！
            </h3>
            <p className="text-sm text-muted">
              已成功导入 {previewTokens.length} 个账号
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
