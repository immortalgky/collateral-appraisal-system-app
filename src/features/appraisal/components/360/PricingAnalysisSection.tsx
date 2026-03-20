import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import ApproachMatrixTable from '../summary/ApproachMatrixTable';
import type { GetDecisionSummaryResponse } from '../../api/decisionSummary';

interface PricingAnalysisSectionProps {
  decisionSummary: GetDecisionSummaryResponse | undefined;
  isLoading: boolean;
  onGroupClick: (groupId: string) => void;
}

const PricingAnalysisSection = ({
  decisionSummary,
  isLoading,
  onGroupClick,
}: PricingAnalysisSectionProps) => {
  if (isLoading) {
    return (
      <FormCard title="Pricing Analysis" icon="table-cells" iconColor="teal">
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </FormCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Icon name="table-cells" style="solid" className="w-4 h-4 text-teal-500" />
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Pricing Analysis
        </h2>
      </div>

      {/* Approach Matrix */}
      <FormCard title="Decision Approach" icon="table-cells" iconColor="teal">
        {decisionSummary?.approachMatrix && decisionSummary.approachMatrix.length > 0 ? (
          <ApproachMatrixTable
            groups={decisionSummary.approachMatrix}
            onGroupClick={onGroupClick}
          />
        ) : (
          <p className="text-sm text-gray-500">No approach data available.</p>
        )}
      </FormCard>
    </div>
  );
};

export default PricingAnalysisSection;
