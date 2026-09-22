import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/components';
import { RHFInputCell } from './table/RHFInputCell';
import type { ListBoxItem } from './table/TDropdown';

// Real pixel size of the old `w-80` at this repo's 13px root font-size — rem utilities scale
// with the root, so Tailwind's 320 is wrong here. Needed as a number because the panel is
// positioned with `position: fixed` inline styles rather than utility classes.
const POPOVER_WIDTH = 260;
const POPOVER_MAX_HEIGHT = 312;

interface TemplatePopoverProps {
  /** Chip display text — WQS prefixes the collateral type onto the template name,
   *  SAG/DC show the raw template code, so the caller composes the final string. */
  valueLabel: string;
  /** Omit to hide the collateral-type select — DCF's template list isn't keyed by it. */
  onSelectCollateralType?: (value: string) => void;
  /** The form field the template select binds to. DCF's schema names it `templateCode`. */
  templateFieldName?: string;
  templateOptions: ListBoxItem[];
  onSelectTemplate: (value: string) => void;
  onGenerate: () => void;
  isReadOnly: boolean;
}

/** Top-bar template chip + its popover (mock's PricingAnalysisTemplateSelector card,
 *  now anchored beside the method name) — shared by WQS/SAG/DC, the only three panels
 *  using this chip/generate flow. Was pasted into all three with no dismiss handling
 *  at all (no Escape, no outside-click); extracted so the fix, and any future one,
 *  lands in one place instead of three. */
export function TemplatePopover({
  valueLabel,
  onSelectCollateralType,
  templateFieldName = 'pricingTemplateCode',
  templateOptions,
  onSelectTemplate,
  onGenerate,
  isReadOnly,
}: TemplatePopoverProps) {
  const { t } = useTranslation('pricingAnalysis');
  const [isOpen, setIsOpen] = useState(false);
  // Wraps the trigger button. The panel itself is portalled to <body> (see below), so it is
  // NOT inside this ref any more — hence the explicit trigger guard in the pointer handler.
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');

  // Follow the trigger: the bar scrolls and the window resizes, and a `fixed` panel does not
  // move with either on its own.
  const updatePlacement = useCallback(() => {
    const trigger = containerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setAnchorRect(rect);
    const spaceBelow = window.innerHeight - rect.bottom;
    setPosition(
      spaceBelow < POPOVER_MAX_HEIGHT && rect.top > POPOVER_MAX_HEIGHT ? 'top' : 'bottom',
    );
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen, updatePlacement]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // The trigger (containerRef) and the panel (panelRef) are now in different parts of the
      // DOM, so both have to count as "inside" — otherwise clicking the trigger to close would
      // fire this handler AND the button's own toggle, closing and reopening in one gesture.
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      // The two selects below render their option list through a Headless UI
      // floating portal (RHFInputCell -> TDropdown's `anchor="bottom"` Listbox),
      // i.e. outside containerRef in the DOM even though they appear inside the
      // popover on screen. Without this, picking an option would look like an
      // outside click and close the whole popover instead of just the select.
      if ((target as Element).closest?.('[data-headlessui-portal]')) return;
      setIsOpen(false);
    };
    // Escape is handled by the open Listbox first (it stops propagation when it
    // closes itself), so this only ever fires once no nested select is open.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors max-w-[220px]"
      >
        <span className="text-gray-400 shrink-0">{t('template.template')}</span>
        <span className="truncate">{valueLabel || '—'}</span>
        <Icon name="chevron-down" style="solid" className="size-2.5 text-gray-400 shrink-0" />
      </button>
      {/* Portalled to <body> — the same treatment AddMethodPopover and CreateReferencePopover
          already use, though at a lower z-index than theirs (see the className below for why).
          This was the last popover in the feature still positioned with `absolute … z-30`
          inside its own parent.

          Why it had to change: z-30 is ALSO what every sticky table header in this feature uses
          (WQSScoringSection, ComparativeFactorTable, SurveySelectionTable, …). Equal z-index is
          resolved by DOM order, and the tables always come after the top bar — so a market
          column header painted straight over the open panel ("popup โดนทับ"). Raising the number
          alone would not settle it either, because as an `absolute` child the panel was trapped
          in the top bar's stacking context; leaving that context is the actual fix.

          Anchored to the trigger rather than the bar's left edge, and flipped upward when there
          is no room below — a `fixed` panel has no parent to hang off. */}
      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              width: POPOVER_WIDTH,
              maxHeight: POPOVER_MAX_HEIGHT,
              // Clamp so a chip near the right edge can't push the panel off-screen.
              left: anchorRect
                ? Math.max(8, Math.min(anchorRect.left, window.innerWidth - POPOVER_WIDTH - 8))
                : 0,
              ...(position === 'bottom'
                ? { top: (anchorRect?.bottom ?? 0) + 4 }
                : { bottom: window.innerHeight - (anchorRect?.top ?? 0) + 4 }),
              // Never paint at the top-left fallback for a frame before measuring.
              visibility: anchorRect ? 'visible' : 'hidden',
            }}
            // z-40, deliberately NOT the z-[100] AddMethodPopover and CreateReferencePopover
            // use. This panel is the only popover in the feature with dropdowns INSIDE it, and
            // Headless UI anchors their option lists to <body> at z-50 (TDropdown). At z-[100]
            // this panel painted over its own open dropdown — worse than the bug it replaced.
            //
            // 40 is the one value that satisfies both constraints: above every sticky table
            // header (z-30, the thing that was covering this panel), below the dropdown lists
            // and below the z-50 dialogs, so a modal still sits over an open popover.
            className="z-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-lg flex flex-col gap-2"
          >
            {onSelectCollateralType && (
              <RHFInputCell
                dropdown={{ label: t('template.collateralType'), group: 'PropertyType' }}
                fieldName="collateralType"
                inputType="select"
                onSelectChange={onSelectCollateralType}
                disabled={isReadOnly}
              />
            )}
            <RHFInputCell
              dropdown={{ label: t('template.template'), group: 'PropertyType' }}
              fieldName={templateFieldName}
              inputType="select"
              options={templateOptions}
              onSelectChange={onSelectTemplate}
              disabled={isReadOnly}
            />
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  onGenerate();
                  setIsOpen(false);
                }}
                className="self-end px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {t('template.generate')}
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
