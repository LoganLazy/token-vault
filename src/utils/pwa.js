/**
 * 注册 Service Worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    console.log('Service Worker registered:', registration.scope)

    // 检查更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      console.log('Service Worker update found')

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New Service Worker installed, page reload recommended')
          // 可以在这里显示更新提示
          showUpdateNotification()
        }
      })
    })

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

/**
 * 注销 Service Worker
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      const success = await registration.unregister()
      console.log('Service Worker unregistered:', success)
      return success
    }
    return false
  } catch (error) {
    console.error('Service Worker unregistration failed:', error)
    return false
  }
}

/**
 * 检查 Service Worker 更新
 */
export async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.update()
      return true
    }
    return false
  } catch (error) {
    console.error('Service Worker update check failed:', error)
    return false
  }
}

/**
 * 清除所有缓存
 */
export async function clearAllCaches() {
  if (!('caches' in window)) {
    return false
  }

  try {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    )
    console.log('All caches cleared')
    return true
  } catch (error) {
    console.error('Cache clearing failed:', error)
    return false
  }
}

/**
 * 显示更新通知
 */
function showUpdateNotification() {
  // 创建一个自定义事件
  const event = new CustomEvent('sw-update-available', {
    detail: {
      message: '有新版本可用，刷新页面以更新'
    }
  })
  window.dispatchEvent(event)
}

/**
 * 检查是否在 PWA 模式下运行
 */
export function isRunningAsPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * 获取 PWA 安装状态
 */
export function getPWAInstallStatus() {
  return {
    isInstallable: 'BeforeInstallPromptEvent' in window,
    isInstalled: isRunningAsPWA(),
    isServiceWorkerSupported: 'serviceWorker' in navigator,
    isOfflineReady: navigator.onLine === false && isRunningAsPWA()
  }
}
