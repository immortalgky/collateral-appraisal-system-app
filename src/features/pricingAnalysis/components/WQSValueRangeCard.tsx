import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { directComparisonPath } from '../adapters/directComparisonFieldPath';
import { saleGridFieldPath } from '../adapters/saleAdjustmentGridFieldPath';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { toFiniteNumber } from '../domain/calculateWQS';
import { fmt } from '../domain/formatters';
import { KvRow } from './KvRow';

// Appraisal-profession judgement, not a styling choice — do not change this number
// without asking. WQS-ONLY: coefficient of decision is an output of the regression, and
// neither Sale Adjustment Grid nor Direct Comparison runs one, so there is no coefficient
// to threshold on those methods and this value is deliberately not ported to them.
const COEFFICIENT_LOW_THRESHOLD = 0.85;

// react-hook-form returns undefined for a name that matches no field. Watching this
// placeholder on the methods that have no coefficient keeps `useWatch` an unconditional
// hook call — hooks cannot sit behind a branch, and the alternative (watching WQS's real
// path from inside a SAG form) would be a cross-method read that happens to return
// undefined today.
const ABSENT_FIELD = '__valueRangeCard.absentField';

export type PricingMethodKey = 'WQS' | 'SAG' | 'DC';

/**
 * Per-method inputs for the one shared card. A config map rather than eight props at each
 * call site, and rather than a third near-duplicate file: WQS/SAG/DC drift constantly in
 * both directions, and three hand-synced copies of this card is precisely the disease.
 *
 * `rowValueKey` is the load-bearing entry and is NOT the same statistic across methods:
 *
 *  - WQS regresses on each comparable's `adjustedValue`, so that set is the genuine
 *    population its final value is drawn from.
 *  - SAG and DC derive theirs from `totalAdjustValue`, two pipeline stages later
 *    (`adjustedValue` + second-revision area compensation + factor percentages). Plotting
 *    them against `adjustedValue` — which is what the mock does for all three at mock:1650
 *    — would compare a post-factor value against a pre-factor range, so the chip would read
 *    "out of range" for structural reasons whenever factor adjustments are net negative.
 *    User ruling: use each method's real input set.
 *
 * Consequence the user has accepted: DC's final value IS the minimum of its set
 * (`calcFinalValue`), so an untouched DC rests exactly on the low bound with the marker at
 * the left edge. That is the resting state, not a bug — the card earns its keep there once
 * the appraiser overrides the rate. SAG is a weighted mean over weights the form constrains
 * to 0..1, so it always lands inside its own min/max unless the weights do not total 1.
 */
const METHOD_CONFIG = {
  WQS: {
    calculationsName: 'WQSCalculations',
    rowValueKey: 'adjustedValue',
    finalValueRoundedPath: wqsFieldPath.finalValueFinalValueRounded(),
    finalValueAdjustedPath: wqsFieldPath.finalValueFinalValueAdjusted(),
    coefficientPath: wqsFieldPath.finalValueCoefficientOfDecision(),
    titleKey: 'wqs.summary.reviewCardTitle',
    subtitleKey: 'wqs.summary.reviewCardSubtitle',
    inRangeKey: 'wqs.summary.inRange',
    outOfRangeKey: 'wqs.summary.outOfRange',
  },
  SAG: {
    calculationsName: 'saleAdjustmentGridCalculations',
    rowValueKey: 'totalAdjustValue',
    finalValueRoundedPath: saleGridFieldPath.finalValueRounded(),
    finalValueAdjustedPath: saleGridFieldPath.finalValueAdjusted(),
    coefficientPath: undefined,
    // Not `wqs.summary.*`: borrowing those keys means rewording a string on the WQS screen
    // silently rewords this one, and no WQS test would ever show it. Same reasoning as the
    // area labels in SaleAdjustmentGridAdjustAppraisalPriceSection.tsx.
    titleKey: 'finalValue.reviewCardTitle',
    subtitleKey: 'finalValue.reviewCardSubtitle',
    inRangeKey: 'finalValue.inRange',
    outOfRangeKey: 'finalValue.outOfRange',
  },
  DC: {
    calculationsName: 'directComparisonCalculations',
    rowValueKey: 'totalAdjustValue',
    finalValueRoundedPath: directComparisonPath.finalValueRounded(),
    finalValueAdjustedPath: directComparisonPath.finalValueAdjusted(),
    coefficientPath: undefined,
    titleKey: 'finalValue.reviewCardTitle',
    subtitleKey: 'finalValue.reviewCardSubtitle',
    inRangeKey: 'finalValue.inRange',
    outOfRangeKey: 'finalValue.outOfRange',
  },
} as const;

