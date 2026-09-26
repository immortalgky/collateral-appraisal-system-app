import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { Icon } from '@/shared/components';
import type { MarketComparableDetailType } from '../schemas';

interface WQSRSQSectionProps {
  comparativeSurveys: MarketComparableDetailType[];
  readOnly?: boolean;
  /** Closes the panel — the mock renders this as a right-hand panel with a ✕, not an
   * accordion, so open/closed state now lives in the caller (WQSForm's "Regression"
   * toggle button) rather than here. */
  onClose: () => void;
}

export function WQSRSQSection({ comparativeSurveys, readOnly: _readOnly, onClose }: WQSRSQSectionProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { control } = useFormContext();

  const {
    finalValueCoefficientOfDecision: coeffPath,
    finalValueStandardError: sePath,
    finalValueIntersectionPoint: interceptPath,
    finalValuSlope: slopePath,
    finalValueFinalValue: fvPath,
    finalValueLowestEstimate: lowestPath,
    finalValueHighestEstimate: highestPath,
    totalWeightedCollateralScore: subjectScorePath,
  } = wqsFieldPath;

  const coefficientOfDecision = useWatch({ control, name: coeffPath() }) ?? 0;
  const standardError = useWatch({ control, name: sePath() }) ?? 0;
  const intersectionPoint = useWatch({ control, name: interceptPath() }) ?? 0;
  const slope = useWatch({ control, name: slopePath() }) ?? 0;
  const finalValue = useWatch({ control, name: fvPath() }) ?? 0;
  const lowestEstimate = useWatch({ control, name: lowestPath() }) ?? 0;
  const highestEstimate = useWatch({ control, name: highestPath() }) ?? 0;
  const subjectScore = useWatch({ control, name: subjectScorePath() }) ?? 0;

  const totalScores = useWatch({ control, name: 'WQSTotalScores' });
  const calculations = useWatch({ control, name: 'WQSCalculations' });

  // Build scatter data: one point per survey.
  // X = each market's weighted-score TOTAL — `WQSTotalScores.surveys[idx].totalWeightedScore`,
  // the exact same path `wqsFieldPath.totalWeightedSurveyScore({ column })` resolves to,
  // i.e. the same number the scoring table's own "Total" row/"Weighted" column shows for
  // that market. Already correct as of this read — if the plotted X still looks like a
  // small per-factor score rather than a market's weighted total, the bug is upstream in
  // how `totalWeightedScore` itself is computed (buildWQSTotalScoreRules), not this accessor.
  const scatterData = comparativeSurveys
    .map((_survey, idx) => {
      const weightedScore = totalScores?.surveys?.[idx]?.totalWeightedScore ?? 0;
      const adjustedValue = calculations?.[idx]?.adjustedValue ?? 0;
      return { x: Number(weightedScore), y: Number(adjustedValue) };
    })
    .filter(p => p.x !== 0 || p.y !== 0);

  // The subject property's own point: its weighted collateral score on X, the
  // regression's own estimate at that score (= Final Value) on Y — there is no
  // "adjusted value" for the subject the way there is for a market, since that figure
  // only exists per-market from its own price adjustments.
  const subjectPoint =
    Number(subjectScore) !== 0 || Number(finalValue) !== 0
      ? [{ x: Number(subjectScore), y: Number(finalValue) }]
      : [];

  // Regression line endpoints
  const xValues = scatterData.map(p => p.x);
  const minX = xValues.length > 0 ? Math.min(...xValues) : 0;
  const maxX = xValues.length > 0 ? Math.max(...xValues) : 100;
  const intercept = Number(intersectionPoint) || 0;
  const slopeNum = Number(slope) || 0;
  const regressionLine: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: minX, y: intercept + slopeNum * minX },
    { x: maxX, y: intercept + slopeNum * maxX },
  ];

  const statsRows = [
    // font-semibold like Final value below — main's WQSAdjustFinalValueSection.tsx had
    // this row bold in both states; the red-warning treatment now lives solely in the
    // summary's ตรวจทาน card (WQSValueRangeCard.tsx), not duplicated here.
    { label: 'Coefficient of decision', value: coefficientOfDecision, decimals: 4, emphasize: true },
    { label: 'Standard error', value: standardError, decimals: 2 },
    { label: 'Intersection point', value: intersectionPoint, decimals: 2 },
    { label: 'Slope', value: slope, decimals: 2 },
    // "Final value" is the one row the mock sets apart — font-semibold (600) — every
    // other row (including its own label) stays font-medium (500).
    { label: 'Final value', value: finalValue, decimals: 2, emphasize: true },
    { label: 'Lowest estimate', value: lowestEstimate, decimals: 2 },
    { label: 'Highest estimate', value: highestEstimate, decimals: 2 },
  ];

  return (
    // Welded to the scoring table, not a floating card: no border-radius/shadow of its
    // own, opaque white, and only a left border — see WQSForm.tsx, where this is now a
    // direct flex sibling of WQSScoringSection's own root (not nested behind an extra
    // wrapper div), sized/stretched by that shared flex row.
    <div className="w-[262px] shrink-0 flex flex-col border-l border-[rgb(227,233,232)] bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-700">
          {t('wqs.regression.title')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="size-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <Icon name="xmark" className="size-3.5" />
        </button>
      </div>

      <div className="min-h-0 overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thin] px-3 py-3">
        <div className="flex flex-col gap-4">
          {/* Stats table */}
          <table className="w-full text-[11.5px] tabular-nums table-fixed">
            <colgroup>
              <col className="w-[55%]" />
              <col className="w-[45%]" />
            </colgroup>
            <tbody>
              {statsRows.map(row => (
                <tr key={row.label} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-gray-600 truncate">{row.label}</td>
                  <td
                    className={clsx(
                      'py-1 text-right truncate',
                      row.emphasize ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {typeof row.value === 'number'
                      ? row.value.toLocaleString(undefined, {
                          minimumFractionDigits: row.decimals ?? 2,
                          maximumFractionDigits: row.decimals ?? 2,
                        })
                      : row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend — filled dot = market, hollow ring = subject */}
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-[#0d9488]" />
              {t('wqs.regression.legendMarket')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full border-2 border-[#b45309] bg-white" />
              {t('wqs.regression.legendSubject')}
            </span>
          </div>

          {/* Scatter chart — mock's viewBox is 238×150 (≈1.59:1); the panel is already the
              mock's 262px width (238 once the 12px side padding is subtracted), so the
              fix for "too narrow" is height, not width — see aspect-[238/150] below. */}
          <div className="aspect-[238/150] min-w-0">
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f2" />
                  {/* domain=['dataMin','dataMax'] on both axes — recharts defaults to a
                      zero-anchored domain, which crushed every point into one corner
                      here (X really does span ~630-800, Y ~4.4M-4.9M; a 0-anchored axis
                      makes that range look like a rounding error). No axis title — the
                      mock doesn't have one. */}
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Weighted Score"
                    domain={['dataMin', 'dataMax']}
                    stroke="#cbd5d3"
                    tick={{ fontSize: 9, fill: '#8a96a0' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Adjusted Value"
                    domain={['dataMin', 'dataMax']}
                    stroke="#cbd5d3"
                    tick={{ fontSize: 9, fill: '#8a96a0' }}
                    // 34px matches the mock's left gutter (L=34) — just enough for the
                    // "4.4ล." tick labels to clear the axis line without extra dead space.
                    width={34}
                    // Millions, abbreviated — matches the mock's axis (4.4ล., 4.7ล., …),
                    // display only, no change to the underlying adjusted-value numbers.
                    tickFormatter={v => `${(v / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}ล.`}
                  />
                  <Tooltip formatter={(value: any) => value?.toLocaleString?.() ?? value} />
                  {/* Shaded band: lowest to highest estimate */}
                  {Number(lowestEstimate) > 0 && Number(highestEstimate) > 0 && (
                    <ReferenceArea
                      y1={Number(lowestEstimate)}
                      y2={Number(highestEstimate)}
                      fill="#0d9488"
                      fillOpacity={0.1}
                      stroke="#0d9488"
                      strokeOpacity={0.3}
                      strokeDasharray="3 3"
                    />
                  )}
                  {/* Regression line — mock's `.reg`: accent-ink, 1.5px, dashed 4 3 */}
                  {regressionLine.length === 2 && slopeNum !== 0 && (
                    <ReferenceLine
                      segment={regressionLine}
                      stroke="#0f766e"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                  )}
                  <Scatter data={scatterData} fill="#0d9488" r={4} />
                  {/* Subject — hollow ring so it reads apart from the filled market dots */}
                  {subjectPoint.length > 0 && (
                    <Scatter data={subjectPoint} shape="circle" fill="white" stroke="#b45309" strokeWidth={2} r={5} />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No data available for chart
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
