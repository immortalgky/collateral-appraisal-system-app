interface SummableItem {
  feeAmount?: number | null;
  discount?: number | null;
  negotiatedDiscount?: number | null;
  estimatedDays?: number | null;
}

/**
 * A company's quotation figures over its items: total fee, total discount (the quoted one plus any
 * negotiated one) and total estimated man-days. Whether the company has replied at all is the
 * caller's call: an empty list sums to 0 here.
 */
export function sumQuotationItems(items: SummableItem[]) {
  return {
    totalFeeAmount: items.reduce((sum, i) => sum + (i.feeAmount ?? 0), 0),
    totalDiscount: items.reduce(
      (sum, i) => sum + (i.discount ?? 0) + (i.negotiatedDiscount ?? 0),
      0,
    ),
    totalEstimateManday: items.reduce((sum, i) => sum + (i.estimatedDays ?? 0), 0),
  };
}
