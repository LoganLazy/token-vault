import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TokenCard from './TokenCard'

export default function SortableTokenCard({ token, currentTime, onCopy, onDelete }) {
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
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TokenCard
        token={token}
        currentTime={currentTime}
        onCopy={onCopy}
        onDelete={onDelete}
      />
    </div>
  )
}
