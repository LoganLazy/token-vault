import { CheckSquare, Trash2, FolderInput, X } from 'lucide-react'

export default function BatchActionsBar({
  selectedCount,
  onDelete,
  onMove,
  onCancel,
  categories
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface border-t border-border shadow-2xl z-30 animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-terracotta flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink dark:text-surface">
                已选择 {selectedCount} 个账号
              </p>
              <p className="text-xs text-muted">
                可以批量删除或移动到其他分类
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Move to Category */}
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-full text-sm text-muted hover:bg-surface dark:hover:bg-ink transition-colors"
              >
                <FolderInput className="w-4 h-4" />
                <span className="hidden sm:inline">移动到</span>
              </button>

              {/* Dropdown */}
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-white dark:bg-surface border border-border rounded-xl shadow-xl py-2 min-w-[160px]">
                {categories.filter(c => c.id !== 'all').map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => onMove(cat.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink dark:text-surface hover:bg-terracotta-tint transition-colors"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">删除</span>
            </button>

            {/* Cancel */}
            <button
              onClick={onCancel}
              className="p-2 text-muted hover:text-ink dark:hover:text-surface transition-colors"
              title="取消选择"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
