import { NumberInput } from '@/shared/components/inputs';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
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
  // Land only — `context.buildingValue` is deliberately not read here.
  //
  // This block renders solely for a method whose role is Land (see showCostBreakdown in
  // PricingAnalysisMethodBoardRow), and a Land-role method's value is the land. Folding the
  // group's building total in made it produce land + building while still being tagged as
  // covering only Land, so the Cost approach added the building again through whichever method
  // actually covers it — the same double-count the board's formula row warns about, reached from
  // the other direction and with nothing on screen to show it had happened.
  //
  // Rounded to whole baht, the same way the backend rounds before storing it
  // (PricingAnalysisMethod.ApplyLandAreaValue / SetManualCostBreakdownCommandHandler): the title
  // area carries two decimals, so rate × area lands on satang nobody typed — and this figure is
  // what gets saved, printed in the book and exported.
  const landValue = Math.round((rateInput ?? 0) * landArea);

  const { onLandRateSync } = context;
  const methodType = method.methodType;
  const methodId = method.id;
  const savedRate = method.landRatePerSqWa ?? null;

  // Same shape as the price input's debounce: push into the reducer once typing settles, and
  // no-op afterwards because the saved rate has caught up with what was typed.
  useEffect(() => {
    if (debouncedRate === savedRate) return;
    onLandRateSync({ approachType, methodType, rate: debouncedRate, methodId });
  }, [debouncedRate, savedRate, onLandRateSync, approachType, methodType, methodId]);

  const handleChange = (e: { target: { name?: string; value: number | null } }) => {
    const next = e.target.value;
    setRateInput(next);
    // Re-derive the price the moment the rate moves. The appraiser can still overwrite it in the
    // price field afterwards — that rounded figure is this method's value, and rounding is
    // their call.
    //
    // Rounded to whole baht first, exactly as the land figure above and as the backend stores it,
    // and only then to the thousand: rounding the raw product in one step would round off a
    // number that is never shown anywhere, and 55,925,499.63 lands a thousand below the
    // 55,925,500 the card prints.
    onTotalChange(roundToThousand(Math.round((next ?? 0) * landArea)));
  };

  const handleBlur = () => {
    if (rateInput === savedRate) return;
    onLandRateSync({ approachType, methodType, rate: rateInput, methodId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setRateInput(savedRate);
      (e.target as HTMLInputElement).blur();
    }
  };

  // One line, read left to right as the arithmetic it is: rate × area = land value. It replaced a
  // five-row vertical table (rate, area, land value, building value, total) whose only editable
  // cell was the first — four of the five rows restated figures the sentence now carries inline,
  // and the row it dropped entirely was the building one, which this method has no business
  // pricing (see landValue above).
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums',
        compact ? 'mt-1.5 text-[11px]' : 'mt-2 text-xs',
      )}
    >
      <span className={clsx('font-medium text-gray-700', compact ? 'text-[11px]' : 'text-xs')}>
        {t('manualCost.landRate')}
      </span>

      {isReadOnly ? (
        <span className="font-semibold text-gray-800">{formatMoney(savedRate ?? 0)}</span>
      ) : (
        // Same three props as the method row's own value input directly above this one
        // (PricingAnalysisMethodBoardRow) — `dense`, `fullWidth={false}`, `w-32` — so the two
        // boxes are the same object seen twice rather than two boxes that happen to be near
        // each other. `dense` is what carries the mock's `.in` treatment: 21px tall, 4px
        // radius, quiet #f6f9f9 fill, border appearing only on hover/focus.
        //
        // No rightIcon: it would add `pr-12` and push the figure 48px off the right edge, which
        // is the whole visible difference between these two boxes. The unit is already stated
        // in the label to the left ("ราคาที่ดิน / ตร.ว."), so a ฿ here was repeating it at the
        // cost of the alignment.
        <NumberInput
          dense
          value={rateInput}
          disabled={disabled}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          decimalPlaces={2}
          placeholder="0.00"
          fullWidth={false}
          className="w-32"
        />
      )}

      <span className="text-gray-500">
        ×{' '}
        {landArea.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{' '}
        {t('manualCost.sqWaUnit')}
      </span>

      <span className="text-gray-400">=</span>

      <span className="text-gray-500">
        {/* Reuses the board's own role label, so this word and the role chip on the row above can
            never drift apart. */}
        {t('board.role.Land')}{' '}
        <b className="font-semibold text-gray-800">
          {/* No forced decimals: the figure is a product, and the image this follows shows a whole
              number as a whole number. A rate with satang still shows its own precision rather
              than being silently rounded into the sentence. */}
          {landValue.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </b>
      </span>
    </div>
  );
};
