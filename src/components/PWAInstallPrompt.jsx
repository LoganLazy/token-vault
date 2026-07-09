import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // 阻止默认的安装提示
      e.preventDefault()
      // 保存事件以便稍后触发
      setDeferredPrompt(e)
      // 显示自定义安装提示
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 检查是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // 显示安装提示
    deferredPrompt.prompt()

    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)

    // 清除保存的事件
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // 记住用户的选择（24小时内不再显示）
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // 检查是否应该显示（24小时内被关闭过就不显示）
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const hoursSinceDismissed = (Date.now() - dismissedTime) / 1000 / 60 / 60
      if (hoursSinceDismissed < 24) {
        setShowPrompt(false)
      }
    }
  }, [])

  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-40 animate-slide-up">
      <div className="bg-white dark:bg-surface rounded-2xl shadow-2xl p-4 sm:p-5 border border-border">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted hover:text-ink dark:hover:text-surface transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-terracotta flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-base font-medium text-ink dark:text-surface mb-1">
              安装 TOTP Hub
            </h3>
            <p className="text-sm text-muted">
              安装到桌面，像原生应用一样使用。完全离线，更快更安全。
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 border border-border rounded-full text-sm text-muted hover:bg-surface dark:hover:bg-ink transition-colors"
          >
            稍后再说
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 bg-terracotta hover:bg-terracotta-hover text-white rounded-full text-sm transition-colors font-medium"
          >
            立即安装
          </button>
        </div>
      </div>
    </div>
  )
}
