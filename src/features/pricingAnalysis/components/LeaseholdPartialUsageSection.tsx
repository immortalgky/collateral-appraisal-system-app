import { useFormContext, useWatch, useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { LeaseholdFormType } from '../schemas/leaseholdForm';
import { calculateRemainingLandArea } from '../domain/calculateLeasehold';
import { useEffect, useMemo } from 'react';
import { KvRow } from './KvRow';
import { DisplayValueRow } from './SummaryValueCard';

interface LeaseholdPartialUsageSectionProps {
  finalValueRounded: number;
  landValuePerSqWa: number;
  totalLeaseLandArea: number;
  totalLandArea: number;
  onEstimateChange?: (estimateRounded: number, estimateNet: number | null) => void;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function LeaseholdPartialUsageSection({
  finalValueRounded,
  landValuePerSqWa,
  totalLeaseLandArea,
  totalLandArea,
  onEstimateChange,
}: LeaseholdPartialUsageSectionProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { control, setValue } = useFormContext<LeaseholdFormType>();
  const isPartialUsage = useWatch({ control, name: 'isPartialUsage' });

  const pricePerSqWaCtrl = useController({ control, name: 'pricePerSqWa' });

  useEffect(() => {
    if (landValuePerSqWa > 0 && !pricePerSqWaCtrl.field.value) {
      setValue('pricePerSqWa', landValuePerSqWa, { shouldDirty: true });
    }
  }, [isPartialUsage, landValuePerSqWa, pricePerSqWaCtrl.field.value, setValue]);

  const remaining = useMemo(() => {
    return calculateRemainingLandArea({
      finalValue: finalValueRounded,
      totalLeaseLandArea: totalLeaseLandArea ?? 0,
      totalLandArea: totalLandArea ?? 0,
      pricePerSqWa: pricePerSqWaCtrl.field.value ?? 0,
    });
  }, [finalValueRounded, totalLeaseLandArea, totalLandArea, pricePerSqWaCtrl.field.value]);

  useEffect(() => {
    if (!isPartialUsage) return;
    onEstimateChange?.(
      remaining ? remaining.estimatePriceRounded : 0,
      remaining ? remaining.estimateNetPrice : null,
    );
  }, [remaining, onEstimateChange, isPartialUsage]);

  if (!isPartialUsage || !remaining) return null;

  // mock:2838-2840 — three rows inside the value card that show how the PV becomes the
  // indicated value, replacing the strip that used to sit above the cards. The calculation
  // above (calculateRemainingLandArea → onEstimateChange) is unchanged; only the rendering moved.
  const price = pricePerSqWaCtrl.field.value ?? landValuePerSqWa;
  return (
    <>
      <DisplayValueRow
        label={
          <>
            {t('methodTabs.partialUsage.estimateFromPv')}{' '}
            <span className="text-[10.5px] text-gray-400">
              {t('methodTabs.partialUsage.roundedThousand')}
            </span>
          </>
        }
        value={finalValueRounded}
      />
      <KvRow
        label={<span className="pl-3">{t('methodTabs.partialUsage.plusUncovered')}</span>}
        value={
          <span className="tabular-nums">
            <span className="text-[11px] text-gray-400">
              {t('methodTabs.partialUsage.uncoveredWorking', {
                area: fmt(remaining.remainingLandArea),
                price: fmt(price),
              })}{' '}
              ={' '}
            </span>
            <span className="font-semibold text-gray-800">{fmt(remaining.remainingLandPrice)}</span>
          </span>
        }
        unit={t('finalValue.baht')}
      />
      <DisplayValueRow
        label={<span className="font-semibold">{t('methodTabs.partialUsage.total')}</span>}
        value={remaining.estimateNetPrice}
      />
    </>
  );
}
