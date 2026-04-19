import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { Icon } from '@/shared/components';
import { convertLandAreaToTotalSqWa } from '../../domain/convertLandAreaToTotalSqWa';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { floorToThousands, roundToThousand } from '../../domain/calculation';

interface DiscountedCashFlowHighestBestUsedProps {
  isReadOnly?: boolean;
}

const fmt = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n) || n === 0) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function DiscountedCashFlowHighestBestUsed({ isReadOnly }: DiscountedCashFlowHighestBestUsedProps) {
  const { control, getValues, setValue } = useFormContext();
  const isHighestBestUsed = useWatch({ control, name: 'isHighestBestUsed' });
  const finalValue = useWatch({ control, name: 'finalValue' });
  const finalValueAdjust = useWatch({ control, name: 'finalValueAdjust' });
  const totalWa = useWatch({ control, name: 'highestBestUsed.totalWa' });
  const pricePerSqWa = useWatch({ control, name: 'highestBestUsed.pricePerSqWa' });
  const totalLandValue = useWatch({ control, name: 'highestBestUsed.totalValue' });
  const appraisalPrice = useWatch({ control, name: 'appraisalPrice' });
  const appraisalPriceRounded = useWatch({ control, name: 'appraisalPriceRounded' });

  // `finalValueAdjust` lifecycle:
  //   - Page load: keep API value (skip seed if non-empty).
  //   - First non-zero `finalValue` after empty form: seed from
  //     roundToThousand(finalValue).
  //   - Cashflow table edit (preview returns a new finalValue with a different
  //     rounded value): recalc to the new auto.
  //   - User typing in `finalValueAdjust`: doesn't change `finalValue`, so the
  //     effect doesn't re-fire — override sticks.
  //   - Save round-trip: `finalValue` returns the same rounded value, so the
  //     ref-equality check skips the recalc — saved override sticks.
  // Comparing on the rounded value (not raw) protects against floating-point
  // drift between successive recomputes returning the same canonical number.
  const lastFinalValueRoundedRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const finalValueNum = toNumber(finalValue);
    if (finalValueNum == null || finalValueNum === 0) return;
    const rounded = roundToThousand(finalValueNum);

    if (lastFinalValueRoundedRef.current === undefined) {
      lastFinalValueRoundedRef.current = rounded;
      const curr = toNumber(getValues('finalValueAdjust'));
      if (curr == null || curr === 0) {
        setValue('finalValueAdjust', rounded, { shouldDirty: false });
      }
      return;
    }

    if (rounded === lastFinalValueRoundedRef.current) return;
    lastFinalValueRoundedRef.current = rounded;
    setValue('finalValueAdjust', rounded, { shouldDirty: false });
  }, [finalValue, getValues, setValue]);

  // `appraisalPriceRounded` follows the same shape, triggered by the cascade-
  // computed `appraisalPrice`. Typing into `appraisalPriceRounded` itself does
  // not affect `appraisalPrice`, so the effect doesn't re-fire — override
  // sticks. Any of: cashflow table edit, HBU toggle, HBU/land area edit, or
  // `finalValueAdjust` user edit will shift `appraisalPrice` and recalc this.
  const lastAppraisalPriceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const appraisalPriceNum = toNumber(appraisalPrice);
    if (appraisalPriceNum == null || appraisalPriceNum === 0) return;

    if (lastAppraisalPriceRef.current === undefined) {
      lastAppraisalPriceRef.current = appraisalPriceNum;
      const curr = toNumber(getValues('appraisalPriceRounded'));
      if (curr == null || curr === 0) {
        setValue('appraisalPriceRounded', appraisalPriceNum, { shouldDirty: false });
      }
      return;
    }

    if (appraisalPriceNum === lastAppraisalPriceRef.current) return;
    lastAppraisalPriceRef.current = appraisalPriceNum;
    setValue('appraisalPriceRounded', appraisalPriceNum, { shouldDirty: false });
  }, [appraisalPrice, getValues, setValue]);

  const rules: DerivedFieldRule[] = [
    {
      targetPath: 'highestBestUsed.totalWa',
      deps: ['highestBestUsed.areaRai', 'highestBestUsed.areaNgan', 'highestBestUsed.areaWa'],
      compute: ({ getValues }) => {
        const areaRai = toNumber(getValues('highestBestUsed.areaRai')) ?? 0;
        const areaNgan = toNumber(getValues('highestBestUsed.areaNgan')) ?? 0;
        const areaWa = toNumber(getValues('highestBestUsed.areaWa')) ?? 0;
        return convertLandAreaToTotalSqWa(areaRai, areaNgan, areaWa);
      },
    },
    {
      targetPath: 'highestBestUsed.totalValue',
      deps: ['highestBestUsed.totalWa', 'highestBestUsed.pricePerSqWa'],
      compute: ({ getValues }) => {
        const pricePerSqWa = toNumber(getValues('highestBestUsed.pricePerSqWa')) ?? 0;
        const totalWa = toNumber(getValues('highestBestUsed.totalWa')) ?? 0;
        return pricePerSqWa * totalWa;
      },
    },
    {
      targetPath: 'appraisalPrice',
      deps: ['finalValueAdjust', 'finalValueRounded', 'isHighestBestUsed', 'highestBestUsed.totalValue'],
      compute: ({ getValues }) => {
        const isHbu = getValues('isHighestBestUsed') ?? false;
        // HBU=Yes: building IS the highest-and-best-use, so appraisal anchors to
        // the always-auto Final Value (Rounded). The editable Final Value
        // (Adjust) input is hidden in this mode.
        if (isHbu) {
          return toNumber(getValues('finalValueRounded')) ?? 0;
        }
        // HBU=No: appraisal = Final Value (Adjust) + Land Value (when entered).
        const finalValueAdjust = toNumber(getValues('finalValueAdjust')) ?? 0;
        const totalLandValue = toNumber(getValues('highestBestUsed.totalValue')) ?? 0;
        if (totalLandValue > 0) {
          return floorToThousands(finalValueAdjust + totalLandValue);
        }
        return finalValueAdjust;
      },
    },
  ];
  useDerivedFields({ rules });

  const computedAppraisal = Number(appraisalPrice) || 0;
  const overrideAppraisal = Number(appraisalPriceRounded) || 0;
  const diff = overrideAppraisal - computedAppraisal;
  const diffPct = computedAppraisal !== 0 ? ((diff / computedAppraisal) * 100).toFixed(1) : '0.0';
  const showDiff = diff !== 0 && computedAppraisal !== 0;
  const diffColor = diff > 0 ? 'text-green-600' : 'text-red-600';
  const diffBg = diff > 0 ? 'bg-green-100' : 'bg-red-100';
  const diffIcon = diff > 0 ? 'arrow-up' : 'arrow-down';

  const finalAdjustNum = toNumber(finalValueAdjust) ?? 0;
  const landValueNum = toNumber(totalLandValue) ?? 0;
  const showLandRow = !isHighestBestUsed && landValueNum > 0;

  return (
    <div className="flex flex-col text-sm">
      {/* ── Header row: toggle on left, compact summary stats on right ──── */}
      <div className="flex items-center gap-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-4 flex-1">
          <span className="font-medium text-gray-800">Highest and Best Used</span>
          <RHFInputCell
            fieldName={'isHighestBestUsed'}
            inputType="toggle"
            disabled={isReadOnly}
            toggle={{ checked: isHighestBestUsed, options: ['No', 'Yes'] }}
            onUserChange={e => {
              if (!e) {
                setValue('highestBestUsed.areaRai', null);
                setValue('highestBestUsed.areaNgan', null);
                setValue('highestBestUsed.areaWa', null);
                setValue('highestBestUsed.pricePerSqWa', null);
                setValue('highestBestUsed.totalWa', null);
                setValue('highestBestUsed.totalValue', null);
              }
              return e;
            }}
          />
        </div>
        {!isHighestBestUsed && (
          <div className="flex items-start gap-8 text-right">
            <HbuStat label="Land Area" value={`${fmt(toNumber(totalWa))} Sq.Wa`} />
            <HbuStat label="Price per Sq.Wa" value={fmt(toNumber(pricePerSqWa))} />
            <HbuStat label="Land Value" value={fmt(landValueNum)} strong />
          </div>
        )}
      </div>

      {/* ── Area inputs (only when HBU=No) ─────────────────────────────── */}
      {!isHighestBestUsed && (
        <div className="flex flex-row items-end gap-1.5 py-3 border-b border-gray-200">
          <div className="w-32">
            <RHFInputCell
              fieldName={'highestBestUsed.areaRai'}
              inputType="number"
              disabled={isReadOnly}
              number={{ label: 'Rai', decimalPlaces: 0, maxIntegerDigits: 5, allowNegative: false }}
            />
          </div>
          <div className="w-32">
            <RHFInputCell
              fieldName={'highestBestUsed.areaNgan'}
              inputType="number"
              disabled={isReadOnly}
              number={{ label: 'Ngan', decimalPlaces: 0, maxIntegerDigits: 1, maxValue: 3, allowNegative: false }}
            />
          </div>
          <div className="w-32">
            <RHFInputCell
              fieldName={'highestBestUsed.areaWa'}
              inputType="number"
              disabled={isReadOnly}
              number={{ label: 'Wa', decimalPlaces: 2, maxIntegerDigits: 3, allowNegative: false }}
            />
          </div>
          <div className="w-44 ml-4">
            <RHFInputCell
              fieldName={'highestBestUsed.pricePerSqWa'}
              inputType="number"
              disabled={isReadOnly}
              number={{ label: 'Price/ Sq.Wa', decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
            />
          </div>
        </div>
      )}

      {/* ── Derivation rows ─────────────────────────────────────────────── */}
      {!isHighestBestUsed ? (
        <>
          <HbuDerivationRow label="Final Value (Adjust)">
            <div className="w-44">
              <RHFInputCell
                fieldName={'finalValueAdjust'}
                inputType="number"
                disabled={isReadOnly}
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
              />
            </div>
          </HbuDerivationRow>
          {showLandRow && (
            <HbuDerivationRow label="+ Land Value" value={fmt(landValueNum)} />
          )}
          <HbuDerivationRow
            label="= Appraisal Price (Computed)"
            value={fmt(computedAppraisal)}
            muted
          />
        </>
      ) : (
        <HbuDerivationRow
          label="Final Value (Rounded)"
          value={fmt(finalAdjustNum || computedAppraisal)}
        />
      )}

      {/* ── Final Appraisal Price row ───────────────────────────────────── */}
      <div className="flex items-center gap-4 py-3 mt-1">
        <span className="font-semibold text-gray-800 flex-1">Appraisal Price</span>
        {showDiff && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${diffColor} ${diffBg} shrink-0`}
          >
            <Icon name={diffIcon} style="solid" className="size-2.5" />
            {Math.abs(diff).toLocaleString()} ({diff > 0 ? '+' : ''}
            {diffPct}%)
          </span>
        )}
        <div className="w-44 [&_input]:text-green-700 [&_input]:font-bold [&_input]:text-right [&_input]:text-sm">
          <RHFInputCell
            fieldName={'appraisalPriceRounded'}
            inputType="number"
            disabled={isReadOnly}
            number={{
              decimalPlaces: 2,
              maxIntegerDigits: 15,
              maxValue: 999_999_999_999_999.0,
              allowNegative: false,
            }}
          />
        </div>
        <span className="text-gray-500 w-12 shrink-0">Baht</span>
      </div>
    </div>
  );
}

function HbuStat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span
        className={`tabular-nums ${strong ? 'text-gray-900 font-semibold' : 'text-gray-800'}`}
      >
        {value}
      </span>
    </div>
  );
}

function HbuDerivationRow({
  label,
  value,
  children,
  muted = false,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-gray-100">
      <span className={`flex-1 ${muted ? 'text-gray-600' : 'text-gray-700'}`}>{label}</span>
      {children ?? (
        <span className="tabular-nums font-medium text-gray-800 text-right">{value}</span>
      )}
      <span className="text-gray-400 text-xs w-12 shrink-0">Baht</span>
    </div>
  );
}
