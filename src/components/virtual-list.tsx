import { type ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/cn'

interface VirtualListProps<T> {
  items: T[]
  /** Fixed height per item in pixels */
  itemHeight: number
  /** How many items to render outside the visible area */
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
  keyExtractor: (item: T, index: number) => string | number
  className?: string
  'aria-label'?: string
}

/**
 * Virtual scrolling for lists >50 items.
 * §42 item 60.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  keyExtractor,
  className,
  'aria-label': ariaLabel,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  const totalHeight = items.length * itemHeight
  const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIdx = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  )

  const visibleItems = items.slice(startIdx, endIdx)

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      onScroll={handleScroll}
      role="list"
      aria-label={ariaLabel}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIdx + i
          return (
            <div
              key={keyExtractor(item, index)}
              role="listitem"
              style={{
                position: 'absolute',
                top: index * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
