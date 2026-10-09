import { surveyUnit } from './marketSubLabel';

/**
 * Display-only companion to each method's own `detectPriceUnit` (WQS/SAG/DC each
 * have their own copy of that one, already pre-existing and not consolidated here
 * — this file only covers the new mixed/odd helper, not the majority-unit pick
 * itself). mock:1290's `mixed`/`odd`. Not wired into any derived-rule `compute`;
 * this never changes what a value rounds to or which unit wins, only whether a
 * warning renders. `mixed` is true when the comparables don't all agree on a
 * unit; `odd` counts how many rows disagree with whichever unit the method's own
 * `detectPriceUnit` already picked as the majority. Shared across WQS/SAG/DC
 * (`WQSAdjustFinalValueSection.tsx`, `SaleAdjustmentGridAdjustAppraisalPriceSection.tsx`,
 * `DirectComparisonAdjustAppraisalPriceSection.tsx`) rather than one copy per
 * method — the three calculation rows this reads from (`offeringPrice`,
 * `offeringPriceMeasurementUnit`, `sellingPriceMeasurementUnit`) are named
 * identically across all three methods' calculation row shapes.
 */
export function detectPriceUnitMixed(calculations: unknown): { mixed: boolean; odd: number } {
  const rows = Array.isArray(calculations) ? calculations : [];
  const units: string[] = rows
    .map((c: any) =>
      c?.offeringPrice && Number(c.offeringPrice) !== 0
        ? c?.offeringPriceMeasurementUnit
        : c?.sellingPriceMeasurementUnit,
    )
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  if (units.length === 0) return { mixed: false, odd: 0 };

  const freq = new Map<string, number>();
  for (const u of units) freq.set(u, (freq.get(u) ?? 0) + 1);
  const mode = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];

  return { mixed: freq.size > 1, odd: units.filter(u => u !== mode).length };
}

/**
 * Per-market companion to the above, for the market column headers themselves
 * (mock:340/1417 — `.mhead .d b.uodd { color: var(--danger) }`, the header's own unit
 * token goes red when it's not the majority).
 *
 * Deliberately NOT built on `detectPriceUnitMixed`'s own rule above (the
 * `WQSCalculations`-row, offering-price-gated pick): that rule can disagree with
 * `surveyUnit()` / `marketUnitLabel` — the exact pick already rendering the header's
 * unit token — on a row where the offer price is 0 with an offer unit still set, or
 * vice versa. Colouring the token by a rule different from the one that chose its
 * text would let the header show one unit while marking a *different* one as
 * wrong. `ComparativeFactorTable.tsx` (the data tab) also has no calculation array
 * in scope at all, so this has to work off the raw survey list either way.
 *
 * `isMarketUnitOdd` takes the survey object directly rather than an index into a
 * parallel array on purpose — an index-based version is one filtered/reordered
 * array away from colouring the wrong column, and every call site already has the
 * survey in hand from its own `.map`.
 */
export function detectMarketMajorityUnit(
  surveys: Parameters<typeof surveyUnit>[0][],
): string | null {
  const units = surveys.map(surveyUnit).filter((u): u is string => u != null);
  if (units.length === 0) return null;

  const freq = new Map<string, number>();
  for (const u of units) freq.set(u, (freq.get(u) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function isMarketUnitOdd(
  survey: Parameters<typeof surveyUnit>[0],
  majorityUnit: string | null,
): boolean {
  const unit = surveyUnit(survey);
  return unit != null && unit !== majorityUnit;
}
