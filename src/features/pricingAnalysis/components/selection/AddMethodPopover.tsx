import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Icon } from '@/shared/components';
import type { PricingAnalysisConfigType } from '../../schemas';
import type { Approach } from '../../types/selection';
import type { MethodKey } from '../../hooks/useSelectionActions';

// Real pixel size of the old `w-80 max-h-96` at this repo's 13px root font-size — rem utilities
// scale with the root, so the Tailwind numbers (320/384) are wrong here. Used both for the fixed
// popover's own box and to work out whether it fits below the trigger.
const POPOVER_WIDTH = 260;
const POPOVER_MAX_HEIGHT = 312;

interface AddMethodPopoverProps {
  /** Every approach + its candidate methods (mock's `id === 'ALL'` scope — the top bar sees
   *  every approach, not just one). No group-type filtering — see PricingAnalysisPage. */
  pricingConfiguration: PricingAnalysisConfigType[];
  /** state.summarySelected — read for each method's isIncluded flag ("already added"). */
  addedApproaches: Approach[];
  onClose: () => void;
  onAdd: (picks: MethodKey[]) => Promise<{ succeeded: MethodKey[]; failed: MethodKey[] }>;
}

const methodKey = (approachType: string, methodType: string) => `${approachType}|${methodType}`;

/** Top-bar "+ เพิ่มวิธี" popover (mock:3867-3884) — tick several methods across approaches and
 *  add them in one go, replacing the old behaviour of dropping straight into edit mode. */
export const AddMethodPopover = ({
  pricingConfiguration,
  addedApproaches,
  onClose,
  onAdd,
}: AddMethodPopoverProps) => {
  const { t } = useTranslation('pricingAnalysis');
  const containerRef = useRef<HTMLDivElement>(null);
  // The popover content is portalled to <body> (see below) so it can escape the accordion's
  // `overflow-hidden` wrapper, which leaves it with no in-DOM neighbour to anchor to. This span
  // renders in place — right after the trigger button, same as the old absolutely-positioned
  // popover did — purely so `previousElementSibling` can find that trigger.
  const anchorMarkerRef = useRef<HTMLSpanElement>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');

  const getTrigger = () => anchorMarkerRef.current?.previousElementSibling as HTMLElement | null;

  // Flip to opening upward when there isn't room below — the bug this exists to fix.
  const updatePlacement = useCallback(() => {
    const trigger = getTrigger();
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setAnchorRect(rect);
    const spaceBelow = window.innerHeight - rect.bottom;
    setPosition(
      spaceBelow < POPOVER_MAX_HEIGHT && rect.top > POPOVER_MAX_HEIGHT ? 'top' : 'bottom',
    );
  }, []);

  useLayoutEffect(() => {
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [updatePlacement]);

  useEffect(() => {
    containerRef.current?.focus();
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // Once portalled, the trigger sits outside containerRef. Without this guard, clicking it
      // to close the popover would fire this "outside click" handler AND the trigger's own
      // onClick toggle — closing it and immediately reopening it in the same gesture.
      if (getTrigger()?.contains(target)) return;
      if (containerRef.current && !containerRef.current.contains(target)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const addedKeys = new Set(
    addedApproaches.flatMap(a =>
      a.methods.filter(m => m.isIncluded).map(m => methodKey(a.approachType, m.methodType)),
    ),
  );

  const toggle = (key: string) => {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (picked.size === 0) return;
    const picks: MethodKey[] = [...picked].map(key => {
      const [approachType, methodType] = key.split('|');
      return { approachType, methodType };
    });

    setSubmitting(true);
    const { failed } = await onAdd(picks);
    setSubmitting(false);

    // Every pick landed — close like the mock does. A partial failure leaves the popover open
    // with only the failed picks still checked, so the user can retry without re-ticking the
    // ones that already succeeded (and without a chance to resubmit them).
    if (failed.length === 0) {
      onClose();
      return;
    }
    setPicked(new Set(failed.map(f => methodKey(f.approachType, f.methodType))));
  };

  // Clamp so a trigger near the right edge (the board's per-approach "+ เพิ่มวิธี", deep in a
  // wide table) doesn't push the fixed-width popover off the right of the viewport either.
  const left = anchorRect ? Math.min(anchorRect.left, window.innerWidth - POPOVER_WIDTH - 8) : 0;

  return (
    <>
      <span ref={anchorMarkerRef} className="hidden" aria-hidden="true" />
      {createPortal(
        <div
          ref={containerRef}
          tabIndex={-1}
          style={{
            position: 'fixed',
            width: POPOVER_WIDTH,
            maxHeight: POPOVER_MAX_HEIGHT,
            left,
            ...(position === 'bottom'
              ? { top: (anchorRect?.bottom ?? 0) + 4 }
              : { bottom: window.innerHeight - (anchorRect?.top ?? 0) + 4 }),
            // Never paint at the top-left fallback (anchorRect not measured yet) for one frame.
            visibility: anchorRect ? 'visible' : 'hidden',
          }}
          className="z-[100] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg flex flex-col outline-none"
        >
          <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100 shrink-0">
            {t('addMethodPopover.title')}
          </div>
          <div className="flex flex-col gap-2 p-2 overflow-y-auto">
            {pricingConfiguration.map(appr => (
              <div key={appr.approachType} className="flex flex-col gap-0.5">
                {pricingConfiguration.length > 1 && (
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500">{appr.label}</div>
                )}
                {appr.methods.map(m => {
                  const key = methodKey(appr.approachType, m.methodType);
                  const already = addedKeys.has(key);
                  return (
                    <label
                      key={key}
                      className={clsx(
                        'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm',
                        already
                          ? 'text-gray-400'
                          : 'text-gray-700 hover:bg-primary/5 cursor-pointer',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={already || picked.has(key)}
                        disabled={already || submitting}
                        onChange={() => toggle(key)}
                        className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-60"
                      />
                      <Icon name={m.icon ?? 'image'} style="solid" className="size-3 shrink-0" />
                      <span className="flex-1">{m.label}</span>
                      {already && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {t('addMethodPopover.alreadyAdded')}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-100 shrink-0">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              onClick={onClose}
            >
              {t('addMethodPopover.cancel')}
            </button>
            <button
              type="button"
              disabled={picked.size === 0 || submitting}
              onClick={handleSubmit}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium text-white',
                picked.size === 0 || submitting
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 cursor-pointer',
              )}
            >
              {picked.size === 0
                ? t('addMethodPopover.chooseFirst')
                : t('addMethodPopover.addCount', { count: picked.size })}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
