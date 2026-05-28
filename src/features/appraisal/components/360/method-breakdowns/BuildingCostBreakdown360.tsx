import { formatNumber } from '@/shared/utils/formatUtils';

interface Props {
  methodValue: number | null;
}

/**
 * Building cost method does not have a dedicated breakdown endpoint.
 * Detailed data lives on the property detail page.
 * This component shows only the method value as a summary placeholder.
 */
const BuildingCostBreakdown360 = ({ methodValue }: Props) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-teal-50 border border-teal-200">
        <span className="text-xs font-semibold text-gray-900">Method Value</span>
        <span className="text-sm font-bold text-teal-700">
          {methodValue != null ? formatNumber(methodValue, 2) : '-'}
        </span>
      </div>
      <p className="text-xs text-gray-400 italic">
        Detailed building cost breakdown is available on the property detail page.
      </p>
    </div>
  );
};

export default BuildingCostBreakdown360;
