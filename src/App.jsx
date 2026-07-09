import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Plus, Shield, Search, Menu, X, Sun, Moon, Lock, LockOpen, Download, Upload, Settings, Keyboard, CheckSquare } from 'lucide-react'
import * as OTPAuth from 'otpauth'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import TokenCard from './components/TokenCard'
import SortableTokenCard from './components/SortableTokenCard'

// 懒加载模态框组件
const AddTokenModal = lazy(() => import('./components/AddTokenModal'))
const BackupModal = lazy(() => import('./components/BackupModal'))
const MasterPasswordModal = lazy(() => import('./components/MasterPasswordModal'))
const SettingsModal = lazy(() => import('./components/SettingsModal'))
const SessionTimeoutWarning = lazy(() => import('./components/SessionTimeoutWarning'))
const KeyboardShortcutsHelp = lazy(() => import('./components/KeyboardShortcutsHelp'))
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'))
const BatchActionsBar = lazy(() => import('./components/BatchActionsBar'))

import Toast from './components/Toast'
import { categories } from './utils/services'
import { useSessionTimeout } from './utils/sessionTimeout'
import { useKeyboardShortcuts } from './utils/keyboardShortcuts'
import { registerServiceWorker } from './utils/pwa'
import { useToast } from './utils/toast'
import { vibrate } from './utils/mobile'
import {
  hasMasterPassword,
  hasEncryptedData,
  encryptTokens,
  decryptTokens,
  removeMasterPassword
} from './utils/encryption'

function App() {
  const [tokens, setTokens] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)
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

  const searchInputRef = useRef(null)
  const toast = useToast()

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
      setTokens(tokens.filter(t => !selectedTokens.includes(t.id)))
      setSelectedTokens([])
      setSelectionMode(false)
      toast.success(`✓ 已删除 ${selectedTokens.length} 个账号`, 2000)
      vibrate([20]) // 批量删除振动
    }
  }

  const handleBatchMove = (categoryId) => {
    if (selectedTokens.length === 0) return

    setTokens(tokens.map(t =>
      selectedTokens.includes(t.id)
        ? { ...t, category: categoryId }
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

  // 下拉刷新手势
  let touchStartY = 0
  let touchCurrentY = 0

  const handleTouchStart = (e) => {
    if (window.scrollY === 0 && !isLocked) {
      touchStartY = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e) => {
    if (touchStartY === 0 || isLocked) return

    touchCurrentY = e.touches[0].clientY
    const diff = touchCurrentY - touchStartY

    if (diff > 100 && !refreshing) {
      handleRefresh()
      touchStartY = 0
    }
  }

  const handleTouchEnd = () => {
    touchStartY = 0
    touchCurrentY = 0
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
  }, [])

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
  const handleUnlock = (password) => {
    try {
      const decrypted = decryptTokens(password)
      if (decrypted) {
        setTokens(decrypted)
        setCurrentPassword(password)
        setIsLocked(false)
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
    if (isLocked) return // Don't save when locked

    if (hasMasterPassword() && currentPassword) {
      // Save encrypted
      encryptTokens(tokens, currentPassword)
    } else {
      // Save unencrypted (legacy)
      localStorage.setItem('totp-tokens', JSON.stringify(tokens))
    }
  }, [tokens, isLocked, currentPassword])

  // Update time every second for TOTP refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const addToken = (tokenData) => {
    const newToken = {
      id: Date.now().toString(),
      ...tokenData,
      createdAt: Date.now()
    }
    setTokens([...tokens, newToken])
    setIsAddModalOpen(false)
    toast.success('✓ 账号添加成功', 2000)
  }

  const deleteToken = (id) => {
    setTokens(tokens.filter(t => t.id !== id))
    toast.success('✓ 账号已删除', 2000)
    vibrate([15]) // 删除振动
  }

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('✓ 验证码已复制', 2000)
      vibrate([10]) // 短振动反馈
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

  const handleImportBackup = (importedTokens) => {
    setTokens(importedTokens)
    setIsBackupModalOpen(false)
  }

  // Handle setting up master password
  const handleSetupMasterPassword = (password) => {
    // Encrypt all current tokens
    encryptTokens(tokens, password)
    setCurrentPassword(password)
    alert('主密码设置成功！您的数据已加密保护。')
  }

  // Handle removing master password
  const handleRemoveMasterPassword = () => {
    // Decrypt and save as plain text
    if (currentPassword) {
      const decrypted = decryptTokens(currentPassword)
      if (decrypted) {
        setTokens(decrypted)
        localStorage.setItem('totp-tokens', JSON.stringify(decrypted))
      }
    }
    removeMasterPassword()
    setCurrentPassword(null)
    alert('主密码已移除，数据已解密为明文存储。')
  }

  // Manual lock function
  const handleLock = () => {
    if (hasMasterPassword()) {
      setIsLocked(true)
      setTokens([])
      setCurrentPassword(null)
      setMasterPasswordModal({
        mode: 'verify',
        onSuccess: handleUnlock
      })
    }
  }

  // Filter tokens
  const filteredTokens = tokens.filter(token => {
    const matchesSearch =
      token.issuer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.account?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || token.category === selectedCategory
    return matchesSearch && matchesCategory
  })

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
                TOTP Hub
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 text-muted hover:text-ink dark:text-surface dark:hover:text-white transition-colors"
                title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Menu Button (Mobile) */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="sm:hidden p-2 text-muted hover:text-ink dark:text-surface transition-colors"
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
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-full transition-colors font-light text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">添加账号</span>
                <span className="xs:hidden">添加</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMenu && (
            <div className="sm:hidden mt-4 pb-2 border-t border-border pt-4 space-y-2">
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
                  setIsShortcutsHelpOpen(true)
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-muted hover:text-terracotta hover:bg-terracotta-tint rounded-lg transition-colors"
              >
                <Keyboard className="w-5 h-5" />
                <span>快捷键</span>
              </button>
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

      {/* Modals */}
      {/* Modals with Lazy Loading */}
      <Suspense fallback={null}>
        {isAddModalOpen && (
          <AddTokenModal
            onClose={() => setIsAddModalOpen(false)}
            onAdd={addToken}
          />
        )}

        {isBackupModalOpen && (
          <BackupModal
            tokens={tokens}
            onClose={() => setIsBackupModalOpen(false)}
            onImport={handleImportBackup}
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
