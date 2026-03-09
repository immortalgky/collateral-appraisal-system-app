import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/components';
import clsx from 'clsx';

interface ScrollableTableContainerProps {
  children: ReactNode;
  className?: string;
}

export function ScrollableTableContainer({ children, className }: ScrollableTableContainerProps) {
  const { t } = useTranslation('common');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [buttonTop, setButtonTop] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 1);
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    setButtonTop(el.scrollTop + el.clientHeight / 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial check + delayed re-check for async content
    updateScrollState();
    const timer = setTimeout(updateScrollState, 500);

    // Watch container resize
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    // Watch children changes (e.g. table columns added after async load)
    const mutationObserver = new MutationObserver(updateScrollState);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateScrollState]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -300 : 300;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scroll('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scroll('right');
    }
  };

  const hasOverflow = canScrollLeft || canScrollRight;

  return (
    <div className={clsx('relative', className)}>
      {hasOverflow && (
        <div className="flex justify-end px-2 py-1">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-gray-300 bg-gray-50 text-[10px] font-mono">←</kbd>
            <kbd className="px-1 py-0.5 rounded border border-gray-300 bg-gray-50 text-[10px] font-mono">→</kbd>
            <span className="ml-0.5">{t('hint.scrollWithArrowKeys')}</span>
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        tabIndex={0}
        className="h-full overflow-auto outline-none focus-visible:outline-none"
        onScroll={updateScrollState}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          style={{ top: buttonTop }}
          className="absolute left-2 -translate-y-1/2 z-40 size-8 rounded-full bg-white/80 shadow-md border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-white hover:shadow-lg transition-all"
          aria-label="Scroll left"
        >
          <Icon name="chevron-left" className="size-4 text-gray-600" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          style={{ top: buttonTop }}
          className="absolute right-2 -translate-y-1/2 z-40 size-8 rounded-full bg-white/80 shadow-md border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-white hover:shadow-lg transition-all"
          aria-label="Scroll right"
        >
          <Icon name="chevron-right" className="size-4 text-gray-600" />
        </button>
      )}
    </div>
  );
}
