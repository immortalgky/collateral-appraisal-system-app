import type { Control, UseFormRegister } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
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
 * Returns NaN when inputs are incomplete so callers can render '—'.
 */
export function deriveFeeTotals(
  feeAmount: number | undefined,
  discount: number | undefined,
  negotiatedDiscount: number | null | undefined,
  vatPercent: number | undefined,
): { feeAfterDiscount: number; vatAmount: number; netAmount: number } {
  const fa = feeAmount ?? NaN;
  const d = discount ?? NaN;
  const nd = negotiatedDiscount ?? 0;
  const vat = vatPercent ?? NaN;

  const feeAfterDiscount = fa - d - nd;
  const vatAmount = roundHalfAwayFromZero((feeAfterDiscount * vat) / 100, 2);
  const netAmount = feeAfterDiscount + vatAmount;

  return { feeAfterDiscount, vatAmount, netAmount };
}

const inputCls =
  'w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-50 disabled:text-gray-500';

interface QuotationFeeBreakdownProps {
  control: Control<SubmitQuotationFormValues>;
  register: UseFormRegister<SubmitQuotationFormValues>;
  /** Zero-based index into `items` array. */
  index: number;
  /** When true, all inputs are disabled (read-only display mode). */
  readOnly?: boolean;
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
  register,
  index,
  readOnly = false,
}: QuotationFeeBreakdownProps) => {
  const feeAmount = useWatch({ control, name: `items.${index}.feeAmount` });
  const discount = useWatch({ control, name: `items.${index}.discount` });
  const negotiatedDiscount = useWatch({ control, name: `items.${index}.negotiatedDiscount` });
  const vatPercent = useWatch({ control, name: `items.${index}.vatPercent` });

  const { feeAfterDiscount, netAmount } = deriveFeeTotals(
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
        <input
          id={`fee-amount-${index}`}
          type="number"
          step="0.01"
          min="0"
          disabled={readOnly}
          aria-label="Fee Amount"
          className={inputCls}
          placeholder="0.00"
          {...register(`items.${index}.feeAmount`, { valueAsNumber: true })}
        />
      </div>

      {/* Discount */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label htmlFor={`discount-${index}`} className="text-sm text-gray-600">
          Discount (THB)
        </label>
        <input
          id={`discount-${index}`}
          type="number"
          step="0.01"
          min="0"
          disabled={readOnly}
          aria-label="Discount"
          className={inputCls}
          placeholder="0.00"
          {...register(`items.${index}.discount`, { valueAsNumber: true })}
        />
      </div>

      {/* Negotiated Discount */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label htmlFor={`neg-discount-${index}`} className="text-sm text-gray-600">
          Discount (Negotiate)
        </label>
        <input
          id={`neg-discount-${index}`}
          type="number"
          step="0.01"
          min="0"
          disabled={readOnly}
          aria-label="Negotiated Discount"
          className={inputCls}
          placeholder="0.00"
          {...register(`items.${index}.negotiatedDiscount`, { valueAsNumber: true })}
        />
      </div>

      {/* Computed: Fee After Discount */}
      <div
        className={`grid grid-cols-2 gap-3 items-center rounded-lg px-2.5 py-1.5 ${
          discountOverflow ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
        }`}
      >
        <span className="text-sm text-gray-500">Fee After Discount</span>
        <span
          className={`text-sm font-medium ${
            discountOverflow ? 'text-red-600' : 'text-gray-800'
          }`}
        >
          {discountOverflow ? 'Discounts exceed fee' : fmt(feeAfterDiscount)}
        </span>
      </div>

      {/* VAT % */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label htmlFor={`vat-percent-${index}`} className="text-sm text-gray-600">
          VAT %
        </label>
        <input
          id={`vat-percent-${index}`}
          type="number"
          step="0.01"
          min="0"
          max="100"
          disabled={readOnly}
          aria-label="VAT Percent"
          className={inputCls}
          placeholder="7"
          {...register(`items.${index}.vatPercent`, { valueAsNumber: true })}
        />
      </div>

      {/* Computed: Net Amount */}
      <div className="grid grid-cols-2 gap-3 items-center bg-primary/5 rounded-lg px-2.5 py-2 border border-primary/20">
        <span className="text-sm font-semibold text-gray-700">Net Amount</span>
        <span className="text-sm font-bold text-primary">{fmt(netAmount)}</span>
      </div>
    </div>
  );
};

export default QuotationFeeBreakdown;
