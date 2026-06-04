import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useGetLeaseholdAnalysis } from '@features/pricingAnalysis/api';
import type { LeaseholdCalculationDetail } from '@features/pricingAnalysis/types/leasehold';

interface Props {
  pricingAnalysisId: string;
  methodId: string;
  isExpanded: boolean;
}

const LeaseholdBreakdown360 = ({ pricingAnalysisId, methodId, isExpanded }: Props) => {
  const { data, isLoading, isError } = useGetLeaseholdAnalysis(
    isExpanded ? pricingAnalysisId : undefined,
    isExpanded ? methodId : undefined,
  );

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Icon name="circle-exclamation" style="solid" className="w-4 h-4 text-red-400" />
        <p className="text-xs text-red-600">Failed to load leasehold analysis details.</p>
      </div>
    );
  }

  if (!data?.analysis) {
    return <p className="text-xs text-gray-400 py-2">No leasehold analysis available.</p>;
  }

  const a = data.analysis;

  return (
    <div className="space-y-4">
      {/* Input strip */}
      <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Inputs</p>
        <DlRow label="Land Value per Sq.Wa" value={a.landValuePerSqWa} />
        <DlRow label="Land Growth Rate Type" value={a.landGrowthRateType} isText />
        <DlRow label="Land Growth Rate" value={a.landGrowthRatePercent} pct />
        <DlRow label="Construction Cost Index" value={a.constructionCostIndex} />
        <DlRow label="Initial Building Value" value={a.initialBuildingValue} />
        <DlRow label="Depreciation Rate" value={a.depreciationRate} pct />
        <DlRow label="Discount Rate" value={a.discountRate} pct />
      </div>

      {/* Output strip */}
      <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Outputs</p>
        <DlRow label="Total Income" value={a.totalIncomeOverLeaseTerm} />
        <DlRow label="Value at Lease Expiry" value={a.valueAtLeaseExpiry} />
        <DlRow label="Final Value" value={a.finalValue} />
        <DlRow label="Final Value Rounded" value={a.finalValueRounded} highlight />
      </div>

      {/* Calculation table */}
      {a.calculationDetails.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Year-by-Year Calculation
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Year</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Land Value</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Growth %</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Bldg Value</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Depr Amt</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Depr %</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">
                    Bldg After Depr
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Total L+B</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">
                    Rental Income
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">PV Factor</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">
                    Net Curr. Rental
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {a.calculationDetails.map((row: LeaseholdCalculationDetail) => (
                  <tr key={row.year}>
                    <td className="px-2 py-1 text-right text-gray-700">{row.year}</td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.landValue, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.landGrowthPercent, 2)}%
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.buildingValue, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.depreciationAmount, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.depreciationPercent, 2)}%
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.buildingAfterDepreciation, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.totalLandAndBuilding, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.rentalIncome, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.pvFactor, 6)}
                    </td>
                    <td className="px-2 py-1 text-right font-medium text-gray-800">
                      {formatNumber(row.netCurrentRentalIncome, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Partial usage */}
      {a.isPartialUsage && (
        <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Partial Usage</p>
          <DlRow label="Partial Rai" value={a.partialRai} decimals={0} />
          <DlRow label="Partial Ngan" value={a.partialNgan} decimals={0} />
          <DlRow label="Partial Wa" value={a.partialWa} decimals={2} />
          <DlRow label="Partial Land Area (Sq.Wa)" value={a.partialLandArea} />
          <DlRow label="Price per Sq.Wa" value={a.pricePerSqWa} />
          <DlRow label="Partial Land Price" value={a.partialLandPrice} />
          <DlRow label="Estimate Net Price" value={a.estimateNetPrice} />
          <DlRow label="Estimate Price Rounded" value={a.estimatePriceRounded} highlight />
        </div>
      )}

      {/* Remark */}
      {data.remark && (
        <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
          {data.remark}
        </p>
      )}
    </div>
  );
};

// ─── Shared helper ────────────────────────────────────────────────────────────

const DlRow = ({
  label,
  value,
  pct,
  decimals = 2,
  highlight,
  isText = false,
}: {
  label: string;
  value: number | string | null | undefined;
  pct?: boolean;
  decimals?: number;
  highlight?: boolean;
  isText?: boolean;
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-gray-500">{label}</span>
    <span
      className={
        highlight
          ? 'text-sm font-bold text-teal-700'
          : 'text-xs font-medium text-gray-800 text-right'
      }
    >
      {isText
        ? (value ?? '-')
        : value != null
          ? `${formatNumber(value as number, decimals)}${pct ? '%' : ''}`
          : '-'}
    </span>
  </div>
);

export default LeaseholdBreakdown360;
