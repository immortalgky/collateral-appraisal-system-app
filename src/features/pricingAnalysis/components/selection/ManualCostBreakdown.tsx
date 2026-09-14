import { Icon } from '@/shared/components';
import { NumberInput } from '@/shared/components/inputs';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import type { ManualCostBreakdownContext, Method } from '../../types/selection';

const LAND_RATE_DEBOUNCE_MS = 1000;

/** Match the rounding the appraiser applies by hand on the calculated Cost path. */
const roundToThousand = (value: number) => Math.round(value / 1000) * 1000;

const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ManualCostBreakdownProps {
  approachType: string;
  method: Method;
  context: ManualCostBreakdownContext;
  /** Pushes the derived total into the price input the appraiser can still round by hand. */
  onTotalChange: (total: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Land-rate entry for a Cost-approach method priced by hand.
 *
 * The appraiser types one number — the land price per square wa. Everything under it is derived:
 * area comes from the title deeds, the building figure from the depreciation schedule, and the
 * total is their sum. That is the same set of figures the calculated Cost path stores, and storing
 * them is what makes the appraisal summary print ที่ดิน and สิ่งปลูกสร้าง as separate rows instead
 * of one combined line.
 */
export const ManualCostBreakdown = ({
  approachType,
  method,
  context,
  onTotalChange,
  disabled = false,
  compact = false,
}: ManualCostBreakdownProps) => {
  const { t } = useTranslation('pricingAnalysis');
  const isReadOnly = usePageReadOnly();
  const [rateInput, setRateInput] = useState<number | null>(method.landRatePerSqWa ?? null);
  const debouncedRate = useDebounce(rateInput, LAND_RATE_DEBOUNCE_MS);

  const landArea = context.landAreaInSqWa ?? 0;
  const buildingValue = context.buildingValue ?? 0;
  const landValue = (rateInput ?? 0) * landArea;
  const total = landValue + buildingValue;

  const { onLandRateSync } = context;
  const methodType = method.methodType;
  const methodId = method.id;
  const savedRate = method.landRatePerSqWa ?? null;
  const savedRateRef = useRef(savedRate);
  savedRateRef.current = savedRate;

  // Same shape as the price input's debounce: push into the reducer once typing settles, and
  // no-op afterwards because the saved rate has caught up with what was typed. Compares against
  // a ref (not method.landRatePerSqWa directly) so an external reset — a calc-mode toggle
  // clearing the rate — can't make this re-fire and push the stale pre-toggle rate right back.
  useEffect(() => {
    if (debouncedRate === savedRateRef.current) return;
    if (debouncedRate != null && debouncedRate < 0) return;
    onLandRateSync({ approachType, methodType, rate: debouncedRate, methodId });
  }, [debouncedRate, onLandRateSync, approachType, methodType, methodId]);

  // Adopt external resets (calc-mode toggle clearing the rate) back into the local input —
  // without this the field keeps showing whatever was typed before the toggle.
  useEffect(() => {
    setRateInput(prev => (prev === savedRate ? prev : savedRate));
  }, [savedRate]);

  const handleChange = (e: { target: { name?: string; value: number | null } }) => {
    const next = e.target.value;
    setRateInput(next);
    if (next != null && next < 0) return;
    // Re-derive the price the moment the rate moves. The appraiser can still overwrite it in the
    // price field afterwards — that rounded figure is the group total, and rounding is their call.
    onTotalChange(roundToThousand((next ?? 0) * landArea + buildingValue));
  };

  const handleBlur = () => {
    if (rateInput === savedRate) return;
    if (rateInput != null && rateInput < 0) return;
    onLandRateSync({ approachType, methodType, rate: rateInput, methodId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setRateInput(savedRate);
      (e.target as HTMLInputElement).blur();
    }
  };

  const rowClass = clsx(
    'flex items-center justify-between gap-3 border-t border-gray-100 tabular-nums',
    compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs',
  );

  return (
    <div className={clsx('flex flex-col', compact ? 'mt-1.5' : 'mt-2')}>
      <div className={clsx('flex items-center justify-between gap-3', compact ? 'pb-1' : 'pb-1.5')}>
        <span className={clsx('font-medium text-gray-700', compact ? 'text-[11px]' : 'text-xs')}>
          {t('manualCost.landRate')}
        </span>
        {isReadOnly ? (
          <span className="text-xs font-semibold text-gray-800 tabular-nums">
            {formatMoney(savedRate ?? 0)}
          </span>
        ) : (
          <NumberInput
            value={rateInput}
            disabled={disabled}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            decimalPlaces={2}
            placeholder="0.00"
            fullWidth={false}
            className={compact ? 'w-32' : 'w-36'}
            rightIcon={<Icon name="baht-sign" style="light" className="size-3" />}
          />
        )}
      </div>

      <div className={rowClass}>
        <span className="text-gray-500">{t('manualCost.landArea')}</span>
        <span className="text-gray-700">
          {landArea.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className={rowClass}>
        <span className="text-gray-500">{t('manualCost.landValue')}</span>
        <span className="text-gray-700">{formatMoney(landValue)}</span>
      </div>
      <div className={rowClass}>
        <span className="text-gray-500">{t('manualCost.buildingValue')}</span>
        <span className="text-gray-700">{formatMoney(buildingValue)}</span>
      </div>
      <div className={clsx(rowClass, 'border-gray-300 font-semibold')}>
        <span className="text-gray-600">{t('manualCost.total')}</span>
        <span className="text-gray-900">{formatMoney(total)}</span>
      </div>

      {buildingValue === 0 && (
        <p className={clsx('mt-1.5 text-amber-700', compact ? 'text-[10px]' : 'text-[11px]')}>
          {t('manualCost.noBuildingSchedule')}
        </p>
      )}
    </div>
  );
};
