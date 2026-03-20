import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { formatNumber } from '@/shared/utils/formatUtils';
import GovernmentPriceTable from '../summary/GovernmentPriceTable';
import type { GetDecisionSummaryResponse } from '../../api/decisionSummary';

interface DecisionSummarySectionProps {
  decisionSummary: GetDecisionSummaryResponse | undefined;
  isLoading: boolean;
}

const DecisionSummarySection = ({
  decisionSummary,
  isLoading,
}: DecisionSummarySectionProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Icon name="gavel" style="solid" className="w-4 h-4 text-sky-500" />
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Decision & Summary
        </h2>
      </div>

      {/* Appraisal Price Summary */}
      <FormCard title="Appraisal Price Summary" icon="coins" iconColor="amber">
        <div className="grid grid-cols-3 gap-6">
          <ReadOnlyField label="Total Appraisal Price" value={decisionSummary?.totalAppraisalPrice} />
          <ReadOnlyField label="Force Selling Price" value={decisionSummary?.forceSellingPrice} />
          <ReadOnlyField label="Building Insurance" value={decisionSummary?.buildingInsurance} />
        </div>
      </FormCard>

      {/* Government Appraisal Price */}
      <FormCard title="Government Appraisal Price" icon="landmark" iconColor="teal">
        {decisionSummary?.governmentPrices && decisionSummary.governmentPrices.length > 0 ? (
          <GovernmentPriceTable
            rows={decisionSummary.governmentPrices}
            totalArea={decisionSummary.governmentPriceTotalArea ?? 0}
            avgPerSqWa={decisionSummary.governmentPriceAvgPerSqWa ?? 0}
          />
        ) : (
          <p className="text-sm text-gray-500">No government price data available.</p>
        )}
      </FormCard>

    </div>
  );
};

const ReadOnlyField = ({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
      {value != null ? formatNumber(value, 2) : '-'}
    </div>
  </div>
);

export default DecisionSummarySection;
