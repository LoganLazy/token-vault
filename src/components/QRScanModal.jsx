import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Camera, Upload, AlertCircle } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

function parseOtpAuthUri(uri) {
  try {
    const url = new URL(uri)

    if (url.protocol !== 'otpauth:') {
      throw new Error('不是有效的 TOTP URI')
    }
    if (url.hostname !== 'totp') {
      throw new Error('仅支持 TOTP 类型')
    }

    const pathParts = url.pathname.slice(1).split(':')
    const issuer = url.searchParams.get('issuer') || pathParts[0] || ''
    const accountName = pathParts.length > 1 ? pathParts[1] : pathParts[0] || ''
    const secret = url.searchParams.get('secret')

    if (!secret) {
      throw new Error('缺少 secret 参数')
    }

    return {
      name: accountName || issuer,
      issuer,
      secret,
      algorithm: (url.searchParams.get('algorithm') || 'SHA1').toUpperCase(),
      digits: parseInt(url.searchParams.get('digits')) || 6,
      period: parseInt(url.searchParams.get('period')) || 30
    }
  } catch (error) {
    console.error('Parse error:', error)
    throw new Error('无法解析 QR 码: ' + error.message)
  }
}

export default function QRScanModal({ onClose, onScanSuccess }) {
  const [scanMode, setScanMode] = useState('camera') // 'camera' or 'upload'
  const [error, setError] = useState('')
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)
  const fileInputRef = useRef(null)

  // Stop camera scanning
  const stopCameraScanning = useCallback(async () => {
    const scanner = html5QrCodeRef.current
    html5QrCodeRef.current = null

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop()
        }
        scanner.clear()
      } catch (err) {
        console.error('Stop camera error:', err)
      }
    }
  }, [])

  // Handle scan success
  const handleScanSuccess = useCallback(async (decodedText) => {
    try {
      await stopCameraScanning()

      const tokenData = parseOtpAuthUri(decodedText)
      onScanSuccess(tokenData)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }, [onClose, onScanSuccess, stopCameraScanning])

  // Start camera scanning
  const startCameraScanning = useCallback(async () => {
    if (html5QrCodeRef.current) return

    try {
      setError('')

      const scanner = new Html5Qrcode('qr-reader')
      html5QrCodeRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        handleScanSuccess,
        () => {}
      )
    } catch (err) {
      html5QrCodeRef.current = null
      console.error('Camera error:', err)
      setError('无法访问摄像头，请检查权限设置')
    }
  }, [handleScanSuccess])

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setError('')

      const html5QrCode = new Html5Qrcode('qr-reader')
      html5QrCodeRef.current = html5QrCode

      const decodedText = await html5QrCode.scanFile(file, true)
      handleScanSuccess(decodedText)
    } catch (err) {
      console.error('File scan error:', err)
      setError('无法从图片中识别 QR 码，请尝试其他图片')
    }
  }

  // Start scanning when mode changes to camera
  useEffect(() => {
    if (scanMode === 'camera') {
      startCameraScanning()
    } else {
      stopCameraScanning()
    }

    return () => {
      stopCameraScanning()
    }
  }, [scanMode, startCameraScanning, stopCameraScanning])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-surface rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-medium text-ink dark:text-surface">扫描 QR 码</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-terracotta transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-6 border-b border-border">
          <div className="flex gap-3">
            <button
              onClick={() => setScanMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                scanMode === 'camera'
                  ? 'bg-terracotta text-white shadow-md'
                  : 'bg-[#F7F4EF] dark:bg-[#2A2825] text-muted hover:bg-terracotta-tint'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>相机扫描</span>
            </button>
            <button
              onClick={() => setScanMode('upload')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                scanMode === 'upload'
                  ? 'bg-terracotta text-white shadow-md'
                  : 'bg-[#F7F4EF] dark:bg-[#2A2825] text-muted hover:bg-terracotta-tint'
              }`}
            >
              <Upload className="w-5 h-5" />
              <span>上传图片</span>
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {scanMode === 'camera' ? (
            <div className="space-y-4">
              <div
                id="qr-reader"
                ref={scannerRef}
                className="rounded-xl overflow-hidden bg-[#1F2421] min-h-[300px]"
              />
              <p className="text-sm text-muted text-center">
                将 QR 码对准摄像头，系统会自动识别
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                id="qr-reader"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-terracotta hover:bg-terracotta-tint/30 transition-all"
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-muted" />
                <p className="text-muted mb-1">点击上传 QR 码图片</p>
                <p className="text-xs text-muted">支持 PNG、JPG、GIF 格式</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 p-4 bg-[#F2E3D6] dark:bg-[#2A2825] rounded-xl">
            <p className="text-sm text-muted">
              💡 <strong>提示:</strong> 大多数网站在启用两步验证时会显示 QR 码，使用相机扫描即可快速添加。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
