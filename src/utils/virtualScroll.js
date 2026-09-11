import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

/**
 * 虚拟滚动 Hook
 * 当列表项超过阈值时启用虚拟滚动，提升性能
 */
export function useVirtualScroll(items, threshold = 20) {
  const parentRef = useRef(null)

  // 只在项目数量超过阈值时启用虚拟滚动
  const shouldVirtualize = items.length > threshold

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // 预估卡片高度
    overscan: 5, // 预渲染项数量
    enabled: shouldVirtualize
  })

  return {
    parentRef,
    virtualizer,
    shouldVirtualize,
    virtualItems: shouldVirtualize ? virtualizer.getVirtualItems() : items.map((_, index) => ({ index })),
    totalSize: shouldVirtualize ? virtualizer.getTotalSize() : 0
  }
}
