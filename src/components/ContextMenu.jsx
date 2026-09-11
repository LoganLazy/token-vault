import { X, Copy, Trash2, Edit3 } from 'lucide-react'
import { categories } from '../utils/services'

/**
 * 长按上下文菜单
 */
export default function ContextMenu({ token, position, onClose, onCopy, onDelete, onMove, onEdit }) {
  const handleAction = (action) => {
    action()
    onClose()
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* 菜单 */}
      <div
        className="fixed z-50 bg-white dark:bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden animate-slide-up"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '280px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-terracotta-tint">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink dark:text-surface truncate">
                {token.issuer}
              </p>
              <p className="text-xs text-muted truncate">
                {token.account}
              </p>
            </div>
            <button
              onClick={onClose}
              className="touch-target p-1 text-muted hover:text-ink transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="py-2">
          {/* 复制验证码 */}
          <button
            onClick={() => handleAction(() => onCopy(token.id))}
            className="touch-target w-full flex items-center gap-3 px-4 py-3 text-ink dark:text-surface hover:bg-terracotta-tint transition-colors"
          >
            <Copy className="w-5 h-5 text-terracotta" />
            <span className="text-sm font-medium">复制验证码</span>
          </button>

          {/* 编辑账号 */}
          <button
            onClick={() => handleAction(() => onEdit(token.id))}
            className="touch-target w-full flex items-center gap-3 px-4 py-3 text-ink dark:text-surface hover:bg-terracotta-tint transition-colors"
          >
            <Edit3 className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium">编辑账号</span>
          </button>

          {/* 移动分类 */}
          <div className="px-4 py-2">
            <p className="text-xs text-muted mb-2">移动到分类</p>
            <div className="space-y-1">
              {categories.filter(c => c.id !== 'all' && c.id !== token.category).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleAction(() => onMove(token.id, cat.id))}
                  className="touch-target w-full flex items-center gap-2 px-3 py-2 text-sm text-ink dark:text-surface hover:bg-surface dark:hover:bg-ink rounded-lg transition-colors"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="h-px bg-border my-2" />

          {/* 删除 */}
          <button
            onClick={() => handleAction(() => onDelete(token.id))}
            className="touch-target w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-sm font-medium">删除账号</span>
          </button>
        </div>
      </div>
    </>
  )
}
