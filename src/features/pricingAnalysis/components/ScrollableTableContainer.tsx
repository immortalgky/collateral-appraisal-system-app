import { useContext, useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { MethodTabsNavSlotCtx } from '../store/methodTabsNavSlotContext';

interface ScrollableTableContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  /**
   * Pixel width of the frozen/sticky columns from the left edge of the scroll
   * container. Used to align "scroll to column" and to decide which columns count as
   * visible for the column-nav strip. Only meaningful together with
   * `columnNavSelector` — ignored otherwise.
   */
  stickyWidth?: number;
  /**
   * CSS selector, queried inside the scroll container, for the header cells the
   * column-nav strip jumps between (e.g. `'thead th[data-nav-col]'`). Renders a
   * "‹ 1 2 3 ›" shortcut strip above the table when set and more than one element
   * matches. Opt-in — omitting it renders exactly as before.
   */
  columnNavSelector?: string;
  /**
   * When true, a vertical wheel gesture with the pointer over `<thead>` scrolls the
   * table horizontally instead of the page scrolling vertically. Opt-in.
   */
  scrollHeaderWithWheel?: boolean;
  /**
   * When true, cells marked with the `pa-sticky-edge` class (the sticky column's
   * rightmost cell) get a hairline right border at rest, plus a drop shadow once the
   * table has been scrolled past its origin — matching the mock's `.stk2`/`.edge` +
   * `.scroller.moreL` behaviour. No longer gates the old arrow-button/caption pair;
   * those were removed for good, this prop just found a second job.
   */
  edgeShadow?: boolean;
  /** Column-nav chips cover this many columns each ("1–5", "6–10"), mock:3491 navItems().
   *  Default 1 — one chip per column, as every existing consumer renders today. */
  navGroupSize?: number;
}

