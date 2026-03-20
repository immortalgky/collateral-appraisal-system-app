import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import { pricingAnalysisKeys } from '@features/pricingAnalysis/api/queryKeys';

interface PricingBreakdownSlideOverProps {
  appraisalId: string;
  groupId: string;
  pricingAnalysisId: string;
}

interface MethodDto {
  id: string;
  methodType: string;
  methodValue: number | null;
  isSelected: boolean;
  comparativeAnalysisTemplateId: string | null;
}

interface ApproachDto {
  id: string;
  approachType: string;
  isSelected: boolean;
  methods: MethodDto[];
}

interface PricingAnalysisData {
  id: string;
  propertyGroupId: string;
  status: string;
  finalMarketValue: number | null;
  finalAppraisedValue: number | null;
  finalForcedSaleValue: number | null;
  valuationDate: string | null;
  useSystemCalc: boolean;
  approaches: ApproachDto[];
}

interface ComparativeFactorsData {
  pricingAnalysisId: string;
  methodId: string;
  methodType: string;
  comparativeAnalysisTemplateId: string | null;
  methodValue: number | null;
  linkedComparables: LinkedComparable[];
  comparativeFactors: ComparativeFactor[];
  factorScores: FactorScore[];
  calculations: Calculation[];
  rsqResult?: RsqResult;
}

interface LinkedComparable {
  linkId: string;
  marketComparableId: string;
  displaySequence: number;
  comparableName: string | null;
  comparableCode: string | null;
}

interface ComparativeFactor {
  id: string;
  factorId: string;
  factorCode: string | null;
  factorName: string | null;
  displaySequence: number;
  isSelectedForScoring: boolean;
  remarks: string | null;
}

interface FactorScore {
  id: string;
  factorId: string;
  factorName: string | null;
  marketComparableId: string | null;
  comparableName: string | null;
  factorWeight: number;
  displaySequence: number;
  value: string | null;
  score: number | null;
  weightedScore: number | null;
  intensity: number | null;
  adjustmentPct: number | null;
  adjustmentAmt: number | null;
  comparisonResult: string | null;
  remarks: string | null;
}

interface Calculation {
  id: string;
  marketComparableId: string;
  comparableName: string | null;
  offeringPrice: number | null;
  offeringPriceUnit: string | null;
  adjustOfferPricePct: number | null;
  adjustOfferPriceAmt: number | null;
  sellingPrice: number | null;
  sellingPriceUnit: string | null;
  buySellYear: number | null;
  buySellMonth: number | null;
  adjustedPeriodPct: number | null;
  cumulativeAdjPeriod: number | null;
  landAreaDeficient: number | null;
  landAreaDeficientUnit: string | null;
  landPrice: number | null;
  landValueAdjustment: number | null;
  usableAreaDeficient: number | null;
  usableAreaDeficientUnit: string | null;
  usableAreaPrice: number | null;
  buildingValueAdjustment: number | null;
  totalFactorDiffPct: number | null;
  totalFactorDiffAmt: number | null;
  totalAdjustedValue: number | null;
  weight: number | null;
  weightedAdjustedValue: number | null;
}

interface RsqResult {
  id: string;
  coefficientOfDecision: number | null;
  standardError: number | null;
  intersectionPoint: number | null;
  slope: number | null;
  rsqFinalValue: number | null;
  lowestEstimate: number | null;
  highestEstimate: number | null;
}

const APPROACH_LABELS: Record<string, string> = {
  Market: 'Market Comparison Approach',
  Cost: 'Cost Approach',
  Income: 'Income Approach',
  Residual: 'Residual Approach',
};

const METHOD_LABELS: Record<string, string> = {
  DC_MARKET: 'Direct Comparison (DC)',
  SAG_MARKET: 'Sale Adjustment Grid (SAG)',
  WQS_MARKET: 'Weighted Quality Score (WQS)',
  DirectComparison: 'Direct Comparison',
  SaleAdjustmentGrid: 'Sale Adjustment Grid',
  WQS: 'Weighted Quality Score',
  CostApproach: 'Cost Approach',
  IncomeCapitalization: 'Income Capitalization',
  DCF: 'Discounted Cash Flow',
  ResidualMethod: 'Residual Method',
};

