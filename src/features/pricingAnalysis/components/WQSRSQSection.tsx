import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
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
}

export function WQSRSQSection({ comparativeSurveys }: WQSRSQSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { control } = useFormContext();

  const {
    finalValueCoefficientOfDecision: coeffPath,
    finalValueStandardError: sePath,
    finalValueIntersectionPoint: interceptPath,
    finalValuSlope: slopePath,
    finalValueFinalValue: fvPath,
    finalValueLowestEstimate: lowestPath,
    finalValueHighestEstimate: highestPath,
  } = wqsFieldPath;

  const coefficientOfDecision = useWatch({ control, name: coeffPath() }) ?? 0;
  const standardError = useWatch({ control, name: sePath() }) ?? 0;
  const intersectionPoint = useWatch({ control, name: interceptPath() }) ?? 0;
  const slope = useWatch({ control, name: slopePath() }) ?? 0;
  const finalValue = useWatch({ control, name: fvPath() }) ?? 0;
  const lowestEstimate = useWatch({ control, name: lowestPath() }) ?? 0;
  const highestEstimate = useWatch({ control, name: highestPath() }) ?? 0;

  const totalScores = useWatch({ control, name: 'WQSTotalScores' });
  const calculations = useWatch({ control, name: 'WQSCalculations' });

  // Build scatter data: one point per survey
  const scatterData = comparativeSurveys.map((_survey, idx) => {
    const weightedScore = totalScores?.surveys?.[idx]?.totalWeightedScore ?? 0;
    const adjustedValue = calculations?.[idx]?.adjustedValue ?? 0;
    return { x: Number(weightedScore), y: Number(adjustedValue) };
  }).filter(p => p.x !== 0 || p.y !== 0);

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
    { label: 'Coefficient of decision', value: coefficientOfDecision, decimals: 4 },
    { label: 'Standard error', value: standardError, decimals: 2 },
    { label: 'Intersection point', value: intersectionPoint, decimals: 2 },
    { label: 'Slope', value: slope, decimals: 2 },
    { label: 'Final value', value: finalValue, decimals: 2 },
    { label: 'Lowest estimate', value: lowestEstimate, decimals: 2 },
    { label: 'Highest estimate', value: highestEstimate, decimals: 2 },
  ];

  return (
    <div className="border border-gray-300 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>RSQ</span>
        <Icon
          style="solid"
          name="chevron-down"
          className={clsx('size-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="border-t border-gray-300 px-3 py-3">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Stats table */}
            <div className="min-w-0 overflow-hidden lg:w-[280px] lg:flex-shrink-0">
              <table className="w-full text-xs table-fixed">
                <colgroup>
                  <col className="w-[55%]" />
                  <col className="w-[45%]" />
                </colgroup>
                <tbody>
                  {statsRows.map(row => (
                    <tr key={row.label} className="border-b border-gray-100">
                      <td className="py-1 pr-2 text-gray-600 truncate">{row.label}</td>
                      <td className="py-1 text-right font-medium truncate">
                        {typeof row.value === 'number'
                          ? row.value.toLocaleString(undefined, { maximumFractionDigits: row.decimals ?? 2 })
                          : row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: Scatter chart */}
            <div className="h-[220px] min-w-0 flex-1">
              {scatterData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 10, bottom: 18, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Weighted Score"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Weighted Score', position: 'bottom', offset: 0, fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Adjusted Value"
                      tick={{ fontSize: 11 }}
                      width={70}
                      tickFormatter={v => v.toLocaleString()}
                    />
                    <Tooltip
                      formatter={(value: any) => value?.toLocaleString?.() ?? value}
                    />
                    {/* Shaded band: lowest to highest estimate */}
                    {Number(lowestEstimate) > 0 && Number(highestEstimate) > 0 && (
                      <ReferenceArea
                        y1={Number(lowestEstimate)}
                        y2={Number(highestEstimate)}
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        stroke="#3b82f6"
                        strokeOpacity={0.3}
                        strokeDasharray="3 3"
                      />
                    )}
                    {/* Regression line */}
                    {regressionLine.length === 2 && slopeNum !== 0 && (
                      <ReferenceLine
                        segment={regressionLine}
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    )}
                    <Scatter data={scatterData} fill="#3b82f6" r={4} />
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
      )}
    </div>
  );
}
