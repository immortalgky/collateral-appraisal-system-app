import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { scrollToField } from '@/shared/components/form/utils';
import {
  MISSING_SECTIONS,
  SECTION_ANCHOR,
  sectionTotal,
  type MissingItem,
  type MissingSection,
} from '../../hooks/useRequestMissingFields';
import { useMissingFields } from './MissingFieldsProvider';

const hasField = (path: string) =>
  !!document.querySelector(
    `[data-field="${CSS.escape(path)}"], [data-field^="${CSS.escape(path)}."]`,
  );

/** Scroll to and focus the field if the page shows it, else land on its card. */
export function useJumpToMissing() {
  const { setFocus } = useFormContext();

  return (item: MissingItem, section: MissingSection) => {
    if (item.path && hasField(item.path)) {
      scrollToField(item.path);
      return;
    }
    if (item.path) {
      try {
        setFocus(item.path);
      } catch {
        // no registered ref behind this path: the card scroll below is the fallback
      }
    }
    document
      .getElementById(SECTION_ANCHOR[section])
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

/**
 * "Missing N fields" chip for the action bar. Opens a popover that lists what is missing per card;
 * a click on an item jumps to that field. Shows a green "complete" chip when nothing is missing.
 */
const MissingFieldsChip = () => {
  const { t } = useTranslation('request');
  const { summary, isOpen, setOpen } = useMissingFields();
  const jump = useJumpToMissing();
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, setOpen]);

  if (!summary) return null;

  if (summary.total === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
        <Icon style="solid" name="circle-check" className="size-3.5!" />
        {t('page.missing.complete')}
      </span>
    );
  }

  const sections = MISSING_SECTIONS.filter(s => summary.items[s].length > 0);

  return (
    <span ref={wrapRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
      >
        <Icon style="solid" name="triangle-exclamation" className="size-3.5!" />
        {t('page.missing.chip', { count: summary.total })}
        <Icon style="solid" name={isOpen ? 'chevron-down' : 'chevron-up'} className="size-3!" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={t('page.missing.listLabel')}
          className="absolute right-0 bottom-full z-50 mb-6 max-h-[min(60vh,28rem)] w-[min(24rem,calc(100vw-3rem))] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
        >
          <h4 className="mb-1 text-sm font-semibold text-gray-800">
            {t('page.missing.popoverTitle', { count: summary.total, sections: sections.length })}
          </h4>
          {sections.map(section => (
            <div key={section} className="mt-2">
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>{t(`page.nav.${section}`)}</span>
                <span>{sectionTotal(summary, section)}</span>
              </div>
              {summary.items[section].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    jump(item, section);
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700',
                    'hover:bg-gray-100',
                  )}
                >
                  <Icon
                    style="solid"
                    name="triangle-exclamation"
                    className="size-3! shrink-0 text-amber-500"
                  />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <span className="shrink-0 text-xs text-primary">{t('page.missing.goTo')}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </span>
  );
};

export default MissingFieldsChip;
