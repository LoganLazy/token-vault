import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { Plus, Shield, Search, Menu, X, Sun, Moon, Lock, LockOpen, Download, Upload, Settings, Keyboard, CheckSquare, BarChart3, User } from 'lucide-react'
import * as OTPAuth from 'otpauth'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import SortableTokenCard from './components/SortableTokenCard'

// 懒加载模态框组件
const AddTokenModal = lazy(() => import('./components/AddTokenModal'))
const EditTokenModal = lazy(() => import('./components/EditTokenModal'))
const BackupModal = lazy(() => import('./components/BackupModal'))
const MasterPasswordModal = lazy(() => import('./components/MasterPasswordModal'))
const SettingsModal = lazy(() => import('./components/SettingsModal'))
const SessionTimeoutWarning = lazy(() => import('./components/SessionTimeoutWarning'))
const KeyboardShortcutsHelp = lazy(() => import('./components/KeyboardShortcutsHelp'))
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'))
const BatchActionsBar = lazy(() => import('./components/BatchActionsBar'))
const StatsModal = lazy(() => import('./components/StatsModal'))
const AuthModal = lazy(() => import('./components/AuthModal'))
const ImportModal = lazy(() => import('./components/ImportModal'))

import Toast from './components/Toast'
import { categories } from './utils/services'
import { useSessionTimeout } from './utils/sessionTimeout'
import { useKeyboardShortcuts } from './utils/keyboardShortcuts'
import { registerServiceWorker } from './utils/pwa'
import { useToast } from './utils/toast'
import { vibrate } from './utils/mobile'
import { clearTokenStats, recordCopy } from './utils/stats'
import { useTranslation } from './utils/i18n'
import { filterTokensByPinyin } from './utils/pinyinSearch'
import {
  hasMasterPassword,
  hasEncryptedData,
  encryptTokens,
  decryptTokens,
  removeMasterPassword
} from './utils/encryption'
import { api } from './utils/api'
import { syncManager } from './utils/sync'

