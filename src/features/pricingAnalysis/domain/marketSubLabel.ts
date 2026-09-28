import type { TFunction } from 'i18next';

// Every caller (ComparativeFactorTable.tsx, WQSScoringSection.tsx, …) binds its own `t`
// via `useTranslation('pricingAnalysis')` — the keys below (`comparativeAnalysis.*`) only
// exist in that namespace. A generic `TFunction` type-checks against i18next's default
// namespace instead, which doesn't have these keys and fails silently at the call sites
// in *this* file even though every caller's own `t` is correctly scoped. Same failure
// shape as passing `any`: it compiles, but stops catching a renamed/missing key.
type PricingAnalysisTFn = TFunction<'pricingAnalysis'>;

/**
 * Minimal shape both `MarketComparableDataType` and `MarketComparableDetailType` satisfy
 * structurally — these three label helpers only ever read these five fields, so either
 * survey type can be passed without a cast. Extracted from `ComparativeFactorTable.tsx`
 * (the data tab, which had this right) so the calc tab's market headers
 * (`WQSScoringSection.tsx` and friends) stop carrying a second, subtly different copy —
 * the first split produced a local `marketDateLabel` that silently dropped the
 * `infoDateTime` fallback and always rendered an empty date.
 */
interface MarketSubLabelSurvey {
  salePrice?: unknown;
  saleDate?: string | null;
  infoDateTime?: string | null;
  offerPriceUnit?: string | null;
  salePriceUnit?: string | null;
}

/** "ประกาศขาย" vs "ซื้อขายจริง" — display only, derived from which price field the survey carries. */
export function marketKindLabel(survey: MarketSubLabelSurvey, t: PricingAnalysisTFn): string {
  return survey.salePrice != null
    ? t('comparativeAnalysis.marketKind.actualSale')
    : t('comparativeAnalysis.marketKind.listing');
}

export function marketDateLabel(survey: MarketSubLabelSurvey, dateFormatter: Intl.DateTimeFormat): string {
  const date = survey.saleDate ?? survey.infoDateTime;
  return date ? dateFormatter.format(new Date(date)) : '—';
}

/**
 * Raw unit code behind `marketUnitLabel`'s display text. Exported on its own so
 * `detectPriceUnitMixed.ts`'s market-header majority vote reads the exact same field
 * pick as the text it colours, instead of a second copy that could silently drift —
 * `marketUnitLabel` picks unit-presence-first (`offerPriceUnit ?? salePriceUnit`),
 * which is NOT the same rule as `detectPriceUnitMixed`'s own price-truthiness-gated
 * pick over the calculation-row fields (mirrors the backend's DetectPriceUnit). The
 * two fields are the same underlying data under different names (confirmed via
 * `adapters/sync*FormSurveys.ts`, a literal `offeringPriceMeasurementUnit:
 * survey.offerPriceUnit ?? ''` copy) but the two *rules* can disagree on a row
 * where the offer price is 0 with an offer unit still set, or vice versa — flagged
 * to the user rather than picked silently, since only one of the two should end up
 * governing both the warning strip and the header highlight long-term.
 */
export function surveyUnit(
  survey: Pick<MarketSubLabelSurvey, 'offerPriceUnit' | 'salePriceUnit'>,
): string | null {
  return survey.offerPriceUnit ?? survey.salePriceUnit ?? null;
}

// "/ตร.ว." / "/ตร.ม." for a per-unit price, "เหมา" (lump sum) otherwise — see
// WQSAdjustFinalValueSection.tsx's `detectedUnit` for the same PerSqWa/PerSqm/else split
// over the same underlying field.
export function marketUnitLabel(survey: MarketSubLabelSurvey, t: PricingAnalysisTFn): string {
  const unit = surveyUnit(survey);
  if (unit === 'PerSqWa') return t('comparativeAnalysis.unitPerSqWaShort');
  if (unit === 'PerSqm') return t('comparativeAnalysis.unitPerSqmShort');
  return t('comparativeAnalysis.unitLumpSumShort');
}
