/**
 * Short method-type code shown as a badge before a method's name — mock's `.code` chip
 * (mock:325/3200/3246), `METHODS[m].code ?? m` with `m` the mock's own short code (WQS/SAG/DC/...).
 * There's no `code` field on our method config (pricingAnalysis.config.json) or on the backend's
 * per-reference method DTOs, so this hand-maps every `methodType` string either side of the board
 * is known to use down to the short code the mock shows.
 *
 * Supersedes GroupReferencesSection's old `methodTypeBadge()` (WQS/SaleGrid/DirectComparison plus
 * their `_MARKET` siblings only) — those three are folded in below so the reference value column
 * keeps reading the same codes it always did.
 */
const METHOD_CODE: Record<string, string> = {
  WQS_MARKET: 'WQS',
  WQS_COST: 'WQS',
  WQS: 'WQS',
  SAG_MARKET: 'SAG',
  SAG_COST: 'SAG',
  SaleGrid: 'SAG',
  DC_MARKET: 'DC',
  DC_COST: 'DC',
  DirectComparison: 'DC',
  BC: 'BC',
  PR: 'PR',
  LH: 'LH',
  MC_COST: 'MC',
  I: 'DCF',
  Hypothesis: 'HYP',
};

export function getMethodCode(methodType: string): string {
  return METHOD_CODE[methodType] ?? methodType;
}
