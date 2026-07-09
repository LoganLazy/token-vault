import { useState, useRef, useEffect } from 'react'
import { X, Camera, AlertCircle } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScannerModal({ onClose, onScan }) {
  const [error, setError] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)

  useEffect(() => {
    startScanner()
    return () => {
      stopScanner()
    }
  }, [])

  const startScanner = async () => {
    try {
      html5QrCodeRef.current = new Html5Qrcode('qr-reader')

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          stopScanner()
          onScan(decodedText)
        },
        (errorMessage) => {
          // 扫描失败的回调，正常现象，不需要显示
        }
      )
      setIsScanning(true)
    } catch (err) {
      setError('无法访问摄像头，请检查权限设置')
      console.error('Camera error:', err)
    }
  }

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch (err) {
        console.error('Stop scanner error:', err)
      }
    }
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted hover:text-ink transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-6 h-6 text-terracotta" />
          <h2 className="text-xl sm:text-2xl font-light text-ink">扫描二维码</h2>
        </div>

        {/* Scanner */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-muted text-center">{error}</p>
            <p className="text-sm text-muted text-center mt-2">
              请确保已授权摄像头访问权限
            </p>
          </div>
        ) : (
          <div className="relative">
            <div
              id="qr-reader"
              className="rounded-xl overflow-hidden"
            ></div>
            <p className="text-xs text-muted text-center mt-4">
              将二维码对准摄像头进行扫描
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
