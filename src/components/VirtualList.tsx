import React, { useMemo, useRef, useState } from 'react';

type Props<T> = {
  items: T[];
  height: number;
  itemHeight: number;
  width?: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  ariaLabel?: string;
};

export default function VirtualList<T>({ items, height, itemHeight, width = '100%', renderItem, ariaLabel }: Props<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
  const visibleCount = Math.ceil(height / itemHeight) + 4; // buffer rows
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      style={{ height, width, overflowY: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      aria-label={ariaLabel}
      role="list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIndex * itemHeight, left: 0, right: 0 }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }} aria-label={ariaLabel ? `${ariaLabel}-${startIndex + i}` : undefined}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}