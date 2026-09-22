/**
 * MarketReferenceButton
 *
 * A small icon-button that opens MarketReferenceModal for a specific field.
 * Place it inline next to the field's NumberInput.
 *
 * Example (leasehold land value):
 *   <MarketReferenceButton
 *     subjectType={PricingAnalysisSubjectType.LeaseholdLandRef}
 *     anchorId={savedData.analysis.id}
 *     hostMethodId={methodId}
 *     marketSurveys={marketSurveys}
 *     templateList={templateList}
 *     onApplyValue={v => setValue('landValuePerSqWa', v, { shouldDirty: true })}
 *   />
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Icon } from '@/shared/components';
import { MarketReferenceModal, type MarketReferenceModalProps } from './MarketReferenceModal';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGetReferences } from '../api/references';
import type { PricingAnalysisSubjectType } from '../api/references';

// ── Types ─────────────────────────────────────────────────────────────────────

/** All props except isOpen/onClose (managed internally). */
export type MarketReferenceButtonProps = Omit<
  MarketReferenceModalProps,
  'isOpen' | 'onClose' | 'readOnly'
> & {
  /** Override read-only from page context (optional) */
  readOnly?: boolean;
  /** Additional class names for the button */
  className?: string;
  /** Icon-only compact mode (hides the text label; full label shown as tooltip). */
  compact?: boolean;
  /** Override the button label/tooltip (defaults to the generic "Market References"). */
  label?: string;
  /**
   * Called async before the modal opens. Use this to ensure prerequisite state
   * (e.g. auto-saving to obtain an incomeAnalysisId) before rendering the list.
   * If it throws or returns a rejected promise, the modal does NOT open.
   */
  onBeforeOpen?: () => Promise<void> | void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketReferenceButton({
  subjectType,
  anchorId,
  anchorRefKey,
  hostMethodId,
  onApplyValue,
  marketSurveys,
  templateList,
  subjectProperty,
  currentAnchorLabel,
  readOnly: readOnlyProp,
  className,
  compact = false,
  label,
  onBeforeOpen,
}: MarketReferenceButtonProps) {
  const { t } = useTranslation('pricingAnalysis');
  const buttonLabel = label ?? t('marketRef.buttonLabel');
  const isPageReadOnly = usePageReadOnly();
  const isReadOnly = readOnlyProp ?? isPageReadOnly;
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Badge: count saved references so user sees there is existing work
  const { data } = useGetReferences(
    anchorId ? (subjectType as PricingAnalysisSubjectType) : undefined,
    anchorId,
    anchorRefKey,
  );
  const count = data?.references?.length ?? 0;

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={async () => {
          if (onBeforeOpen) {
            setIsPending(true);
            try {
              await onBeforeOpen();
            } catch {
              // onBeforeOpen is responsible for showing its own toast
              setIsPending(false);
              return;
            }
            setIsPending(false);
          }
          setIsOpen(true);
        }}
        className={clsx(
          'relative inline-flex items-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          // compact = the mock's `.refico` (mock:354-358) — a small icon-only affordance
          // marking "this field can come from a reference", not the primary-coloured
          // button the full mode uses. 17x17, no border/fill at rest; accent colours
          // (--accent-wash/--accent-ink) only appear on hover. Decided 20/09/2569 after
          // two earlier passes kept the "WQS" text pill and widened the field instead —
          // the icon is the affordance now, the tooltip carries the meaning.
          compact
            ? 'size-[17px] justify-center rounded-[4px] text-[#94a3b8] hover:bg-[#f0fdfa] hover:text-[#0f766e]'
            : 'gap-1 rounded-lg border border-primary/20 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5 hover:border-primary/40',
          isPending && 'opacity-60 cursor-wait',
          className,
        )}
        title={buttonLabel}
        aria-label={buttonLabel}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1">
            <span className="animate-spin size-3 rounded-full border-2 border-primary/30 border-t-primary" />
            {!compact && <span>{buttonLabel}</span>}
          </span>
        ) : compact ? (
          <Icon name="link" style="solid" className="size-[12px]" />
        ) : (
          <>
            <Icon name="chart-bar" className="size-3" />
            <span>{buttonLabel}</span>
          </>
        )}
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-4 text-[9px] font-bold text-white bg-primary rounded-full">
            {count}
          </span>
        )}
      </button>

      <MarketReferenceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        subjectType={subjectType}
        anchorId={anchorId}
        anchorRefKey={anchorRefKey}
        hostMethodId={hostMethodId}
        onApplyValue={onApplyValue}
        marketSurveys={marketSurveys}
        templateList={templateList}
        subjectProperty={subjectProperty}
        currentAnchorLabel={currentAnchorLabel}
        readOnly={isReadOnly}
      />
    </>
  );
}