export function ScrollableTableContainer({
  children,
  className,
  maxHeight,
  stickyWidth = 0,
  columnNavSelector,
  scrollHeaderWithWheel = false,
  edgeShadow = false,
  navGroupSize = 1,
}: ScrollableTableContainerProps) {
  const { t } = useTranslation(['common', 'pricingAnalysis']);
  // Non-null only when this container sits inside the *active* tab of a MethodTabs —
  // see methodTabsNavSlotContext.ts. Everywhere else (all 19+ other consumers, and an
  // inactive-but-still-mounted tab) this is null and the strip renders in place below,
  // exactly as before this existed.
  const navSlot = useContext(MethodTabsNavSlotCtx);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [navColumnCount, setNavColumnCount] = useState(0);
  const [visibleColumnIndices, setVisibleColumnIndices] = useState<number[]>([]);
  // Only tracked when edgeShadow is on — the sticky-edge shadow is the sole consumer.
  const [scrolledLeft, setScrolledLeft] = useState(false);

  const getNavColumns = useCallback((): HTMLElement[] => {
    const el = scrollRef.current;
    if (!el || !columnNavSelector) return [];
    return [...el.querySelectorAll<HTMLElement>(columnNavSelector)];
  }, [columnNavSelector]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (edgeShadow) setScrolledLeft(el.scrollLeft > 2);

    if (!columnNavSelector) return;
    const cols = getNavColumns();
    setNavColumnCount(cols.length);
    const visible: number[] = [];
    cols.forEach((th, i) => {
      const left = th.offsetLeft - el.scrollLeft;
      const right = left + th.offsetWidth;
      const shown = Math.min(right, el.clientWidth) - Math.max(left, stickyWidth);
      if (shown >= th.offsetWidth * 0.6) visible.push(i);
    });
    setVisibleColumnIndices(visible);
  }, [columnNavSelector, getNavColumns, stickyWidth, edgeShadow]);

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

  // Wheel-over-header scrolls horizontally instead of the page scrolling vertically.
  // Attached as a native listener (not React's onWheel) so preventDefault reliably
  // works — React registers wheel listeners as passive by default.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !scrollHeaderWithWheel) return;
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('thead') || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [scrollHeaderWithWheel]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -300 : 300;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const goToColumn = (index: number) => {
    const el = scrollRef.current;
    const cols = getNavColumns();
    const th = cols[Math.max(0, Math.min(index, cols.length - 1))];
    if (!el || !th) return;
    // mock:3565-3572 goMarket() — same scroll target (offsetLeft minus the sticky
    // columns' width) and the same one-shot "flash" on the header cell it lands on.
    // Every chip already maps 1:1 to the column it scrolls to here (no from/to range
    // grouping like the mock's DCF/Leasehold year chips), so the column we scroll to and
    // the column we flash are always the same `th` — nothing extra to resolve.
    const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: th.offsetLeft - stickyWidth, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    if (prefersReducedMotion) return;
    // `animate-nav-flash` — theme.css token dedicated to this "jump to column" flash,
    // deliberately separate from `animate-flash-highlight` (PropertiesTab.tsx's
    // paste-and-scroll ring): flat background only, no ring, matches the mock's
    // `.flash`/`@keyframes flash` timing (0.9s) and colour (`--nav-flash-color`, which
    // is `--color-primary-200`/`#99F6E4` in light — the same hex the mock calls
    // `--accent-line` — with its own dark-theme override, see theme.css).
    // remove → force reflow → add, so clicking the same chip twice in a row replays the
    // animation instead of no-opping (the class never actually left the element without
    // this, so the second `add` is a no-op and the animation doesn't restart).
    th.classList.remove('animate-nav-flash');
    void th.offsetWidth;
    th.classList.add('animate-nav-flash');
    const handleFlashEnd = () => {
      th.classList.remove('animate-nav-flash');
      th.removeEventListener('animationend', handleFlashEnd);
    };
    th.addEventListener('animationend', handleFlashEnd);
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

  const showNav = !!columnNavSelector && navColumnCount > 1;

  const navStrip = showNav && (
    <div className="flex items-center gap-1 px-2 py-1">
      <button
        type="button"
        onClick={() => goToColumn((visibleColumnIndices[0] ?? 0) - 1)}
        disabled={(visibleColumnIndices[0] ?? 0) === 0}
        className="size-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
        aria-label={t('pricingAnalysis:aria.scrollLeft')}
      >
        <Icon name="chevron-left" className="size-3" />
      </button>
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {Array.from({ length: Math.ceil(navColumnCount / navGroupSize) }, (_, g) => {
          const from = g * navGroupSize;
          const to = Math.min(from + navGroupSize, navColumnCount) - 1;
          return (
            <button
              key={g}
              type="button"
              onClick={() => goToColumn(from)}
              className={clsx(
                'min-w-5 h-5 px-1 rounded text-[11px] font-medium transition-colors',
                visibleColumnIndices.some(i => i >= from && i <= to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
              )}
            >
              {from === to ? from + 1 : `${from + 1}–${to + 1}`}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => goToColumn((visibleColumnIndices.at(-1) ?? 0) + 1)}
        disabled={(visibleColumnIndices.at(-1) ?? 0) >= navColumnCount - 1}
        className="size-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
        aria-label={t('pricingAnalysis:aria.scrollRight')}
      >
        <Icon name="chevron-right" className="size-3" />
      </button>
      {visibleColumnIndices.length > 0 && (
        <span className="text-[11px] text-gray-400 whitespace-nowrap ml-1">
          {t('nav.visibleRange', {
            from: (visibleColumnIndices[0] ?? 0) + 1,
            to: (visibleColumnIndices.at(-1) ?? 0) + 1,
            total: navColumnCount,
          })}
        </span>
      )}
    </div>
  );

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      {/* Portals into the active MethodTabs tab's toolbar when there's a slot for it
          (see MethodTabsNavSlotCtx above); otherwise renders right here, exactly as
          before this existed. Portaling only ever changes where this paints — every
          piece of state and every handler it closes over (goToColumn, scrollRef, …)
          still lives in this component. */}
      {navStrip && (navSlot ? createPortal(navStrip, navSlot) : navStrip)}

      {/* Sticky-column edge shadow — mock's `.g .stk2`/`.edge` at rest (hairline only)
          plus `.scroller.moreL` once scrolled (hairline + drop shadow). Global, static
          class names on purpose: this rule is meant to be identical everywhere, unlike
          StickyLabelTable's per-instance scoping which exists to avoid leaking a
          first-child rule onto unrelated sibling tables. */}
      {edgeShadow && (
        <style>{`
          .pa-sticky-edge { box-shadow: 1px 0 0 #e3e9e8; transition: box-shadow 0.15s; }
          .pa-scroller.pa-scrolled-left .pa-sticky-edge {
            box-shadow: 1px 0 0 #e3e9e8, 6px 0 8px -4px rgba(16, 24, 32, 0.22);
          }
        `}</style>
      )}


      <div
        ref={scrollRef}
        tabIndex={0}
        style={maxHeight ? { maxHeight } : undefined}
        // Two shadow contracts live side by side here on purpose: `pa-scroller`/
        // `pa-scrolled-left` (consumed by the `.pa-sticky-edge` CSS injected above) is
        // what SaleAdjustmentGridSecondRevision, DirectComparisonSecondRevision,
        // StickyLabelTable, SurveySelectionTable, LeaseholdTable and ProfitRentPanel
        // still key off; `group` + `data-scrolled` is what ComparativeFactorTable,
        // WQSScoringSection, SaleAdjustmentGridScoringSection and
        // DirectComparisonScoringSection migrated to via `group-data-[scrolled=true]:`.
        // Both read the same `scrolledLeft` state — drop neither without checking both
        // caller sets first.
        className={clsx(
          'h-full overflow-auto outline-none focus-visible:outline-none',
          edgeShadow && 'group pa-scroller',
          edgeShadow && scrolledLeft && 'pa-scrolled-left',
        )}
        data-scrolled={edgeShadow && scrolledLeft ? 'true' : undefined}
        onScroll={updateScrollState}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>

    </div>
  );
}
