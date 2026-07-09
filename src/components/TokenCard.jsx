import { useState, useEffect, memo } from 'react'
import { Copy, Trash2, CheckCircle, Check } from 'lucide-react'
import * as OTPAuth from 'otpauth'
import { getServiceIcon, getCategoryById } from '../utils/services'
import { HighlightText } from './HighlightText'

const TokenCard = memo(function TokenCard({ token, currentTime, onCopy, onDelete, selectionMode, isSelected, onToggleSelect, searchQuery }) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    try {
      // Parse TOTP URI or create from token data
      let totp
      if (token.uri) {
        totp = OTPAuth.URI.parse(token.uri)
      } else {
        totp = new OTPAuth.TOTP({
          issuer: token.issuer,
          label: token.account,
          algorithm: token.algorithm || 'SHA1',
          digits: token.digits || 6,
          period: token.period || 30,
          secret: token.secret
        })
      }

      const newCode = totp.generate()
      setCode(newCode)

      // Calculate time left in current period
      const period = token.period || 30
      const elapsed = Math.floor(currentTime / 1000) % period
      setTimeLeft(period - elapsed)
    } catch (e) {
      console.error('Failed to generate code:', e)
      setCode('ERROR')
    }
  }, [currentTime, token])

  const handleCopy = async () => {
    await onCopy(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const progress = (timeLeft / (token.period || 30)) * 100
  const serviceIcon = getServiceIcon(token.issuer)
  const category = getCategoryById(token.category)

  return (
    <div
      className={`bg-white dark:bg-surface rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-all ${
        selectionMode
          ? isSelected
            ? 'border-terracotta bg-terracotta/5 dark:bg-terracotta/10'
            : 'border-border hover:border-terracotta/50'
          : 'border-border hover:shadow-lg'
      }`}
      onClick={selectionMode ? () => onToggleSelect(token.id) : undefined}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute top-3 right-3 z-10">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-terracotta border-terracotta'
              : 'bg-white dark:bg-surface border-border'
          }`}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-2xl">{serviceIcon}</span>
            <span className="text-xs px-2 py-0.5 sm:py-1 bg-terracotta-tint text-terracotta rounded-full font-light truncate">
              <HighlightText text={token.issuer || '未命名'} highlight={searchQuery} />
            </span>
            {token.category && (
              <span className="text-xs px-2 py-0.5 sm:py-1 bg-border text-muted rounded-full font-light">
                {category.icon} {category.name}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-normal text-ink dark:text-surface truncate">
            <HighlightText text={token.account} highlight={searchQuery} />
          </h3>
        </div>
        {!selectionMode && (
          <button
            onClick={() => onDelete(token.id)}
            className="text-muted hover:text-terracotta transition-colors p-1 flex-shrink-0"
            title="删除"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>

      {/* Code Display */}
      <div className="mb-3 sm:mb-4">
        <div className="text-3xl sm:text-4xl font-mono font-light text-ink tracking-wider text-center py-3 sm:py-4">
          {code.slice(0, 3)} {code.slice(3)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3 sm:mb-4">
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              timeLeft <= 5 ? 'bg-red-500' : 'bg-terracotta'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-muted text-center mt-1">{timeLeft}秒后刷新</div>
      </div>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-terracotta-tint hover:bg-terracotta/10 text-terracotta rounded-full transition-colors font-light text-sm sm:text-base"
      >
        {copied ? (
          <>
            <CheckCircle className="w-4 h-4" />
            已复制
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            复制验证码
          </>
        )}
      </button>
    </div>
  )
}, (prevProps, nextProps) => {
  // 自定义比较函数：仅在这些属性变化时重新渲染
  return (
    prevProps.token.id === nextProps.token.id &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.token.issuer === nextProps.token.issuer &&
    prevProps.token.account === nextProps.token.account &&
    prevProps.token.category === nextProps.token.category
  )
})

export default TokenCard