const PricingBreakdownSlideOver = ({
  pricingAnalysisId,
}: PricingBreakdownSlideOverProps) => {
  const [expandedMethodId, setExpandedMethodId] = useState<string | null>(null);

  // Step 1: Fetch pricing analysis overview
  const { data, isLoading, error } = useQuery({
    queryKey: pricingAnalysisKeys.detail(pricingAnalysisId),
    queryFn: async (): Promise<PricingAnalysisData> => {
      const { data } = await axios.get(`/pricing-analysis/${pricingAnalysisId}`);
      return data;
    },
    enabled: !!pricingAnalysisId,
    staleTime: Infinity,
  });

  // Step 2: Fetch comparative factors for all methods
  const allMethods = data?.approaches?.flatMap(a => a.methods) ?? [];
  const methodFactorQueries = useQueries({
    queries: allMethods.map(method => ({
      queryKey: pricingAnalysisKeys.comparativeFactors(pricingAnalysisId, method.id),
      queryFn: async (): Promise<ComparativeFactorsData> => {
        const { data } = await axios.get(
          `/pricing-analysis/${pricingAnalysisId}/methods/${method.id}/comparative-factors`,
        );
        return data;
      },
      enabled: !!pricingAnalysisId && !!method.id,
      staleTime: Infinity,
      retry: 1,
    })),
  });

  const methodFactorsMap = new Map<string, ComparativeFactorsData>();
  allMethods.forEach((method, idx) => {
    const factorData = methodFactorQueries[idx]?.data;
    if (factorData) {
      methodFactorsMap.set(method.id, factorData);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Icon name="circle-exclamation" style="solid" className="w-6 h-6 text-red-400" />
        <p className="text-sm text-red-600">Failed to load pricing breakdown.</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-gray-500 py-4">No pricing data available.</p>;
  }

  const selectedApproaches = data.approaches?.filter(a => a.isSelected) ?? [];
  const otherApproaches = data.approaches?.filter(a => !a.isSelected) ?? [];

  return (
    <div className="space-y-6">
      {/* Appraised Value */}
      <div>
        <ValueCard label="Appraised Value" value={data.finalAppraisedValue} highlight />
      </div>

      {/* Status & Metadata */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <MetaItem label="Status" value={data.status || '-'} />
        <MetaItem label="Calculation" value={data.useSystemCalc ? 'System' : 'Manual'} />
        {data.valuationDate && (
          <MetaItem
            label="Date"
            value={new Date(data.valuationDate).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          />
        )}
      </div>

      {/* Selected Approaches + Methods with detail */}
      {selectedApproaches.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Selected Approaches ({selectedApproaches.length})
          </h4>
          <div className="space-y-3">
            {selectedApproaches.map(approach => (
              <ApproachCard
                key={approach.id}
                approach={approach}
                selected
                expandedMethodId={expandedMethodId}
                onToggleMethod={setExpandedMethodId}
                methodFactorsMap={methodFactorsMap}
                isLoadingFactors={methodFactorQueries.some(q => q.isLoading)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Approaches */}
      {otherApproaches.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Other Approaches
          </h4>
          <div className="space-y-3">
            {otherApproaches.map(approach => (
              <ApproachCard
                key={approach.id}
                approach={approach}
                expandedMethodId={expandedMethodId}
                onToggleMethod={setExpandedMethodId}
                methodFactorsMap={methodFactorsMap}
                isLoadingFactors={methodFactorQueries.some(q => q.isLoading)}
              />
            ))}
          </div>
        </div>
      )}

      {data.approaches?.length === 0 && (
        <div className="text-center py-8">
          <Icon name="chart-line" style="regular" className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No approaches configured yet.</p>
        </div>
      )}
    </div>
  );
};

// ==================== Sub-Components ====================

const ValueCard = ({ label, value, highlight }: { label: string; value: number | null; highlight?: boolean }) => (
  <div className={highlight
    ? 'p-3 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200'
    : 'p-3 rounded-xl bg-gray-50 border border-gray-200'
  }>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={highlight ? 'text-lg font-bold text-teal-800' : 'text-sm font-semibold text-gray-900'}>
      {value != null ? formatNumber(value, 2) : '-'}
    </p>
  </div>
);

const MetaItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-gray-500">{label}:</span>
    <span className="font-medium text-gray-900">{value}</span>
  </div>
);

const ApproachCard = ({
  approach,
  selected,
  expandedMethodId,
  onToggleMethod,
  methodFactorsMap,
  isLoadingFactors,
}: {
  approach: ApproachDto;
  selected?: boolean;
  expandedMethodId: string | null;
  onToggleMethod: (id: string | null) => void;
  methodFactorsMap: Map<string, ComparativeFactorsData>;
  isLoadingFactors: boolean;
}) => {
  const selectedMethods = approach.methods.filter(m => m.isSelected);
  const otherMethods = approach.methods.filter(m => !m.isSelected);

  return (
    <div className={selected
      ? 'rounded-xl border-2 border-teal-200 bg-teal-50/50 overflow-hidden'
      : 'rounded-xl border border-gray-200 bg-white overflow-hidden'
    }>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selected && <Icon name="circle-check" style="solid" className="w-4 h-4 text-teal-500" />}
          <span className="text-sm font-semibold text-gray-900">
            {APPROACH_LABELS[approach.approachType] || approach.approachType}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {approach.methods.length} {approach.methods.length === 1 ? 'method' : 'methods'}
        </span>
      </div>

      {approach.methods.length > 0 && (
        <div className="border-t border-gray-100">
          {selectedMethods.map(method => (
            <MethodSection
              key={method.id}
              method={method}
              selected
              isExpanded={expandedMethodId === method.id}
              onToggle={() => onToggleMethod(expandedMethodId === method.id ? null : method.id)}
              factorsData={methodFactorsMap.get(method.id)}
              isLoadingFactors={isLoadingFactors}
            />
          ))}
          {otherMethods.map(method => (
            <MethodSection
              key={method.id}
              method={method}
              isExpanded={expandedMethodId === method.id}
              onToggle={() => onToggleMethod(expandedMethodId === method.id ? null : method.id)}
              factorsData={methodFactorsMap.get(method.id)}
              isLoadingFactors={isLoadingFactors}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MethodSection = ({
  method,
  selected,
  isExpanded,
  onToggle,
  factorsData,
  isLoadingFactors,
}: {
  method: MethodDto;
  selected?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  factorsData: ComparativeFactorsData | undefined;
  isLoadingFactors: boolean;
}) => (
  <div className="border-b border-gray-50 last:border-b-0">
    {/* Method header — clickable to expand */}
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        {selected && <Icon name="check" style="solid" className="w-3 h-3 text-emerald-500" />}
        <span className={selected ? 'text-sm text-gray-900 font-medium' : 'text-sm text-gray-500'}>
          {METHOD_LABELS[method.methodType] || method.methodType}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={selected ? 'text-sm font-semibold text-gray-900' : 'text-sm text-gray-400'}>
          {method.methodValue != null ? formatNumber(method.methodValue, 2) : '-'}
        </span>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          style="solid"
          className="w-3 h-3 text-gray-400"
        />
      </div>
    </button>

    {/* Expanded detail */}
    {isExpanded && (
      <div className="px-4 pb-4 pt-1">
        {isLoadingFactors && !factorsData ? (
          <div className="flex items-center justify-center py-4">
            <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        ) : factorsData ? (
          <MethodDetail data={factorsData} />
        ) : (
          <p className="text-xs text-gray-400 py-2">No calculation details available.</p>
        )}
      </div>
    )}
  </div>
);

const MethodDetail = ({ data }: { data: ComparativeFactorsData }) => {
  const comparables = data.linkedComparables ?? [];
  const factors = (data.comparativeFactors ?? []).filter(f => f.isSelectedForScoring);
  const factorScores = data.factorScores ?? [];
  const calculations = data.calculations ?? [];

  // Collateral scores have marketComparableId === null
  const collateralScores = factorScores.filter(fs => fs.marketComparableId == null);
  const hasCollateralScores = collateralScores.length > 0;

  // Build survey name lookup from factorScores/calculations (carries actual survey name)
  const surveyNameMap = new Map<string, string>();
  for (const fs of factorScores) {
    if (fs.marketComparableId && fs.comparableName) {
      surveyNameMap.set(fs.marketComparableId, fs.comparableName);
    }
  }
  for (const calc of calculations) {
    if (calc.marketComparableId && calc.comparableName) {
      surveyNameMap.set(calc.marketComparableId, calc.comparableName);
    }
  }

  return (
    <div className="space-y-4">
      {/* Score Table: factors × (collateral + comparables) */}
      {factors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Score Table
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500">Factor</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Weight</th>
                  {hasCollateralScores && (
                    <th className="px-2 py-1.5 text-right font-medium text-teal-600 bg-teal-50/50">
                      Collateral
                    </th>
                  )}
                  {comparables.map(c => (
                    <th
                      key={c.linkId}
                      className="px-2 py-1.5 text-right font-medium text-gray-500 max-w-[80px] truncate"
                    >
                      {surveyNameMap.get(c.marketComparableId) || c.comparableName || c.comparableCode || '-'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {factors.map(factor => {
                  const firstScore = factorScores.find(fs => fs.factorId === factor.factorId);
                  const weight = firstScore?.factorWeight;
                  const collateralScore = collateralScores.find(
                    fs => fs.factorId === factor.factorId,
                  );
                  return (
                    <tr key={factor.id}>
                      <td className="px-2 py-1.5 text-gray-700">{factor.factorName}</td>
                      <td className="px-2 py-1.5 text-right text-gray-600">
                        {weight != null ? `${weight}%` : '-'}
                      </td>
                      {hasCollateralScores && (
                        <td className="px-2 py-1.5 text-right bg-teal-50/30">
                          <ScoreCell score={collateralScore} />
                        </td>
                      )}
                      {comparables.map(comp => {
                        const score = factorScores.find(
                          fs =>
                            fs.factorId === factor.factorId &&
                            fs.marketComparableId === comp.marketComparableId,
                        );
                        return (
                          <td key={comp.linkId} className="px-2 py-1.5 text-right text-gray-600">
                            <ScoreCell score={score} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calculation per comparable */}
      {calculations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Calculations ({calculations.length})
          </p>
          <div className="space-y-3">
            {calculations.map(calc => (
              <CalculationCard key={calc.id} calc={calc} />
            ))}
          </div>
          {/* Method Value footer */}
          <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-teal-50 border border-teal-200">
            <span className="text-xs font-semibold text-gray-900">Method Value</span>
            <span className="text-sm font-bold text-teal-700">
              {data.methodValue != null ? formatNumber(data.methodValue, 2) : '-'}
            </span>
          </div>
        </div>
      )}

      {/* R² Result */}
      {data.rsqResult && (
        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">R² Final Value</span>
            <span className="text-sm font-semibold text-gray-900">
              {data.rsqResult.rsqFinalValue != null ? formatNumber(data.rsqResult.rsqFinalValue, 4) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Coefficient of Decision (R²)</span>
            <span className="text-xs font-medium text-gray-700">
              {data.rsqResult.coefficientOfDecision != null ? formatNumber(data.rsqResult.coefficientOfDecision, 4) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Standard Error</span>
            <span className="text-xs font-medium text-gray-700">
              {data.rsqResult.standardError != null ? formatNumber(data.rsqResult.standardError, 4) : '-'}
            </span>
          </div>
          {(data.rsqResult.lowestEstimate != null || data.rsqResult.highestEstimate != null) && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Estimate Range</span>
              <span className="text-xs font-medium text-gray-700">
                {data.rsqResult.lowestEstimate != null ? formatNumber(data.rsqResult.lowestEstimate, 2) : '-'}
                {' — '}
                {data.rsqResult.highestEstimate != null ? formatNumber(data.rsqResult.highestEstimate, 2) : '-'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {comparables.length === 0 && factors.length === 0 && calculations.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No calculation data recorded for this method.</p>
      )}
    </div>
  );
};

const ScoreCell = ({ score }: { score: FactorScore | undefined }) => {
  if (!score) return <span className="text-gray-400">-</span>;
  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <span className="text-gray-700 font-medium">
        {score.score != null ? score.score : score.value ?? '-'}
      </span>
      {score.weightedScore != null && (
        <span className="text-[10px] text-gray-400">w: {formatNumber(score.weightedScore, 2)}</span>
      )}
      {score.adjustmentPct != null && (
        <span className="text-[10px] text-gray-400">
          adj: {formatNumber(score.adjustmentPct, 1)}%
        </span>
      )}
      {score.comparisonResult && (
        <span
          className={`text-[10px] font-medium ${
            score.comparisonResult === 'E'
              ? 'text-gray-400'
              : score.comparisonResult === 'B'
                ? 'text-emerald-500'
                : 'text-orange-500'
          }`}
        >
          {score.comparisonResult === 'E'
            ? 'Equal'
            : score.comparisonResult === 'I'
              ? 'Inferior'
              : score.comparisonResult === 'B'
                ? 'Better'
                : score.comparisonResult}
        </span>
      )}
    </div>
  );
};

const CalculationCard = ({ calc }: { calc: Calculation }) => {
  const rows: { label: string; value: string }[] = [];

  if (calc.offeringPrice != null) {
    rows.push({
      label: 'Offering Price',
      value: `${formatNumber(calc.offeringPrice, 2)}${calc.offeringPriceUnit ? ` ${calc.offeringPriceUnit}` : ''}`,
    });
  }
  if (calc.adjustOfferPricePct != null) {
    rows.push({ label: 'Adj. Offer Price %', value: `${formatNumber(calc.adjustOfferPricePct, 2)}%` });
  }
  if (calc.adjustOfferPriceAmt != null) {
    rows.push({ label: 'Adj. Offer Price Amt', value: formatNumber(calc.adjustOfferPriceAmt, 2) });
  }
  if (calc.sellingPrice != null) {
    rows.push({
      label: 'Selling Price',
      value: `${formatNumber(calc.sellingPrice, 2)}${calc.sellingPriceUnit ? ` ${calc.sellingPriceUnit}` : ''}`,
    });
  }
  if (calc.buySellYear != null || calc.buySellMonth != null) {
    const parts = [];
    if (calc.buySellYear != null) parts.push(`${calc.buySellYear}y`);
    if (calc.buySellMonth != null) parts.push(`${calc.buySellMonth}m`);
    rows.push({ label: 'Buy/Sell Period', value: parts.join(' ') });
  }
  if (calc.adjustedPeriodPct != null) {
    rows.push({ label: 'Adj. Period %', value: `${formatNumber(calc.adjustedPeriodPct, 2)}%` });
  }
  if (calc.cumulativeAdjPeriod != null) {
    rows.push({ label: 'Cumulative Adj. Period', value: `${formatNumber(calc.cumulativeAdjPeriod, 2)}%` });
  }
  if (calc.landValueAdjustment != null) {
    rows.push({ label: 'Land Value Adj.', value: formatNumber(calc.landValueAdjustment, 2) });
  }
  if (calc.buildingValueAdjustment != null) {
    rows.push({ label: 'Building Value Adj.', value: formatNumber(calc.buildingValueAdjustment, 2) });
  }
  if (calc.totalFactorDiffPct != null) {
    rows.push({ label: 'Total Factor Diff %', value: `${formatNumber(calc.totalFactorDiffPct, 2)}%` });
  }
  if (calc.totalFactorDiffAmt != null) {
    rows.push({ label: 'Total Factor Diff Amt', value: formatNumber(calc.totalFactorDiffAmt, 2) });
  }
  if (calc.totalAdjustedValue != null) {
    rows.push({ label: 'Total Adjusted Value', value: formatNumber(calc.totalAdjustedValue, 2) });
  }
  if (calc.weight != null) {
    rows.push({ label: 'Weight', value: `${formatNumber(calc.weight, 2)}%` });
  }
  if (calc.weightedAdjustedValue != null) {
    rows.push({ label: 'Weighted Adjusted Value', value: formatNumber(calc.weightedAdjustedValue, 2) });
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <Icon name="location-dot" style="solid" className="w-3 h-3 text-orange-400" />
        <span className="text-xs font-semibold text-gray-700">
          {calc.comparableName || '-'}
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-gray-500">{row.label}</span>
            <span className="text-xs font-medium text-gray-800">{row.value}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">No calculation data.</p>
        )}
      </div>
    </div>
  );
};

export default PricingBreakdownSlideOver;
