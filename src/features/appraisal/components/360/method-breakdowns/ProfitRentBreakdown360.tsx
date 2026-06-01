import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useGetProfitRentAnalysis } from '@features/pricingAnalysis/api';
import type { ProfitRentCalculationDetail } from '@features/pricingAnalysis/types/profitRent';

interface Props {
  pricingAnalysisId: string;
  methodId: string;
  isExpanded: boolean;
}

const ProfitRentBreakdown360 = ({ pricingAnalysisId, methodId, isExpanded }: Props) => {
  const { data, isLoading, isError } = useGetProfitRentAnalysis(
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
        <p className="text-xs text-red-600">Failed to load profit rent analysis details.</p>
      </div>
    );
  }

  if (!data?.analysis) {
    return <p className="text-xs text-gray-400 py-2">No profit rent analysis available.</p>;
  }

  const a = data.analysis;

  return (
    <div className="space-y-4">
      {/* Input strip */}
      <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Inputs</p>
        <DlRow label="Market Rental Fee per Sq.Wa" value={a.marketRentalFeePerSqWa} />
        <DlRow label="Growth Rate Type" value={a.growthRateType} isText />
        <DlRow label="Growth Rate" value={a.growthRatePercent} pct />
        <DlRow label="Discount Rate" value={a.discountRate} pct />
        <DlRow label="Include Building Cost" value={a.includeBuildingCost ? 'Yes' : 'No'} isText />
      </div>

      {/* Output strip */}
      <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Outputs</p>
        <DlRow label="Total Market Rental Fee" value={a.totalMarketRentalFee} />
        <DlRow label="Total Contract Rental Fee" value={a.totalContractRentalFee} />
        <DlRow label="Total Returns From Lease" value={a.totalReturnsFromLease} />
        <DlRow label="Total Present Value" value={a.totalPresentValue} />
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
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500"># Months</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">
                    Mkt Fee/Sq.Wa
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Growth %</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Fee/Month</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Fee/Year</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">
                    Contract Fee/Year
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">Returns</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">PV Factor</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500">PV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {a.calculationDetails.map((row: ProfitRentCalculationDetail) => (
                  <tr key={row.year}>
                    <td className="px-2 py-1 text-right text-gray-700">{row.year}</td>
                    <td className="px-2 py-1 text-right text-gray-600">{row.numberOfMonths}</td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.marketRentalFeePerSqWa, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.marketRentalFeeGrowthPercent, 2)}%
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.marketRentalFeePerMonth, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.marketRentalFeePerYear, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.contractRentalFeePerYear, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.returnsFromLease, 2)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatNumber(row.pvFactor, 6)}
                    </td>
                    <td className="px-2 py-1 text-right font-medium text-gray-800">
                      {formatNumber(row.presentValue, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Building cost section */}
      {a.includeBuildingCost && (
        <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Building Cost</p>
          <DlRow label="Total Building Cost" value={a.totalBuildingCost} />
          <DlRow label="Appraisal Price" value={a.appraisalPriceWithBuilding} />
          <DlRow
            label="Estimate Price Rounded"
            value={a.appraisalPriceWithBuildingRounded}
            highlight
          />
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

export default ProfitRentBreakdown360;
