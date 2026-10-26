import type { CompanyQuotationItemDto } from '../schemas/quotation';
import { deriveFeeTotals } from '../components/QuotationFeeBreakdown';

/** Per-appraisal fee = the winner's per-item net amount (after discount, negotiated discount, and VAT). */
export function itemNetFee(item: CompanyQuotationItemDto): number {
  const { netAmount } = deriveFeeTotals(
    item.feeAmount,
    item.discount,
    item.negotiatedDiscount,
    item.vatPercent,
  );
  if (Number.isFinite(netAmount) && netAmount > 0) return netAmount;
  return item.quotedPrice ?? 0;
}
