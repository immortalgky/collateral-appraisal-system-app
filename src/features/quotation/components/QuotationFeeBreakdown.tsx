import type { Control } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import NumberInput from '@/shared/components/inputs/NumberInput';
import type { SubmitQuotationFormValues } from '../schemas/quotation';

const THB = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

/**
 * Round half-away-from-zero to `decimals` places (matches backend rounding).
 */
export function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Derive the three computed fee values for a single appraisal item.
 *
 * Only `feeAmount` is truly required — when it's missing or not a finite number,
 * all three results are NaN so callers can render '—'. Missing discount /
 * negotiatedDiscount / vatPercent are treated as 0 so the net total always
 * reflects what the user can see on screen (e.g. a disabled VAT field whose
 * form value momentarily hasn't flushed from reset).
 */
export function deriveFeeTotals(
  feeAmount: number | undefined,
  discount: number | undefined,
  negotiatedDiscount: number | null | undefined,
  vatPercent: number | undefined,
): { feeAfterDiscount: number; vatAmount: number; netAmount: number } {
  const fa = Number(feeAmount);
  if (!Number.isFinite(fa)) {
    return { feeAfterDiscount: NaN, vatAmount: NaN, netAmount: NaN };
  }

  const toNum = (v: number | null | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const d = toNum(discount);
  const nd = toNum(negotiatedDiscount);
  const vat = toNum(vatPercent);

  const feeAfterDiscount = fa - d - nd;
  const vatAmount = roundHalfAwayFromZero((feeAfterDiscount * vat) / 100, 2);
  const netAmount = feeAfterDiscount + vatAmount;

  return { feeAfterDiscount, vatAmount, netAmount };
}

interface QuotationFeeBreakdownProps {
  control: Control<SubmitQuotationFormValues>;
  /** Zero-based index into `items` array. */
  index: number;
  /** When true, all inputs are disabled (read-only display mode). */
  readOnly?: boolean;
  /** When false, Discount (Negotiate) is disabled — it only applies during an open negotiation round. */
  isNegotiating?: boolean;
}

/**
 * Fee breakdown grid for a single appraisal item inside the quotation form.
 *
 * Editable rows: feeAmount, discount, negotiatedDiscount, vatPercent.
 * Computed (read-only) rows: feeAfterDiscount, vatAmount, netAmount.
 * Computed values re-derive on every render via useWatch — never stored in RHF.
 */
const QuotationFeeBreakdown = ({
  control,
  index,
  readOnly = false,
  isNegotiating = false,
}: QuotationFeeBreakdownProps) => {
  const feeAmount = useWatch({ control, name: `items.${index}.feeAmount` });
  const discount = useWatch({ control, name: `items.${index}.discount` });
  const negotiatedDiscount = useWatch({ control, name: `items.${index}.negotiatedDiscount` });
  const vatPercent = useWatch({ control, name: `items.${index}.vatPercent` });

  const { feeAfterDiscount, vatAmount, netAmount } = deriveFeeTotals(
    feeAmount,
    discount,
    negotiatedDiscount,
    vatPercent,
  );

  const fmt = (v: number) => (isNaN(v) ? '—' : THB.format(v));

  const discountOverflow =
    !isNaN(feeAfterDiscount) && feeAfterDiscount < 0;

  return (
    <div className="space-y-2">
      {/* Fee Amount */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label htmlFor={`fee-amount-${index}`} className="text-sm text-gray-600">
          Fee Amount (THB)
        </label>
        <Controller
          control={control}
          name={`items.${index}.feeAmount`}
          render={({ field }) => (
            <NumberInput
              {...field}
              id={`fee-amount-${index}`}
              aria-label="Fee Amount"
              disabled={readOnly}
              decimalPlaces={2}
              min={0}
            />
          )}
        />
      </div>

      {/* Discount */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label htmlFor={`discount-${index}`} className="text-sm text-gray-600">
          Discount (THB)
        </label>
        <Controller
          control={control}
          name={`items.${index}.discount`}
          render={({ field }) => (
            <NumberInput
              {...field}
              id={`discount-${index}`}
              aria-label="Discount"
              disabled={readOnly}
              decimalPlaces={2}
              min={0}
            />
          )}
        />
      </div>

      {/* Negotiated Discount */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label htmlFor={`neg-discount-${index}`} className="text-sm text-gray-600">
          Discount (Negotiate)
        </label>
        <Controller
          control={control}
          name={`items.${index}.negotiatedDiscount`}
          render={({ field }) => (
            <NumberInput
              {...field}
              id={`neg-discount-${index}`}
              aria-label="Negotiated Discount"
              disabled={!isNegotiating}
              title={!isNegotiating ? 'Only editable during a negotiation round' : undefined}
              decimalPlaces={2}
              min={0}
            />
          )}
        />
      </div>

      {/* ─── Totals block ─────────────────────────────────────────────── */}
      <div className="mt-3 border-t border-gray-200 pt-2 space-y-1">
        {/* Fee After Discount */}
        <div
          className={`grid grid-cols-2 gap-3 items-center px-2.5 py-1.5 rounded ${
            discountOverflow ? 'bg-red-50 border border-red-200' : ''
          }`}
        >
          <span className="text-sm text-gray-600 text-right">Fee After Discount</span>
          <span
            className={`text-sm font-semibold text-right tabular-nums ${
              discountOverflow ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {discountOverflow ? 'Discounts exceed fee' : fmt(feeAfterDiscount)}
          </span>
        </div>

        {/* VAT — show rate and computed amount on one row. Rate is a system setting,
            the NumberInput is retained (hidden) to keep form state hydrated. */}
        <div className="grid grid-cols-2 gap-3 items-center px-2.5 py-1.5">
          <span className="text-sm text-gray-600 text-right">
            VAT ({(Number(vatPercent) || 0).toFixed(2)}%)
          </span>
          <span className="text-sm font-semibold text-gray-900 text-right tabular-nums">
            {fmt(vatAmount)}
          </span>
        </div>
        <Controller
          control={control}
          name={`items.${index}.vatPercent`}
          render={({ field }) => (
            <input
              {...field}
              type="hidden"
              value={field.value ?? ''}
              onChange={() => {}}
            />
          )}
        />

        {/* Net Amount — primary total. Thick top border for emphasis. */}
        <div className="grid grid-cols-2 gap-3 items-center border-t-2 border-primary/30 mt-1 pt-2 px-2.5 py-2 bg-primary/5 rounded-b-lg">
          <span className="text-sm font-semibold text-gray-800 text-right uppercase tracking-wide">
            Net Amount
          </span>
          <span className="text-base font-bold text-primary text-right tabular-nums">
            {fmt(netAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuotationFeeBreakdown;
