import { useState, useEffect } from 'react'
import { Plus, Shield, Search, Menu, X, Sun, Moon, Lock, LockOpen, Download, Upload } from 'lucide-react'
import TokenCard from './components/TokenCard'
import AddTokenModal from './components/AddTokenModal'
import BackupModal from './components/BackupModal'
import MasterPasswordModal from './components/MasterPasswordModal'
import { categories } from './utils/services'
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
  const [masterPasswordModal, setMasterPasswordModal] = useState(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [darkMode, setDarkMode] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [currentPassword, setCurrentPassword] = useState(null)

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
  }

  const deleteToken = (id) => {
    setTokens(tokens.filter(t => t.id !== id))
  }

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch (e) {
      console.error('Failed to copy:', e)
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
    <div className="min-h-screen bg-cream dark:bg-ink transition-colors">
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
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="p-2 text-muted hover:text-terracotta transition-colors"
                  title="备份与恢复"
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索账号或服务商..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white dark:bg-surface border border-border rounded-full focus:outline-none focus:border-terracotta transition-colors text-ink dark:text-ink"
            />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTokens.map((token) => (
              <TokenCard
                key={token.id}
                token={token}
                currentTime={currentTime}
                onCopy={copyCode}
                onDelete={deleteToken}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
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

      {masterPasswordModal && (
        <MasterPasswordModal
          mode={masterPasswordModal.mode}
          onClose={() => setMasterPasswordModal(null)}
          onSuccess={masterPasswordModal.onSuccess}
        />
      )}
    </div>
  )
}

export default App