function App() {
  const [tokens, setTokens] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingToken, setEditingToken] = useState(null)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [masterPasswordModal, setMasterPasswordModal] = useState(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [darkMode, setDarkMode] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [currentPassword, setCurrentPassword] = useState(null)
  const [settings, setSettings] = useState({
    timeoutMinutes: 15
  })
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedTokens, setSelectedTokens] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // 后端认证状态
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [backendSyncEnabled, setBackendSyncEnabled] = useState(false)
  const [syncReady, setSyncReady] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const searchInputRef = useRef(null)
  const toast = useToast()
  const showToastError = toast.error
  const { t } = useTranslation()

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动 8px 后才开始拖拽，避免误触
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 长按 200ms 后开始拖拽
        tolerance: 5,
      },
    })
  )

  // 会话超时
  const {
    showWarning: showTimeoutWarning,
    remainingSeconds,
    resetActivity,
    setTimeoutEnabled
  } = useSessionTimeout(
    () => {
      // 超时回调 - 自动锁定
      if (hasMasterPassword() && !isLocked) {
        handleLock()
      }
    },
    settings.timeoutMinutes
  )

  // 加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('totp-hub-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(parsed)
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }, [])

  // 注册 PWA Service Worker
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker()
    }

    // 监听 Service Worker 更新
    const handleSWUpdate = (event) => {
      console.log('Service Worker update available:', event.detail)
      // 可以在这里显示更新提示
    }

    window.addEventListener('sw-update-available', handleSWUpdate)

    return () => {
      window.removeEventListener('sw-update-available', handleSWUpdate)
    }
  }, [])

  // 保存设置
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings)
    localStorage.setItem('totp-hub-settings', JSON.stringify(newSettings))
    // 更新超时设置
    setTimeoutEnabled(newSettings.timeoutMinutes > 0)
  }

  // 快捷键配置
  useKeyboardShortcuts({
    'Ctrl+K': () => {
      searchInputRef.current?.focus()
    },
    'Ctrl+N': () => {
      if (!isLocked) setIsAddModalOpen(true)
    },
    'Ctrl+B': () => {
      if (!isLocked) setIsBackupModalOpen(true)
    },
    'Ctrl+I': () => {
      if (!isLocked) setIsImportModalOpen(true)
    },
    'Ctrl+,': () => {
      if (!isLocked) setIsSettingsModalOpen(true)
    },
    'Ctrl+L': () => {
      if (hasMasterPassword() && !isLocked) handleLock()
    },
    'Ctrl+D': () => {
      toggleDarkMode()
    },
    'Ctrl+A': () => {
      if (!isLocked && tokens.length > 0) toggleSelectionMode()
    },
    'Escape': () => {
      if (isAddModalOpen) setIsAddModalOpen(false)
      if (isBackupModalOpen) setIsBackupModalOpen(false)
      if (isImportModalOpen) setIsImportModalOpen(false)
      if (isSettingsModalOpen) setIsSettingsModalOpen(false)
      if (isShortcutsHelpOpen) setIsShortcutsHelpOpen(false)
      if (selectionMode) cancelSelection()
    },
    '?': () => {
      setIsShortcutsHelpOpen(true)
    },
    // 数字键切换分类
    '1': () => setSelectedCategory('all'),
    '2': () => setSelectedCategory('work'),
    '3': () => setSelectedCategory('personal'),
    '4': () => setSelectedCategory('finance'),
    '5': () => setSelectedCategory('social'),
    '6': () => setSelectedCategory('dev'),
    '7': () => setSelectedCategory('other'),
    // Ctrl+数字快速复制
    'Ctrl+1': () => copyTokenByIndex(0),
    'Ctrl+2': () => copyTokenByIndex(1),
    'Ctrl+3': () => copyTokenByIndex(2),
    'Ctrl+4': () => copyTokenByIndex(3),
    'Ctrl+5': () => copyTokenByIndex(4),
    'Ctrl+6': () => copyTokenByIndex(5),
    'Ctrl+7': () => copyTokenByIndex(6),
    'Ctrl+8': () => copyTokenByIndex(7),
    'Ctrl+9': () => copyTokenByIndex(8)
  }, !isLocked)

  // 快速复制第 N 个验证码
  const copyTokenByIndex = (index) => {
    if (filteredTokens[index]) {
      const token = filteredTokens[index]
      const totp = new OTPAuth.TOTP({
        secret: token.secret,
        algorithm: token.algorithm || 'SHA1',
        digits: token.digits || 6,
        period: token.period || 30
      })
      const code = totp.generate()
      copyCode(code)
    }
  }

  // 处理拖拽结束
  const handleDragEnd = (event) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setTokens((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      return arrayMove(items, oldIndex, newIndex)
    })
  }

  // 批量操作相关函数
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    setSelectedTokens([])
  }

  const toggleTokenSelection = (tokenId) => {
    setSelectedTokens(prev =>
      prev.includes(tokenId)
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    )
  }

  const handleBatchDelete = () => {
    if (selectedTokens.length === 0) return

    const confirmed = window.confirm(`确定要删除 ${selectedTokens.length} 个账号吗？此操作无法撤销。`)
    if (confirmed) {
      const tokenIdsToDelete = [...selectedTokens]
      // 清理统计数据
      tokenIdsToDelete.forEach(id => clearTokenStats(id))
      setTokens(tokens.filter(t => !tokenIdsToDelete.includes(t.id)))
      if (backendSyncEnabled && syncReady) {
        const cloudTokens = tokens.filter(token => tokenIdsToDelete.includes(token.id))
        Promise.all(cloudTokens.map(token => syncManager.deleteToken(token))).catch(error => {
          console.error('Failed to delete cloud tokens:', error)
          toast.error('本地删除成功，云端删除将在下次操作时重试')
        })
      }
      setSelectedTokens([])
      setSelectionMode(false)
      toast.success(`✓ 已删除 ${tokenIdsToDelete.length} 个账号`, 2000)
      vibrate([20]) // 批量删除振动
    }
  }

  const handleBatchMove = (categoryId) => {
    if (selectedTokens.length === 0) return

    setTokens(tokens.map(t =>
      selectedTokens.includes(t.id)
        ? { ...t, category: categoryId, updatedAt: Date.now() }
        : t
    ))
    const categoryName = categories.find(c => c.id === categoryId)?.name
    toast.success(`✓ 已移动 ${selectedTokens.length} 个账号到 ${categoryName}`, 2000)
    setSelectedTokens([])
    setSelectionMode(false)
  }

  const cancelSelection = () => {
    setSelectionMode(false)
    setSelectedTokens([])
  }

  // 下拉刷新
  const handleRefresh = () => {
    setRefreshing(true)
    vibrate([15])

    // 强制重新生成所有验证码
    setCurrentTime(Date.now())

    setTimeout(() => {
      setRefreshing(false)
      toast.success('✓ 已刷新', 1500)
    }, 800)
  }

  // 下拉刷新手势 - 使用 useRef 管理状态
  const touchStartYRef = useRef(0)
  const touchCurrentYRef = useRef(0)

  const handleTouchStart = (e) => {
    if (window.scrollY === 0 && !isLocked) {
      touchStartYRef.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e) => {
    if (touchStartYRef.current === 0 || isLocked) return

    touchCurrentYRef.current = e.touches[0].clientY
    const diff = touchCurrentYRef.current - touchStartYRef.current

    if (diff > 100 && !refreshing) {
      handleRefresh()
      touchStartYRef.current = 0
    }
  }

  const handleTouchEnd = () => {
    touchStartYRef.current = 0
    touchCurrentYRef.current = 0
  }

  // Check if app needs to be unlocked on startup
  useEffect(() => {
    const needsUnlock = hasMasterPassword() && hasEncryptedData()

    if (needsUnlock) {
      setIsLocked(true)
      setMasterPasswordModal({
        mode: 'verify',
        onSuccess: handleUnlock
      })
    } else {
      // Load tokens from localStorage (legacy unencrypted data)
      loadUnencryptedTokens()
    }

    // Load dark mode preference
    const darkModeSaved = localStorage.getItem('dark-mode')
    if (darkModeSaved === 'true') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }

    // 初始化后端同步
    initBackendSync(needsUnlock)
    setIsInitialized(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 初始化后端同步
  // v1.5.0: 同步是端到端加密的，只有主密码已设置并解锁（内存中有
  // syncPassword）时才能加载云端数据。锁定启动时不加载，等解锁后
  // handleUnlock 再加载；无主密码时提示用户先设置主密码。
  const initBackendSync = async (lockedOnStart = false) => {
    if (api.isAuthenticated()) {
      try {
        const userData = await api.getCurrentUser()
        setCurrentUser(userData.user)

        const syncEnabled = syncManager.initSync()
        setBackendSyncEnabled(syncEnabled)
        if (syncEnabled && !lockedOnStart) {
          if (!syncManager.hasSyncPassword()) {
            toast.error('同步需要主密码：请先设置并解锁主密码，云端数据用主密码端到端加密', 5000)
            return
          }
          try {
            // 从后端加载令牌
            const backendTokens = await syncManager.loadFromBackend()
            if (backendTokens) {
              const saved = localStorage.getItem('totp-tokens')
              const localTokens = saved ? JSON.parse(saved) : []
              setTokens(mergeTokens(localTokens, backendTokens))
              toast.success('✓ 已从云端加载数据', 2000)
            }
            if (backendTokens) setSyncReady(true)
          } catch (error) {
            console.error('Failed to load from backend:', error)
            toast.error(`云端加载失败：${error.message || '请稍后重试'}，本地数据未受影响`, 5000)
          }
        }
      } catch (error) {
        console.error('Failed to init backend sync:', error)
      }
    }
  }

  // 处理登录成功
  const handleAuthSuccess = async (user) => {
    setCurrentUser(user)
    // v1.5.0: 无主密码时拒绝启用同步（不静默同步明文），提示用户先
    // 在设置里创建主密码，创建后 handleSetupMasterPassword 会启用同步。
    try {
      syncManager.enableSync()
    } catch (error) {
      toast.error(`${error.message}：请先在设置中创建主密码`, 5000)
      setBackendSyncEnabled(false)
      setSyncReady(false)
      toast.success(`✓ 欢迎，${user.name}！`, 2000)
      return
    }

    // 从后端加载令牌
    try {
      const backendTokens = await syncManager.loadFromBackend()
      if (backendTokens) {
        // 合并本地和云端数据
        const localTokens = tokens
        const merged = mergeTokens(localTokens, backendTokens)
        setTokens(merged)
        toast.success(`✓ 欢迎回来，${user.name}！已加载 ${backendTokens.length} 个账号`, 3000)
      } else {
        toast.success(`✓ 欢迎，${user.name}！`, 2000)
      }
      setBackendSyncEnabled(true)
      setSyncReady(Boolean(backendTokens))
    } catch (error) {
      console.error('Failed to load from backend:', error)
      toast.error(`云端加载失败：${error.message || '请稍后重试'}，本地数据未受影响`, 5000)
      setBackendSyncEnabled(true)
      setSyncReady(false)
    }
  }

  // 处理登出
  const handleLogout = async () => {
    const confirmed = window.confirm('确定要退出登录吗？本地数据将保留。')
    if (confirmed) {
      await api.logout()
      setCurrentUser(null)
      setBackendSyncEnabled(false)
      setSyncReady(false)
      syncManager.disableSync()
      toast.success('✓ 已退出登录', 2000)
    }
  }

  // 合并本地和云端令牌（去重）
  const mergeTokens = (localTokens, backendTokens) => {
    const map = new Map()

    // 先添加后端令牌
    backendTokens.forEach(t => {
      map.set(syncManager.tokenKey(t), t)
    })

    // 再添加本地令牌（如果不存在）
    localTokens.forEach(t => {
      const key = syncManager.tokenKey(t)
      const backendToken = map.get(key)
      if (!backendToken || Number(t.updatedAt || 0) > Number(backendToken.updatedAt || 0)) {
        map.set(key, backendToken ? { ...t, backendId: backendToken.backendId } : t)
      }
    })

    return Array.from(map.values())
  }

  // Load unencrypted tokens (legacy or no master password)
  const loadUnencryptedTokens = () => {
    const saved = localStorage.getItem('totp-tokens')
    if (saved) {
      try {
        setTokens(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load tokens:', e)
      }
    }
  }

  // Handle unlock with master password
  const handleUnlock = async (password) => {
    try {
      const decrypted = await decryptTokens(password)
      if (decrypted) {
        setTokens(decrypted)
        setCurrentPassword(password)
        // v1.5.0: 主密码只放内存，作为同步的端到端加密密钥。
        syncManager.setSyncPassword(password)
        setIsLocked(false)
        if (syncManager.initSync()) {
          try {
            const backendTokens = await syncManager.loadFromBackend()
            if (backendTokens) setTokens(mergeTokens(decrypted, backendTokens))
            setBackendSyncEnabled(true)
            setSyncReady(Boolean(backendTokens))
          } catch (error) {
            console.error('Failed to load from backend:', error)
            toast.error(`云端加载失败：${error.message || '请稍后重试'}，本地数据未受影响`, 5000)
            setBackendSyncEnabled(true)
            setSyncReady(false)
          }
        }
      }
    } catch (e) {
      alert('解锁失败: ' + e.message)
      // Show unlock modal again
      setMasterPasswordModal({
        mode: 'verify',
        onSuccess: handleUnlock
      })
    }
  }

  // Save tokens (encrypted or unencrypted based on master password)
  useEffect(() => {
    if (!isInitialized || isLocked) return

    if (hasMasterPassword() && currentPassword) {
      // Save encrypted
      encryptTokens(tokens, currentPassword).catch(error => {
        console.error('Failed to save encrypted vault:', error)
        showToastError('加密保存失败，请立即导出备份')
      })
    } else {
      // Save unencrypted (legacy)
      localStorage.setItem('totp-tokens', JSON.stringify(tokens))
    }

    // 同步到后端（v1.5.0：失败会返回 { ok:false, error }，必须提示用户，
    // 不能静默丢弃）
    if (backendSyncEnabled && syncReady) {
      const timer = window.setTimeout(async () => {
        const result = await syncManager.syncToBackend(tokens)
        if (result && !result.ok) {
          console.error('Background sync failed:', result.error)
          showToastError(`同步失败：${result.error}，本地数据已保留`)
        }
      }, 500)
      return () => window.clearTimeout(timer)
    }
  }, [tokens, isInitialized, isLocked, currentPassword, backendSyncEnabled, syncReady, showToastError])

  // Update time every second for TOTP refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const addToken = (tokenData) => {
    const now = Date.now()
    const newToken = {
      id: now.toString(),
      ...tokenData,
      createdAt: now,
      updatedAt: now
    }
    setTokens([...tokens, newToken])
    setIsAddModalOpen(false)
    toast.success('✓ 账号添加成功', 2000)

  }

  // 批量导入账号
  const handleImportTokens = (importedTokens) => {
    if (!importedTokens || importedTokens.length === 0) {
      toast.error('没有要导入的账号', 2000)
      return
    }

    // 添加 ID 和时间戳
    const newTokens = importedTokens.map(token => {
      const createdAt = token.createdAt || Date.now()
      return {
        ...token,
        id: token.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt,
        updatedAt: token.updatedAt || createdAt
      }
    })

    setTokens([...tokens, ...newTokens])
    setIsImportModalOpen(false)
    toast.success(`✓ 成功导入 ${newTokens.length} 个账号`, 2000)
    vibrate([10, 50, 10]) // 成功振动

  }

  const deleteToken = (id) => {
    const tokenToDelete = tokens.find(token => token.id === id)
    setTokens(tokens.filter(t => t.id !== id))
    // 清理对应的统计数据
    clearTokenStats(id)
    toast.success('✓ 账号已删除', 2000)
    vibrate([15]) // 删除振动

    // 从后端删除
    if (backendSyncEnabled) {
      syncManager.deleteToken(tokenToDelete || id).catch(err => {
        console.error('Failed to delete token from backend:', err)
      })
    }
  }

  // 编辑账号
  const handleEditToken = (token) => {
    setEditingToken(token)
    setIsEditModalOpen(true)
  }

  // 更新账号
  const handleUpdateToken = (updatedToken) => {
    const nextToken = { ...updatedToken, updatedAt: Date.now() }
    setTokens(tokens.map(t => t.id === nextToken.id ? nextToken : t))
    setIsEditModalOpen(false)
    setEditingToken(null)
    toast.success('✓ 账号已更新', 2000)

  }

  const copyCode = async (code, tokenId) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('✓ 验证码已复制', 2000)
      vibrate([10]) // 短振动反馈

      // 记录统计
      if (tokenId) {
        recordCopy(tokenId)
      }
    } catch (e) {
      console.error('Failed to copy:', e)
      toast.error('复制失败，请重试')
      vibrate([50, 50, 50]) // 错误振动
    }
  }

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('dark-mode', newMode.toString())
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    if (!settings.autoTheme) return undefined

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applySystemTheme = (matches) => {
      setDarkMode(matches)
      document.documentElement.classList.toggle('dark', matches)
    }
    const handleChange = event => applySystemTheme(event.matches)

    applySystemTheme(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [settings.autoTheme])

  const handleImportBackup = (importedTokens) => {
    setTokens(importedTokens)
    setIsBackupModalOpen(false)
  }

  // Handle setting up master password
  const handleSetupMasterPassword = async (password) => {
    // Encrypt all current tokens
    await encryptTokens(tokens, password)
    setCurrentPassword(password)
    // v1.5.0: 主密码同时是同步的端到端加密密钥（仅放内存）。如果已
    // 登录同步账号，现在就可以启用同步并把本地数据加密上传。
    syncManager.setSyncPassword(password)
    if (api.isAuthenticated()) {
      try {
        syncManager.enableSync()
        setBackendSyncEnabled(true)
        const backendTokens = await syncManager.loadFromBackend()
        if (backendTokens) {
          setTokens(mergeTokens(tokens, backendTokens))
          setSyncReady(true)
        } else {
          setSyncReady(true)
        }
      } catch (error) {
        console.error('Failed to enable sync:', error)
        toast.error(`同步启用失败：${error.message || '请稍后重试'}`, 5000)
      }
    }
    alert('主密码设置成功！您的数据已加密保护。')
  }

  // Handle removing master password
  const handleRemoveMasterPassword = async (verifiedPassword) => {
    try {
      const password = verifiedPassword || currentPassword
      if (!password) {
        throw new Error('无法获取当前密码')
      }

      const decrypted = await decryptTokens(password)
      if (!decrypted) {
        throw new Error('解密失败，无法获取数据')
      }

      // Persist the plaintext copy before removing the only encrypted copy.
      localStorage.setItem('totp-tokens', JSON.stringify(decrypted))
      removeMasterPassword()
      setCurrentPassword(null)
      // v1.5.0: 没有主密码就不能同步（同步需要主密码做端到端加密）。
      syncManager.disableSync()
      setBackendSyncEnabled(false)
      setSyncReady(false)
      setTokens(decrypted)

      toast.success('✓ 主密码已移除，数据已解密', 2000)
    } catch (error) {
      console.error('Remove master password failed:', error)
      toast.error(`移除失败: ${error.message}`)
    }
  }

  // Manual lock function
  const handleLock = () => {
    if (hasMasterPassword()) {
      setIsLocked(true)
      setTokens([])
      setCurrentPassword(null)
      // v1.5.0: 锁定即丢弃内存中的同步密钥，下次解锁时重新输入主密码。
      syncManager.clearSyncPassword()
      setMasterPasswordModal({
        mode: 'verify',
        onSuccess: handleUnlock
      })
    }
  }

  // Filter tokens
  const filteredTokens = useMemo(() => {
    const searchMatches = filterTokensByPinyin(tokens, searchQuery.trim())
    return searchMatches.filter(token => (
      selectedCategory === 'all' || token.category === selectedCategory
    ))
  }, [tokens, searchQuery, selectedCategory])

  return (
    <div
      className="min-h-screen bg-cream dark:bg-ink transition-colors"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      {refreshing && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-terracotta text-white px-4 py-2 rounded-full text-sm shadow-lg animate-slide-down">
          🔄 正在刷新...
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-surface/80 dark:bg-ink/80 border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-terracotta flex items-center justify-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-2xl font-light text-ink dark:text-surface tracking-tight">
                {t('app.name')}
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-1.5 sm:p-2 text-muted hover:text-ink dark:text-surface dark:hover:text-white transition-colors"
                title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Menu Button (Mobile) */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="sm:hidden p-1.5 text-muted hover:text-ink dark:text-surface transition-colors"
              >
                {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Desktop Actions */}
              <div className="hidden sm:flex items-center gap-2">
                {tokens.length > 0 && !isLocked && (
                  <button
                    onClick={toggleSelectionMode}
                    className={`p-2 transition-colors ${
                      selectionMode
                        ? 'text-terracotta'
                        : 'text-muted hover:text-terracotta'
                    }`}
                    title="批量操作 (Ctrl+A)"
                  >
                    <CheckSquare className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsShortcutsHelpOpen(true)}
                  className="p-2 text-muted hover:text-terracotta transition-colors"
                  title="快捷键 (?)"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsStatsModalOpen(true)}
                  className="p-2 text-muted hover:text-terracotta transition-colors"
                  title="使用统计"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2 text-muted hover:text-terracotta transition-colors"
                  title="设置 (Ctrl+,)"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="p-2 text-muted hover:text-terracotta transition-colors"
                  title="备份与恢复 (Ctrl+B)"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="p-2 text-muted hover:text-terracotta transition-colors"
                  title="批量导入 (Ctrl+I)"
                >
                  <Upload className="w-5 h-5" />
                </button>
                {hasMasterPassword() ? (
                  <>
                    <button
                      onClick={handleLock}
                      className="p-2 text-muted hover:text-terracotta transition-colors"
                      title="锁定应用"
                    >
                      <Lock className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setMasterPasswordModal({
                        mode: 'remove',
                        onSuccess: handleRemoveMasterPassword
                      })}
                      className="p-2 text-muted hover:text-terracotta transition-colors"
                      title="移除主密码"
                    >
                      <LockOpen className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setMasterPasswordModal({
                      mode: 'setup',
                      onSuccess: handleSetupMasterPassword
                    })}
                    className="p-2 text-muted hover:text-terracotta transition-colors"
                    title="设置主密码"
                  >
                    <Lock className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Add Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center justify-center gap-2 w-9 h-9 sm:w-auto sm:h-auto sm:px-6 sm:py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-light text-base"
                title="添加账号"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">添加账号</span>
              </button>

              {/* Login/User Button */}
              {currentUser ? (
                <div className="hidden sm:block relative group">
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-[#F2E3D6] dark:bg-[#3A3835] rounded-full hover:bg-[#E7E1D7] dark:hover:bg-[#4A4845] transition-colors"
                  >
                    <User className="w-4 h-4 text-terracotta" />
                    <span className="text-sm text-muted hidden sm:inline">{currentUser.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2A2825] rounded-lg shadow-lg border border-[#E7E1D7] dark:border-[#3A3835] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="p-3 border-b border-[#E7E1D7] dark:border-[#3A3835]">
                      <p className="text-sm font-medium text-[#1F2421] dark:text-[#F7F4EF]">{currentUser.name}</p>
                      <p className="text-xs text-muted truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#F2E3D6] dark:bg-[#3A3835] rounded-full hover:bg-terracotta hover:text-white transition-colors text-sm"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">登录</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {showMenu && (
            <div className="sm:hidden mt-4 pb-2 border-t border-border pt-4 space-y-2">
              <button
                onClick={() => {
                  if (currentUser) {
                    handleLogout()
                  } else {
                    setIsAuthModalOpen(true)
                  }
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
              >
                <User className="w-5 h-5" />
                <span>{currentUser ? '退出登录' : '登录或注册'}</span>
              </button>
              {tokens.length > 0 && !isLocked && (
                <button
                  onClick={() => {
                    toggleSelectionMode()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
                >
                  <CheckSquare className="w-5 h-5" />
                  <span>批量操作</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsSettingsModalOpen(true)
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>设置</span>
              </button>
              <button
                onClick={() => {
                  setIsBackupModalOpen(true)
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>备份与恢复</span>
              </button>
              <button
                onClick={() => {
                  setIsImportModalOpen(true)
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>批量导入</span>
              </button>
              <button
                onClick={() => {
                  setIsShortcutsHelpOpen(true)
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
              >
                <Keyboard className="w-5 h-5" />
                <span>快捷键</span>
              </button>
              <a
                href="/privacy.html"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
              >
                <Shield className="w-5 h-5" />
                <span>隐私政策</span>
              </a>
              {hasMasterPassword() ? (
                <>
                  <button
                    onClick={() => {
                      handleLock()
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
                  >
                    <Lock className="w-5 h-5" />
                    <span>锁定应用</span>
                  </button>
                  <button
                    onClick={() => {
                      setMasterPasswordModal({
                        mode: 'remove',
                        onSuccess: handleRemoveMasterPassword
                      })
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
                  >
                    <LockOpen className="w-5 h-5" />
                    <span>移除主密码</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMasterPasswordModal({
                      mode: 'setup',
                      onSuccess: handleSetupMasterPassword
                    })
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
                >
                  <Lock className="w-5 h-5" />
                  <span>设置主密码</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Search and Filter */}
      {tokens.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索账号或服务商..."
              className="w-full pl-10 pr-24 py-2.5 sm:py-3 bg-white dark:bg-surface border border-border rounded-full focus:outline-none focus:border-terracotta transition-colors text-ink dark:text-surface"
            />
            {searchQuery && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs text-muted">
                  {filteredTokens.length} / {tokens.length}
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted hover:text-terracotta transition-colors"
                  title="清除搜索"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-colors text-sm ${
                  selectedCategory === cat.id
                    ? 'bg-terracotta text-white'
                    : 'bg-white dark:bg-surface text-muted hover:bg-terracotta-tint border border-border'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {filteredTokens.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-terracotta-tint flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-terracotta" />
            </div>
            <h2 className="text-lg sm:text-xl text-muted mb-2">
              {tokens.length === 0 ? '还没有添加任何账号' : '没有找到匹配的账号'}
            </h2>
            <p className="text-sm sm:text-base text-muted mb-6">
              {tokens.length === 0 ? '点击右上角按钮添加您的第一个两步验证账号' : '试试其他搜索关键词或分类'}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredTokens.map(t => t.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredTokens.map((token) => (
                  <SortableTokenCard
                    key={token.id}
                    token={token}
                    currentTime={currentTime}
                    onCopy={copyCode}
                    onDelete={deleteToken}
                    onEdit={handleEditToken}
                    selectionMode={selectionMode}
                    isSelected={selectedTokens.includes(token.id)}
                    onToggleSelect={toggleTokenSelection}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-muted">
        <a href="/privacy.html" className="hover:text-terracotta transition-colors">
          隐私政策
        </a>
        <span className="mx-2" aria-hidden="true">·</span>
        <span>Token Vault v1.4.1</span>
      </footer>

      {/* Modals */}
      {/* Modals with Lazy Loading */}
      <Suspense fallback={null}>
        {isAddModalOpen && (
          <AddTokenModal
            onClose={() => setIsAddModalOpen(false)}
            onAdd={addToken}
          />
        )}

        {isEditModalOpen && (
          <EditTokenModal
            token={editingToken}
            onClose={() => {
              setIsEditModalOpen(false)
              setEditingToken(null)
            }}
            onUpdate={handleUpdateToken}
          />
        )}

        {isBackupModalOpen && (
          <BackupModal
            tokens={tokens}
            onClose={() => setIsBackupModalOpen(false)}
            onImport={handleImportBackup}
          />
        )}

        {isImportModalOpen && (
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImportTokens}
          />
        )}

        {isSettingsModalOpen && (
          <SettingsModal
            onClose={() => setIsSettingsModalOpen(false)}
            settings={settings}
            onSave={handleSaveSettings}
          />
        )}

        {masterPasswordModal && (
          <MasterPasswordModal
            mode={masterPasswordModal.mode}
            onClose={() => setMasterPasswordModal(null)}
            onSuccess={masterPasswordModal.onSuccess}
          />
        )}

        {isShortcutsHelpOpen && (
          <KeyboardShortcutsHelp onClose={() => setIsShortcutsHelpOpen(false)} />
        )}

        {/* Stats Modal */}
        {isStatsModalOpen && (
          <StatsModal
            tokens={tokens}
            onClose={() => setIsStatsModalOpen(false)}
          />
        )}

        {/* Auth Modal */}
        {isAuthModalOpen && (
          <AuthModal
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {/* Session Timeout Warning */}
        {showTimeoutWarning && !isLocked && (
          <SessionTimeoutWarning
            remainingSeconds={remainingSeconds}
            onExtend={resetActivity}
          />
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* Batch Actions Bar */}
        {selectionMode && selectedTokens.length > 0 && (
          <BatchActionsBar
            selectedCount={selectedTokens.length}
            onDelete={handleBatchDelete}
            onMove={handleBatchMove}
            onCancel={cancelSelection}
            categories={categories}
          />
        )}
      </Suspense>

      {/* Toast Notifications */}
      {toast.toasts.map(t => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          duration={t.duration}
          onClose={() => toast.removeToast(t.id)}
        />
      ))}
    </div>
  )
}

export default App
