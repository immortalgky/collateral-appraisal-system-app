import { useCallback, useRef, type Ref, type RefObject } from 'react';
import clsx from 'clsx';
import { EdgeFades } from '@shared/components/EdgeFades';
import { useFormLayout } from '@shared/components/form/formLayoutContext';
import { useScrollCue } from '@shared/hooks/useScrollCue';
import { SectionStatusMark } from '@shared/components/form/missing';

/** One entry in the bar under an editor's header. */
export interface EditorTab {
  id: string;
  label: string;
  /** A quiet number beside the label, e.g. how many survey factors the template has. */
  count?: number;
  /** Fields in this part that failed validation, so an error out of sight still shows. */
  errorCount?: number;
  /** Fields still missing in this part (the missing-fields summary): an amber "ขาด n" pill. */
  missingCount?: number;
}

export interface EditorTabBarProps {
  barRef?: Ref<HTMLDivElement>;
  tabs: EditorTab[];
  activeId?: string;
  /** Names the bar for screen readers. */
  label: string;
  onSelect: (id: string) => void;
  /** `tabs` swaps what is shown; `sections` jumps to a part of one long page. */
  mode?: 'tabs' | 'sections';
  /**
   * The header block above the bar. With it, in `tabs` mode, picking a tab while the scroller is
   * below that block scrolls back up to the block's height — the top of the tab. Without it the bar
   * never scrolls (the `sections` bar of the market comparable editor does its own jumping).
   */
  scrollAnchorRef?: RefObject<HTMLElement | null>;
  /**
   * The bar is the second row of the identity frame above it (DESIGN.md 17.8): side and bottom
   * border, a hairline on top, no gap above. Without it the bar is a free-standing underline strip.
   */
  joined?: boolean;
}

/**
 * The underline bar pinned under an editor's header. The header renders it as a direct child of
 * the form's scroll container — a sticky element only sticks inside its parent. Row height and
 * radius follow the form layout (Standard 36, Compact 34).
 */
export const EditorTabBar = ({
  barRef,
  tabs,
  activeId,
  label,
  onSelect,
  mode = 'tabs',
  scrollAnchorRef,
  joined = false,
}: EditorTabBarProps) => {
  const compact = useFormLayout() === 'compact';
  // Many tabs (or a narrow page) can overflow the row: fade the edge that hides some and keep the
  // open one in view.
  const { ref: scrollRef, canScrollStart, canScrollEnd } = useScrollCue<HTMLDivElement>(activeId);
  const isTabs = mode === 'tabs';
  // One tab is no choice: the strip stays (it joins header and sheet) but is not a tab list.
  const isTabList = isTabs && tabs.length > 1;
  const List = isTabs ? 'div' : 'nav';
  const ownRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      ownRef.current = node;
      if (typeof barRef === 'function') barRef(node);
      else if (barRef) barRef.current = node;
    },
    [barRef],
  );
  const select = (id: string) => {
    onSelect(id);
    const anchor = scrollAnchorRef?.current;
    if (!isTabs || !anchor) return;
    // Deep in a long tab, picking a tab (the open one too) opens it at its top: the scroller goes
    // back to where the strip pins, under the header block above it.
    const scroller = ownRef.current?.parentElement;
    const aboveHeight = anchor.offsetHeight;
    if (scroller && scroller.scrollTop > aboveHeight) scroller.scrollTo({ top: aboveHeight });
  };
  return (
    <div
      ref={setRefs}
      className={clsx('sticky top-0 z-10 bg-(--palette-surface) px-3', !joined && 'pt-3')}
    >
      <div className="relative">
        <List
          ref={scrollRef}
          role={isTabList ? 'tablist' : isTabs ? 'group' : undefined}
          aria-label={label}
          // The baseline is an inset shadow, not a border the tabs overlap with -mb-px: the bar scrolls
          // sideways, and that overflow clipped the overlapping pixel, halving the active underline.
          className={clsx(
            'flex items-stretch gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            compact ? 'h-[2.4286rem]' : 'h-ctl',
            joined
              ? clsx(
                  'border-x border-b border-(--palette-line) shadow-[inset_0_1px_0_var(--palette-line-soft)]',
                  compact ? 'rounded-b-[0.5714rem]' : 'rounded-b-section',
                )
              : 'shadow-[inset_0_-1px_0_var(--palette-line)]',
          )}
        >
          {tabs.map(tab => {
            const isActive = tab.id === activeId;
            const state = isTabList
              ? { role: 'tab', 'aria-selected': isActive }
              : isTabs
                ? {}
                : { 'aria-current': isActive ? ('location' as const) : undefined };
            return (
              <button
                key={tab.id}
                type="button"
                {...state}
                onClick={() => select(tab.id)}
                className={clsx(
                  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-(--palette-accent) text-(--palette-accent-ink)'
                    : 'border-transparent text-(--palette-ink-2) hover:text-(--palette-ink)',
                )}
              >
                {tab.label}
                {!!tab.count && (
                  <span className="tabular-nums text-(--palette-ink-2)">{tab.count}</span>
                )}
                {!!tab.missingCount && <SectionStatusMark count={tab.missingCount} />}
                {!!tab.errorCount && (
                  <span className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.7692rem] font-bold tabular-nums text-white">
                    {tab.errorCount}
                  </span>
                )}
              </button>
            );
          })}
          {/* End room, so the last tab clears the edge when it is the open one. */}
          <span aria-hidden className="w-2 shrink-0" />
        </List>
        <EdgeFades start={canScrollStart} end={canScrollEnd} fromClass="from-(--palette-surface)" />
      </div>
    </div>
  );
};
