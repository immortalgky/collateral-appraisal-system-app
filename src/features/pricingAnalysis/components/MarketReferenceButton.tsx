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
}: MarketReferenceButtonProps) {
  const { t } = useTranslation('pricingAnalysis');
  const isPageReadOnly = usePageReadOnly();
  const isReadOnly = readOnlyProp ?? isPageReadOnly;
  const [isOpen, setIsOpen] = useState(false);

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
        onClick={() => setIsOpen(true)}
        className={clsx(
          'relative inline-flex items-center gap-1 px-2 py-1 text-xs font-medium',
          'text-primary border border-primary/20 rounded-lg',
          'hover:bg-primary/5 hover:border-primary/40 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          className,
        )}
        title={t('marketRef.buttonLabel')}
        aria-label={t('marketRef.buttonLabel')}
      >
        <Icon name="chart-bar" className="size-3" />
        <span>{t('marketRef.buttonLabel')}</span>
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
