import { useEffect, useRef, useState } from 'react';
import { AssetSummaryGroupCard } from './AssetSummaryGroupCard';
import type { AssetSummaryDto } from '@/features/appraisal/api/assetSummary';
import { AssetSummaryDetailTable } from './AssetSummaryDetailTable';
import Icon from '@/shared/components/Icon';

interface AssetSummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultExpanded?: boolean;
  data: AssetSummaryDto | undefined;
}

// w-56 = 224px card + gap-2 = 8px; scroll two cards at a time
const CARD_SCROLL_STEP = (224 + 8) * 2;

export function AssetSummaryDrawer({
  isOpen,
  onClose,
  defaultExpanded = false,
  data,
}: AssetSummaryDrawerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [filterParams, setFilterParams] = useState<Set<number> | undefined>();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update arrow visibility based on current scroll position
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  // Re-evaluate scroll bounds whenever the drawer opens, group count changes, or the
  // panel is expanded/collapsed. Uses setTimeout so we measure AFTER the 200ms CSS
  // width transition completes — requestAnimationFrame fires mid-animation and reads
  // the wrong clientWidth.
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(updateScrollState, 210);
    return () => clearTimeout(timer);
  }, [isOpen, data?.groups?.length, expanded]);

  const handleOnClickCard = (groupSet: number) => {
    setFilterParams(prev => {
      const next = new Set(prev);
      if (next.has(groupSet)) {
        next.delete(groupSet);
      } else {
        next.add(groupSet);
      }
      return next;
    });
  };

  const handleRemoveFilter = (groupSet: number) => {
    setFilterParams(prev => {
      const next = new Set(prev);
      next.delete(groupSet);
      // Return undefined when empty so hasAssetSummary-style checks read cleanly
      return next.size > 0 ? next : undefined;
    });
  };

  const handleClose = () => {
    setFilterParams(undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={handleClose} aria-hidden="true" />
      <div
        className={`fixed inset-y-0 right-0 z-50 bg-white shadow-2xl flex flex-col transition-[width,max-width] duration-200 ${
          expanded ? 'w-screen max-w-none' : 'w-[90vw] max-w-5xl'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Asset Summary</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
              aria-label={expanded ? 'Restore width' : 'Expand to full screen'}
              title={expanded ? 'Restore width' : 'Expand to full screen'}
            >
              {expanded ? (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 4a.75.75 0 01.75.75v2.5a1.5 1.5 0 01-1.5 1.5h-2.5a.75.75 0 010-1.5h2.5v-2.5A.75.75 0 018 4zM12 16a.75.75 0 01-.75-.75v-2.5a1.5 1.5 0 011.5-1.5h2.5a.75.75 0 010 1.5h-2.5v2.5A.75.75 0 0112 16z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.75 4h3.5a.75.75 0 010 1.5H6.31l2.72 2.72a.75.75 0 11-1.06 1.06L5.25 6.56v1.94a.75.75 0 01-1.5 0v-3.5A.75.75 0 014.75 4zM11.75 11.22a.75.75 0 011.06 0l2.44 2.72V12a.75.75 0 011.5 0v3.5a.75.75 0 01-.75.75h-3.5a.75.75 0 010-1.5h1.94l-2.69-2.47a.75.75 0 010-1.06z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Groups section label */}
          <p className="px-4 pt-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Groups
          </p>

          {/* Carousel */}
          <div className="relative px-4">
            {/* Left arrow — only visible when there is content to the left */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() =>
                  scrollRef.current?.scrollBy({ left: -CARD_SCROLL_STEP, behavior: 'smooth' })
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 bg-white border border-gray-200 rounded-full shadow-sm text-gray-500 hover:text-gray-800 hover:shadow-md transition-all"
                aria-label="Scroll left"
              >
                <Icon style="solid" name="chevron-left" className="size-3" />
              </button>
            )}

            {/* Scrollable card strip — scrollbar hidden, arrows replace native scroll UI */}
            <div
              ref={scrollRef}
              onScroll={updateScrollState}
              className="flex flex-row gap-2 overflow-x-auto scroll-smooth pb-3 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {(data?.groups ?? []).map(item => (
                <AssetSummaryGroupCard
                  key={item.id}
                  {...item}
                  handleOnClick={() => handleOnClickCard(item.groupSet)}
                  isSelected={filterParams?.has(item.groupSet) ?? false}
                />
              ))}
            </div>

            {/* Right arrow — only visible when there is content to the right */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() =>
                  scrollRef.current?.scrollBy({ left: CARD_SCROLL_STEP, behavior: 'smooth' })
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 bg-white border border-gray-200 rounded-full shadow-sm text-gray-500 hover:text-gray-800 hover:shadow-md transition-all"
                aria-label="Scroll right"
              >
                <Icon style="solid" name="chevron-right" className="size-3" />
              </button>
            )}
          </div>

          {/* Details header + active filter chips on the same row */}
          <div className="px-4 pt-1 pb-2 flex items-center gap-3 flex-wrap">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
              Details
            </p>

            {filterParams && filterParams.size > 0 && (
              <div className="flex flex-row flex-wrap gap-1.5">
                {[...filterParams].map(p => {
                  const groupLabel = `Group ${p}`;
                  return (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium"
                    >
                      {groupLabel}
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter(p)}
                        aria-label={`Remove filter for ${groupLabel}`}
                        className="text-amber-400 hover:text-amber-700 ml-0.5 cursor-pointer transition-colors"
                      >
                        <Icon style="solid" name="xmark" className="size-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <AssetSummaryDetailTable items={data?.items ?? []} filterParams={filterParams} />
          </div>
        </div>
      </div>
    </>
  );
}
