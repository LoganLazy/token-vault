import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import TokenCard from './TokenCard'
import ContextMenu from './ContextMenu'
import { vibrateMedium } from '../utils/mobile'
import { useLongPress, getContextMenuPosition } from '../utils/longPress'
import * as OTPAuth from 'otpauth'

/**
 * 支持左滑显示操作按钮 + 长按菜单的卡片包装器
 */
export default function SwipeableTokenCard({
  token,
  currentTime,
  onCopy,
  onDelete,
  selectionMode,
  isSelected,
  onToggleSelect,
  searchQuery,
  onMoveCategory,
  onEdit
}) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isSwiping, setIsSwiping] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)
  const cardRef = useRef(null)

  const ACTION_WIDTH = 80 // 删除按钮宽度
  const SWIPE_THRESHOLD = 40 // 触发打开的阈值

  // 长按手势
  const { isLongPressing, handlers: longPressHandlers } = useLongPress(() => {
    if (selectionMode || isOpen) return

    const element = cardRef.current
    if (element) {
      const pos = getContextMenuPosition(element, 280, 350)
      setMenuPosition(pos)
      setShowContextMenu(true)
    }
  }, 500)

  useEffect(() => {
    // 选择模式下关闭滑动和菜单
    if (selectionMode && (isOpen || showContextMenu)) {
      setIsOpen(false)
      setSwipeOffset(0)
      setShowContextMenu(false)
    }
  }, [selectionMode, isOpen, showContextMenu])

  const handleTouchStart = (e) => {
    if (selectionMode) return

    touchStartX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e) => {
    if (selectionMode || !isSwiping || isLongPressing) return

    touchCurrentX.current = e.touches[0].clientX
    const diff = touchCurrentX.current - touchStartX.current

    // 只允许向左滑动
    if (diff < 0) {
      const offset = Math.max(diff, -ACTION_WIDTH)
      setSwipeOffset(offset)

      // 阻止页面滚动
      if (Math.abs(diff) > 10) {
        e.preventDefault()
      }
    } else if (isOpen) {
      // 向右滑动关闭
      const offset = Math.max(-ACTION_WIDTH + diff, 0)
      setSwipeOffset(offset > -20 ? 0 : -ACTION_WIDTH)
    }
  }

  const handleTouchEnd = () => {
    if (selectionMode || !isSwiping) return

    setIsSwiping(false)

    // 判断是否达到打开阈值
    if (swipeOffset < -SWIPE_THRESHOLD && !isOpen) {
      setIsOpen(true)
      setSwipeOffset(-ACTION_WIDTH)
      vibrateMedium()
    } else if (swipeOffset > -SWIPE_THRESHOLD && isOpen) {
      setIsOpen(false)
      setSwipeOffset(0)
    } else {
      // 回弹到状态
      setSwipeOffset(isOpen ? -ACTION_WIDTH : 0)
    }
  }

  const handleDelete = () => {
    onDelete(token.id)
    setIsOpen(false)
    setSwipeOffset(0)
  }

  const handleContextCopy = (tokenId) => {
    const targetToken = token
    const totp = new OTPAuth.TOTP({
      secret: targetToken.secret,
      algorithm: targetToken.algorithm || 'SHA1',
      digits: targetToken.digits || 6,
      period: targetToken.period || 30
    })
    const code = totp.generate()
    onCopy(code, tokenId)
  }

  const handleContextMove = (tokenId, categoryId) => {
    onMoveCategory(tokenId, categoryId)
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && cardRef.current && !cardRef.current.contains(e.target)) {
        setIsOpen(false)
        setSwipeOffset(0)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  return (
    <>
      <div className="relative overflow-hidden" ref={cardRef}>
        {/* 背景删除按钮 */}
        <div className="absolute inset-y-0 right-0 flex">
          <button
            onClick={handleDelete}
            className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-all touch-target"
            style={{
              width: `${ACTION_WIDTH}px`,
              opacity: isOpen ? 1 : 0
            }}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* 卡片主体 */}
        <div
          className="relative transition-transform"
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transitionDuration: isSwiping ? '0ms' : '300ms'
          }}
          onTouchStart={(e) => {
            handleTouchStart(e)
            longPressHandlers.onTouchStart(e)
          }}
          onTouchMove={(e) => {
            handleTouchMove(e)
            longPressHandlers.onTouchMove(e)
          }}
          onTouchEnd={(e) => {
            handleTouchEnd()
            longPressHandlers.onTouchEnd(e)
          }}
          onTouchCancel={longPressHandlers.onTouchCancel}
        >
          <TokenCard
            token={token}
            currentTime={currentTime}
            onCopy={onCopy}
            onDelete={onDelete}
            selectionMode={selectionMode}
            isSelected={isSelected}
            onToggleSelect={onToggleSelect}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* 上下文菜单 */}
      {showContextMenu && (
        <ContextMenu
          token={token}
          position={menuPosition}
          onClose={() => setShowContextMenu(false)}
          onCopy={handleContextCopy}
          onDelete={onDelete}
          onMove={handleContextMove}
          onEdit={onEdit}
        />
      )}
    </>
  )
}
