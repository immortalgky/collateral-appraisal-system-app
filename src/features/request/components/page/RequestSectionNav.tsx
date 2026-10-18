import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import {
  MISSING_SECTIONS,
  SECTION_ANCHOR,
  sectionTotal,
  type MissingSection,
} from '../../hooks/useRequestMissingFields';
import { useMissingFields } from './MissingFieldsProvider';

const SCROLL_CONTAINER_ID = 'form-scroll-container';
// Below the sticky bar (about 3rem) and the cards' scroll margin, so a card the nav just scrolled to counts as reached.
const READING_LINE_PX = 80;

/**
 * Sticky jump bar over the page cards: one entry per card, a status dot (green complete, amber
 * missing n) and a short count. Highlights the card being read by watching the form's scroller.
 * In read-only mode there are no dots, only counts.
 */
const RequestSectionNav = () => {
  const { t } = useTranslation('request');
  const readOnly = usePageReadOnly();
  const { summary } = useMissingFields();
  const [current, setCurrent] = useState<MissingSection>('s1');

  // Scroll spy: the card being read is the last one whose top has passed a line just under the
  // sticky bar. (An IntersectionObserver band picks the first card still touching it, which is the
  // card above while a tall one fills the screen.) At the very bottom it is always the last card.
  useEffect(() => {
    const container = document.getElementById(SCROLL_CONTAINER_ID);
    if (!container) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = container.getBoundingClientRect().top + READING_LINE_PX;
      const atEnd = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
      let active: MissingSection = MISSING_SECTIONS[0];
      MISSING_SECTIONS.forEach(s => {
        const el = document.getElementById(SECTION_ANCHOR[s]);
        if (el && (atEnd || el.getBoundingClientRect().top <= line)) active = s;
      });
      setCurrent(active);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const go = (section: MissingSection) => {
    setCurrent(section);
    // The cards carry a scroll margin that clears this sticky bar.
    document
      .getElementById(SECTION_ANCHOR[section])
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const metaOf = (section: MissingSection) => {
    if (!summary) return null;
    const missing = sectionTotal(summary, section);
    const { counts } = summary;
    if (readOnly) {
      if (section === 'titles') return { text: String(counts.titles), tone: 'plain' } as const;
      if (section === 'docs')
        return { text: t('page.nav.files', { count: counts.files }), tone: 'plain' } as const;
      return null;
    }
    if (section === 'docs') {
      return counts.requiredDocs > 0
        ? ({
            text: `${counts.requiredDocsDone}/${counts.requiredDocs}`,
            tone: missing ? 'warn' : 'ok',
          } as const)
        : ({ text: t('page.nav.files', { count: counts.files }), tone: 'plain' } as const);
    }
    if (missing) return { text: t('page.nav.missing', { count: missing }), tone: 'warn' } as const;
    if (section === 'titles')
      return { text: t('page.nav.titleCount', { count: counts.titles }), tone: 'ok' } as const;
    return { text: t('page.nav.complete'), tone: 'ok' } as const;
  };

  return (
    <nav
      aria-label={t('page.nav.label')}
      className="sticky top-0 z-30 flex items-center gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/90 p-1 backdrop-blur-sm"
    >
      {MISSING_SECTIONS.map(section => {
        const missing = summary ? sectionTotal(summary, section) : 0;
        const meta = metaOf(section);
        const active = section === current;
        return (
          <button
            key={section}
            type="button"
            onClick={() => go(section)}
            aria-current={active ? 'true' : undefined}
            title={
              !readOnly && summary
                ? missing
                  ? t('page.nav.missing', { count: missing })
                  : t('page.nav.complete')
                : undefined
            }
            className={clsx(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-sm',
              active
                ? 'border-primary bg-white font-semibold text-gray-800 shadow-sm'
                : 'border-transparent text-gray-600 hover:bg-gray-100',
            )}
          >
            {!readOnly && summary && (
              <span
                aria-hidden="true"
                className={clsx('size-2 rounded-full', missing ? 'bg-amber-500' : 'bg-green-600')}
              />
            )}
            {t(`page.nav.${section}`)}
            {meta && (
              <span
                className={clsx(
                  'text-xs font-normal',
                  meta.tone === 'warn' && 'font-semibold text-amber-700',
                  meta.tone === 'ok' && 'text-green-700',
                  meta.tone === 'plain' && 'text-gray-500',
                )}
              >
                {meta.text}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default RequestSectionNav;
