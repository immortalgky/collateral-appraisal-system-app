import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useGetMachineCostItems } from '@features/pricingAnalysis/api';

interface Props {
  pricingAnalysisId: string;
  methodId: string;
  isExpanded: boolean;
}

const MachineryCostBreakdown360 = ({ pricingAnalysisId, methodId, isExpanded }: Props) => {
  const { data, isLoading, isError } = useGetMachineCostItems(
    isExpanded ? pricingAnalysisId : undefined,
    isExpanded ? methodId : undefined,
  );

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Icon
          name="spinner"
          style="solid"
          className="w-4 h-4 animate-spin text-(--palette-gray-400)"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Icon name="circle-exclamation" style="solid" className="w-4 h-4 text-red-400" />
        <p className="text-xs text-(--palette-danger)">Failed to load machinery cost details.</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="text-xs text-(--palette-gray-400) py-2">No machinery cost items recorded.</p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-(--palette-gray-500) uppercase">
        Machinery Cost Items
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-(--palette-surface-3)">
              <th className="text-xs px-2 py-1.5 text-left font-semibold text-(--palette-gray-500)">
                Property
              </th>
              <th className="text-xs px-2 py-1.5 text-right font-semibold text-(--palette-gray-500)">
                RCN
              </th>
              <th className="text-xs px-2 py-1.5 text-right font-semibold text-(--palette-ink-2)">
                Life (yrs)
              </th>
              <th className="text-xs px-2 py-1.5 text-right font-semibold text-(--palette-gray-500)">
                Condition
              </th>
              <th className="text-xs px-2 py-1.5 text-right font-semibold text-(--palette-gray-500)">
                Func. Obs.
              </th>
              <th className="text-xs px-2 py-1.5 text-right font-semibold text-(--palette-gray-500)">
                Econ. Obs.
              </th>
              <th className="text-xs px-2 py-1.5 text-right font-semibold text-(--palette-gray-500)">
                FMV
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--palette-line-soft)">
            {data.items.map(item => (
              <tr key={item.id}>
                <td className="px-2 py-1.5 text-(--palette-ink)">
                  {item.propertyName ?? (
                    <span className="font-mono text-(--palette-gray-500)">
                      {item.appraisalPropertyId.slice(0, 8)}…
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right text-(--palette-gray-600)">
                  {item.rcnReplacementCost != null ? formatNumber(item.rcnReplacementCost, 2) : '-'}
                </td>
                <td className="px-2 py-1.5 text-right text-(--palette-gray-600)">
                  {item.lifeSpanYears != null ? item.lifeSpanYears : '-'}
                </td>
                <td className="px-2 py-1.5 text-right text-(--palette-gray-600)">
                  {formatNumber(item.conditionFactor, 4)}
                </td>
                <td className="px-2 py-1.5 text-right text-(--palette-gray-600)">
                  {formatNumber(item.functionalObsolescence, 4)}
                </td>
                <td className="px-2 py-1.5 text-right text-(--palette-gray-600)">
                  {formatNumber(item.economicObsolescence, 4)}
                </td>
                <td className="px-2 py-1.5 text-right font-medium text-(--palette-ink)">
                  {item.fairMarketValue != null ? formatNumber(item.fairMarketValue, 2) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-(--palette-accent-wash) border-t border-(--palette-accent-line)">
              <td colSpan={6} className="px-2 py-1.5 text-xs font-semibold text-(--palette-ink)">
                Total FMV
              </td>
              <td className="px-2 py-1.5 text-right text-sm font-bold text-(--palette-accent-ink)">
                {formatNumber(data.totalFmv, 2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {data.remark && (
        <p className="text-xs text-(--palette-gray-500) italic border-l-2 border-(--palette-line) pl-2">
          {data.remark}
        </p>
      )}
    </div>
  );
};

export default MachineryCostBreakdown360;