/**
 * "Review" (ตรวจทาน) — plots the method's final value against the range its own market
 * comparables span. Reads only already-computed figures; introduces no new formula.
 */
export function ValueRangeCard({ method }: { method: PricingMethodKey }) {
  const { t } = useTranslation('pricingAnalysis');
  const { control } = useFormContext();

  const config = METHOD_CONFIG[method];

  const calculations = useWatch({ control, name: config.calculationsName }) as
    | Record<string, unknown>[]
    | undefined;
  const finalValueRounded = useWatch({ control, name: config.finalValueRoundedPath });
  const finalValueAdjusted = useWatch({ control, name: config.finalValueAdjustedPath });
  const coefficientOfDecision = useWatch({
    control,
    name: config.coefficientPath ?? ABSENT_FIELD,
  });

  const comparableValues = (calculations ?? [])
    .map(row => Number(row?.[config.rowValueKey]) || 0)
    .filter(v => v > 0);

  if (comparableValues.length === 0) return null;

  const low = Math.min(...comparableValues);
  const high = Math.max(...comparableValues);

  // The rate the appraiser entered themselves, per the user's ruling ("ราคาที่กรอกเอง") —
  // this card checks the number they typed, not the one the method computed.
  //
  // Same unit as the range above in every method, which is the whole hazard here. The
  // mock's author left themselves a warning about it at mock:1391 ("ห้ามเอา o.perR/o.apprR
  // ไปเทียบ"): both sides of this comparison must be totals, or both per-unit, never mixed.
  // `finalValueAdjusted` is seeded verbatim from `finalValueRounded`, which reduces exactly
  // the `rowValueKey` set above — the regression for WQS, the weighted sum for SAG, the
  // minimum for DC — so it inherits that set's unit in both the per-unit (01/02) and total
  // (03) branches. Every input that overwrites it preserves that unit.
  //
  // `appraisalPrice` must NOT win this expression: it is `finalValueAdjusted × area` for
  // unit 01/02 and adds building cost on top, so once an appraiser filled it in, a
  // tens-of-thousands range was compared against a millions marker and the chip read
  // "out of range" forever.
  //
  // Falls back to the computed value only for the render window before the seed rule fires
  // (a fresh Generate clears the field), not as a second opinion.
  const marker = Number(finalValueAdjusted) || Number(finalValueRounded) || 0;

  // The in/out test is against the comparables' own range — it is NOT the bar's scale.
  const inRange = marker >= low && marker <= high;

  // mock:1650 — the axis stretches to always contain the marker, while the filled segment
  // spans low..high. That is what keeps an out-of-range marker visible and correctly placed
  // OUTSIDE the fill, instead of clamped onto the range's edge where it would look in-range.
  // It matters most for DC, whose marker sits on the low bound at rest.
  const axisLow = Math.min(low, marker);
  const axisHigh = Math.max(high, marker);
  const axisSpan = axisHigh - axisLow;
  // Every comparable identical (and the marker with them): there is no range to plot, so
  // centre everything rather than dividing by zero.
  const pct = (value: number) => (axisSpan > 0 ? ((value - axisLow) / axisSpan) * 100 : 50);

  // A label centred on its own position (a fixed `-translate-x-1/2`) hangs half its width
  // past the card at the extremes — and here the extremes are the COMMON case, not an edge
  // case: whenever the marker falls inside the range, `low` and `high` ARE the axis ends, so
  // these labels sit at exactly 0% and 100%. The card is `overflow-hidden`, so that half was
  // clipped rather than spilling ("66,500.00" rendered as ",500.00").
  //
  // Shifting by the label's OWN position instead of a fixed half turns centre alignment into
  // edge alignment exactly at the edges, and leaves it centred everywhere else: 0% shifts
  // nothing (left edge flush), 100% shifts a full width back (right edge flush), 50% is
  // unchanged. One expression, no branching, and it holds for the pulled-inward positions
  // the stretched axis produces when the marker falls outside the range.
  //
  // Deliberately not solved by shortening the numbers: abbreviating would trade a visible
  // clip for a silently misread price, which is the whole reason the mock's `capNum` exists.
  const edgeSafeShift = (position: number) => `translateX(-${position}%)`;

  return (
    // Real card, per the user's "ปรับหน้าสรุปให้เป็นการ์ดและมี underline" — mock:579-580,
    // same treatment as the Adjust Final Value card it sits beside. `overflow-hidden` clips
    // the header band's corners to the card's own radius since the band fills edge to edge.
    <div className="min-w-0 border border-[#e3e9e8] rounded-[10px] overflow-hidden">
      <div className="flex items-center justify-between px-[12px] py-[8px] bg-[#f8fafa] border-b border-[#e3e9e8]">
        <h4 className="m-0 text-[12.5px] font-semibold text-gray-800">{t(config.titleKey)}</h4>
        <span
          className={
            inRange
              ? 'rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600'
              : 'rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600'
          }
        >
          {inRange ? t(config.inRangeKey) : t(config.outOfRangeKey)}
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-4">{t(config.subtitleKey)}</p>

        <div className="relative h-1.5 rounded-full bg-gray-100 mt-6 mb-2">
          {/* The comparables' range, drawn on the stretched axis rather than filling the
              whole bar — with the marker outside it, the unfilled remainder is what shows
              the reader how far outside it fell. */}
          <div
            className="absolute inset-y-0 rounded-full bg-primary/15"
            style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
          />
          {/* The marker keeps a fixed centre shift, unlike the labels below. Checked rather
              than assumed: `size-3` is 0.75rem, which at this app's 13px root is 9.75px, so
              at 0%/100% it overhangs the bar by 4.875px — and the bar sits inside the card's
              `p-4`, 13px. The overhang lands in that padding, still inside the card, so it
              is not clipped. The same arithmetic is why the labels DID clip: half of
              "66,500.00" at 11px is roughly 25px against the same 13px of padding. */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full border-2 border-primary bg-white shadow"
            style={{ left: `${pct(marker)}%` }}
            title={fmt(marker)}
          />
        </div>
        {/* Bound labels sit under their own ends of the fill, not at the bar's extremes:
            once the axis stretches past the range, a justify-between pair would sit under
            the axis ends and misstate where the range actually is. */}
        <div className="relative h-[16px] text-[11px] text-gray-500 tabular-nums">
          <span
            className="absolute whitespace-nowrap"
            style={{ left: `${pct(low)}%`, transform: edgeSafeShift(pct(low)) }}
          >
            {fmt(low)}
          </span>
          <span
            className="absolute whitespace-nowrap"
            style={{ left: `${pct(high)}%`, transform: edgeSafeShift(pct(high)) }}
          >
            {fmt(high)}
          </span>
        </div>
        {config.coefficientPath && coefficientOfDecision != null && (
          // Same `.kv` grid as the Adjust Final Value card, via the shared <KvRow> —
          // team-lead: "both cards on that tab agree". `mt-4 pt-3 border-t` (a visual gap
          // from the range bar above) stays outside the grid row itself.
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs">
            <KvRow
              label={t('wqs.summary.coefficientOfDecision')}
              value={
                toFiniteNumber(coefficientOfDecision) < COEFFICIENT_LOW_THRESHOLD ? (
                  <span className="font-semibold text-red-500 tabular-nums">
                    {toFiniteNumber(coefficientOfDecision).toFixed(4)}
                  </span>
                ) : (
                  <span className="font-semibold text-gray-800 tabular-nums">
                    {toFiniteNumber(coefficientOfDecision).toFixed(4)}
                  </span>
                )
              }
              hint={
                toFiniteNumber(coefficientOfDecision) < COEFFICIENT_LOW_THRESHOLD ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-500">
                    {t('wqs.summary.coefficientLowWarning')}
                  </span>
                ) : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Preserved so `WQSAdjustFinalValueSection.tsx` keeps its existing import untouched — that
 * file is in another agent's lane tonight, and a rename there would be a needless collision.
 */
export function WQSValueRangeCard() {
  return <ValueRangeCard method="WQS" />;
}
