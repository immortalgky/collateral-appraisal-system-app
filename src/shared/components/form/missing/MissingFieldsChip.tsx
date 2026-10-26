import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { useMissingFields } from './missingFieldsContext';
import { sectionCount } from './types';
import { useJumpToMissing } from './useJumpToMissing';

/**
 * "Missing N fields" chip (DESIGN.md 17.8, "Missing fields"). Opens a popover that lists what is
 * missing per section; a click on an item jumps to that field. Shows a green "complete" pill when
 * nothing is missing. Renders nothing outside a `MissingFieldsProvider`.
 *
 * `placement` is where the popover opens: up from an action bar, down from a header.
 */
const MissingFieldsChip = ({ placement = 'up' }: { placement?: 'up' | 'down' }) => {
  const { t } = useTranslation('common');
  const missing = useMissingFields();
  const jump = useJumpToMissing();
  const popoverId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isOpen = missing?.isOpen ?? false;
  const setOpen = missing?.setOpen;

  useEffect(() => {
    if (!isOpen || !setOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      // A click elsewhere takes the focus there itself; only Escape hands it back to the chip.
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      chipRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, setOpen]);

  // Keyboard users land on the list, not on a Save button the popover just covered.
  useEffect(() => {
    if (!isOpen) return;
    popoverRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }, [isOpen]);

  // Screen readers hear the count when a Save fails, and "complete" when the form then gets there.
  // Not on every live recount: that would talk over someone typing.
  const shown = missing?.shown ?? 0;
  const total = missing?.summary?.total;
  const completeText = missing?.completeLabel ?? t('missing.complete');
  const [announcement, setAnnouncement] = useState('');
  const failedSave = useRef(false);
  useEffect(() => {
    if (shown === 0 || total === undefined) return;
    failedSave.current = total > 0;
    setAnnouncement(total > 0 ? t('missing.chip', { count: total }) : completeText);
    // Only a new `show` announces; the count and text it reads are those of that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  useEffect(() => {
    if (!failedSave.current || total !== 0) return;
    failedSave.current = false;
    setAnnouncement(completeText);
  }, [total, completeText]);

  const summary = missing?.summary;
  if (!missing || !summary) return null;

  // One live region in both states (chip and pill), so it survives the switch between them and
  // the change to "complete" is announced.
  const liveRegion = (
    <span role="status" aria-live="polite" className="sr-only">
      {announcement && <span key={shown}>{announcement}</span>}
    </span>
  );

  if (summary.total === 0) {
    return (
      <>
        {liveRegion}
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-green-100 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300">
          <Icon style="solid" name="circle-check" className="size-3.5!" />
          {completeText}
        </span>
      </>
    );
  }

  const { sections } = summary;

  return (
    <>
      {liveRegion}
      <span ref={wrapRef} className="relative">
        <button
          ref={chipRef}
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-controls={isOpen ? popoverId : undefined}
          onClick={() => setOpen?.(!isOpen)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash) px-3 py-1 text-xs font-semibold text-(--palette-warn) hover:bg-amber-100 dark:hover:bg-amber-500/20"
        >
          <Icon style="solid" name="triangle-exclamation" className="size-3.5!" />
          {t('missing.chip', { count: summary.total })}
          <Icon
            style="solid"
            name={isOpen === (placement === 'up') ? 'chevron-down' : 'chevron-up'}
            className="size-3!"
          />
        </button>

        {isOpen && (
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label={t('missing.listLabel')}
            className={clsx(
              'absolute right-0 z-50 max-h-[min(60vh,28rem)] w-[min(24rem,calc(100vw-3rem))] overflow-y-auto overscroll-contain rounded-xl border border-(--palette-line) bg-(--palette-surface) p-3 shadow-xl',
              placement === 'up' ? 'bottom-full mb-6' : 'top-full mt-2',
            )}
          >
            <h4 className="mb-1 text-sm font-semibold text-(--palette-ink)">
              {/* plural by the section count: "1 missing in 1 section", "3 missing in 2 sections" */}
              {t('missing.popoverTitle', { count: sections.length, missing: summary.total })}
            </h4>
            {sections.map(section => (
              <div key={section.id} className="mt-2">
                <div className="flex justify-between text-xs font-semibold text-(--palette-ink-2)">
                  <span>{section.title}</span>
                  <span>{sectionCount(section)}</span>
                </div>
                {section.items.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setOpen?.(false);
                      jump(item, section.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-(--palette-ink) hover:bg-(--palette-surface-3)"
                  >
                    <Icon
                      style="solid"
                      name="triangle-exclamation"
                      className="size-3! shrink-0 text-amber-500"
                    />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <span className="shrink-0 text-xs text-(--palette-accent-ink)">
                      {t('missing.goTo')}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </span>
    </>
  );
};

export default MissingFieldsChip;
