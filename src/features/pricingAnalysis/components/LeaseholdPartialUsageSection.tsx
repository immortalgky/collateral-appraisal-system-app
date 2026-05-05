import { useFormContext, useWatch, useController } from 'react-hook-form';
import type { LeaseholdFormType } from '../schemas/leaseholdForm';
import { calculateRemainingLandArea } from '../domain/calculateLeasehold';
import { useEffect, useMemo } from 'react';

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

  const hasArea = totalLandArea - totalLeaseLandArea > 0;

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Area not covered by the lease agreement</span>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-gray-400">Land Area</div>
            {isPartialUsage ? (
              <div className="flex items-center gap-1 justify-end">
                <div className="text-xs font-medium text-gray-700">
                  {hasArea ? <>{fmt(remaining?.remainingLandArea ?? 0)}</> : totalLandArea}
                  <span className="text-[10px] text-gray-400 ml-0.5">Sq.Wa</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400">-</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-400">Price per Sq.Wa</div>
            <div className="text-xs font-medium text-gray-700">
              {isPartialUsage ? fmt(pricePerSqWaCtrl.field.value ?? landValuePerSqWa) : '-'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-400">Land Price</div>
            <div className="text-sm font-bold text-gray-900">
              {isPartialUsage && remaining ? fmt(remaining.remainingLandPrice) : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
