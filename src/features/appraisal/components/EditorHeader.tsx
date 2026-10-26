import { useRef, type ReactNode, type Ref, type RefObject } from 'react';
import clsx from 'clsx';
import { useFormLayout } from '@shared/components/form/formLayoutContext';
import { EditorTabBar, type EditorTab } from './EditorTabBar';

interface EditorHeaderProps {
  /** Before the title: the type pill, e.g. `<PropertyTypeChip size="md" />`. */
  badge?: ReactNode;
  title: ReactNode;
  /** Grey italic, for a name that is not there yet ("new", "untitled"). */
  titleMuted?: boolean;
  /** Quiet text after the title: position, key facts. Wrap its own separators. */
  facts?: ReactNode;
  /** The right end: a status, a price, buttons. */
  actions?: ReactNode;
  /** One entry per tab (or section). Omit for a header with no tab row. */
  tabs?: EditorTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** Names the tab row for screen readers. Required with `tabs`. */
  tabsLabel?: string;
  /** `tabs` swaps what is shown; `sections` jumps to a part of one long page. */
  tabsMode?: 'tabs' | 'sections';
  tabsBarRef?: Ref<HTMLDivElement>;
  /**
   * The identity row's wrapper, for a page that needs its height (the tab bar scrolls back to it).
   * Given none, the header keeps its own.
   */
  anchorRef?: RefObject<HTMLDivElement | null>;
}

/**
 * The top of an editor page (DESIGN.md 17.8): the identity row (badge, title, facts, actions) and,
 * under it, the pinned tab row in one frame. Standard pads the row `py-[0.7143rem]`; Compact is a
 * `min-h-[3.1429rem]` band with a shorter tab row (from `useFormLayout()`).
 *
 * Returned as two siblings on purpose: the identity row scrolls away and the tabs stay pinned. A
 * sticky element only sticks inside its parent, so render this as a direct child of the form's
 * scroll container.
 */
export function EditorHeader({
  badge,
  title,
  titleMuted = false,
  facts,
  actions,
  tabs = [],
  activeTab,
  onTabChange,
  tabsLabel = '',
  tabsMode = 'tabs',
  tabsBarRef,
  anchorRef,
}: EditorHeaderProps) {
  const compact = useFormLayout() === 'compact';
  const ownAnchor = useRef<HTMLDivElement>(null);
  const anchor = anchorRef ?? ownAnchor;
  const joined = tabs.length > 0;

  return (
    <>
      <div ref={anchor} className="px-3 pt-3">
        <div
          className={clsx(
            'flex flex-wrap items-center gap-x-[0.7143rem] gap-y-1 border-x border-t border-(--palette-line) bg-(--palette-surface) px-4',
            !joined && 'rounded-b-section border-b',
            compact
              ? 'min-h-[3.1429rem] rounded-t-[0.5714rem]'
              : 'rounded-t-section py-[0.7143rem]',
          )}
        >
          {badge}
          <h2
            className={clsx(
              'min-w-0 break-words text-base font-semibold',
              titleMuted ? 'italic text-(--palette-ink-2)' : 'text-(--palette-ink)',
            )}
          >
            {title}
          </h2>
          {facts && (
            <div className="flex min-w-0 flex-wrap items-center text-xs text-(--palette-ink-2)">
              {facts}
            </div>
          )}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      {joined && (
        <EditorTabBar
          joined
          barRef={tabsBarRef}
          mode={tabsMode}
          scrollAnchorRef={anchor}
          tabs={tabs}
          activeId={activeTab}
          label={tabsLabel}
          onSelect={id => onTabChange?.(id)}
        />
      )}
    </>
  );
}
