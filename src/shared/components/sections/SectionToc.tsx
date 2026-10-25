import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFormLayout } from '../form/formLayoutContext';
import { SectionStatusMark, useSectionStatus } from '../form/missing';

export interface TocSection {
  /** The DOM id of the section's element, the scroll target. */
  id: string;
  title: string;
}

/** The nearest ancestor that scrolls vertically, or null when the window does. */
function findScroller(el: HTMLElement): HTMLElement | null {
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    const overflow = getComputedStyle(parent).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return parent;
  }
  return null;
}

const rootFontPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 14;

/** A CSS length the shell sets (`--form-scroll-offset`) in px; rem follows the live root size. */
const lengthToPx = (value: string) => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return value.trim().endsWith('rem') ? n * rootFontPx() : n;
};

/** How long the scroll must be still before a jump's smooth scroll is taken as finished. */
const JUMP_SETTLE_MS = 150;

/**
 * The section being read: the last of `ids` (page order) whose top has passed the reading line, the
 * line a jump lands a section on (the scroller's top + `--form-scroll-offset` + 1rem, as
 * `FormSection`'s `scroll-mt` does, plus a few px of slack). At the very bottom of the scroller it
 * is the last one, since a short last section can never reach the line. Without layout (a test DOM)
 * the first section stays active.
 *
 * `select` marks a section at once for a click; scroll events are ignored until the jump's smooth
 * scroll settles, so the sections it passes through do not flash.
 */
function useActiveSectionId(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');
  const settle = useRef<number | null>(null);
  const key = ids.join('|');

  const select = useCallback((id: string) => {
    setActive(id);
    if (settle.current !== null) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => (settle.current = null), JUMP_SETTLE_MS);
  }, []);

  useEffect(() => {
    const first = document.getElementById(ids[0] ?? '');
    if (!first) return;
    const scroller = findScroller(first);
    const source: EventTarget = scroller ?? window;
    let frame = 0;

    const update = () => {
      frame = 0;
      const viewHeight = scroller ? scroller.clientHeight : window.innerHeight;
      if (!viewHeight) return;
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      const pinned = scroller
        ? lengthToPx(getComputedStyle(scroller).getPropertyValue('--form-scroll-offset'))
        : 0;
      const line = top + pinned + rootFontPx() + 8;
      const scrolled = scroller ? scroller.scrollTop : window.scrollY;
      const total = scroller ? scroller.scrollHeight : document.documentElement.scrollHeight;
      const atBottom = total > viewHeight && scrolled + viewHeight >= total - 2;

      let current = ids[0];
      if (atBottom) current = ids[ids.length - 1];
      else
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= line) current = id;
        }
      setActive(current);
    };

    const onScroll = () => {
      if (settle.current !== null) {
        // A jump is scrolling: keep the clicked section, and wait for the scroll to go still.
        window.clearTimeout(settle.current);
        settle.current = window.setTimeout(() => (settle.current = null), JUMP_SETTLE_MS);
        return;
      }
      if (!frame) frame = requestAnimationFrame(update);
    };

    source.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      source.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
    // `key` stands for `ids`: callers pass a fresh array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [active, select] as const;
}

/**
 * The "On this page" card of the property shell's rail (DESIGN.md 17.8): one link per form section,
 * the one being read highlighted as the page scrolls. Standard has a heading and roomier links;
 * Compact (from `useFormLayout()`) drops the heading.
 *
 * Contract: `sections` is the form's sections in page order, each `{ id, title }` where `id` is the
 * DOM id of the element that carries the section (`FormSection` renders it). The sections must be
 * mounted when this is; give them `scroll-mt-*` so the pinned tab row does not cover the title the
 * link scrolls to. Hide the card (don't render it) below the wide shell: the narrow shell has none.
 *
 * Inside a missing-fields provider each row ends with the section's status, a tick or an amber "ขาด n";
 * a row with something missing jumps to its first missing field instead of the section top.
 */
export function SectionToc({ sections }: { sections: TocSection[] }) {
  const { t } = useTranslation('common');
  const compact = useFormLayout() === 'compact';
  const [active, select] = useActiveSectionId(sections.map(s => s.id));
  const statusOf = useSectionStatus();

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label={t('sectionToc.title')}
      className={clsx(
        'border border-(--palette-line) bg-(--palette-surface)',
        compact ? 'rounded-[0.5714rem] p-[0.4286rem]' : 'rounded-section p-[0.7143rem]',
      )}
    >
      {!compact && (
        <h6 className="px-[0.7143rem] pb-1 text-xs font-semibold text-(--palette-ink-2)">
          {t('sectionToc.title')}
        </h6>
      )}
      {sections.map(({ id, title }) => {
        const status = statusOf(id);
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-current={id === active ? 'location' : undefined}
            title={status?.count ? t('missing.goTo') : undefined}
            onClick={e => {
              e.preventDefault();
              select(id);
              if (status?.count) return status.jump();
              // scrollIntoView moves whichever ancestor scrolls (the form scroller or the window).
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={clsx(
              'flex items-center justify-between gap-2 rounded-lg',
              compact ? 'px-2 py-0.5 text-table' : 'px-[0.7143rem] py-1 text-sm',
              id === active
                ? 'bg-(--palette-accent-wash) font-semibold text-(--palette-accent-ink)'
                : 'text-(--palette-ink) hover:bg-(--palette-surface-3)',
            )}
          >
            {title}
            {status && <SectionStatusMark count={status.count} />}
          </a>
        );
      })}
    </nav>
  );
}
