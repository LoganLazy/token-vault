import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import SwipeableTokenCard from './SwipeableTokenCard'

const SortableTokenCard = memo(function SortableTokenCard({
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: token.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: selectionMode ? 'pointer' : isDragging ? 'grabbing' : 'grab'
  }

  // 在选择模式下禁用拖拽
  const dragListeners = selectionMode ? {} : listeners

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...dragListeners}>
      <SwipeableTokenCard
        token={token}
        currentTime={currentTime}
        onCopy={onCopy}
        onDelete={onDelete}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        searchQuery={searchQuery}
        onMoveCategory={onMoveCategory}
        onEdit={onEdit}
      />
    </div>
  )
})

export default SortableTokenCard
