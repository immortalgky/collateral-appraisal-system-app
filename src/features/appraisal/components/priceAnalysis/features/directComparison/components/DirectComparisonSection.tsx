import { Button, CancelButton, Icon } from '@shared/components';
import { ComparativeSurveySection } from '@features/appraisal/components/priceAnalysis/features/directComparison/components/ComparativeSurveySection.tsx';
import { DirectComparisonCalculationSection } from '@features/appraisal/components/priceAnalysis/features/directComparison/components/DirectComparisonCalculationSection.tsx';
import { DirectComparisonAdjustAppraisalPriceSection } from '@features/appraisal/components/priceAnalysis/features/directComparison/components/DirectComparisonAdjustAppraisalPriceSection.tsx';
import { PriceAnalysisTemplateSelector } from '../../../shared/components/PriceAnalysisTemplateSelector';
import { MarketSurveySelectionModal } from '../../../shared/components/MarketSurveySelectionModal';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../../../schemas/v1';
import { ComparativeMarketSurveySection } from '../../../shared/components/ComparativeMarketSurveySection';

/**
 * NOTE:
 *
 * Workflow:
 * (1) System retrive method value from database to check whether has value or not
 * (1.1) In case that has value
 * - System can show retrieved value.
 * (1.2) In case that has no value
 * - System can initial value to prepared stages before user take action.
 *
 *
 */

interface DirectComparisonSectionProps {
  property: Record<string, unknown>;
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
}

export const DirectComparisonSection = ({
  property,
  marketSurveys,
  comparativeMarketSurveys,
  template,
  allFactors,
  onSelectComparativeMarketSurvey,
}: DirectComparisonSectionProps) => {
  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div
        id="form-scroll-container"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden gap-4 py-4"
      >
        <ComparativeMarketSurveySection
          template={template}
          allFactors={allFactors}
          property={property}
          marketSurveys={marketSurveys}
          comparativeMarketSurveys={comparativeMarketSurveys}
          onSelectComparativeMarketSurvey={onSelectComparativeMarketSurvey}
        />
        {comparativeMarketSurveys.length > 0 && (
          <>
            <div>
              <div className="text-lg border-b border-neutral-300 py-2">
                Calculation of Appraisal Value
              </div>
              <div className="px-4 mt-4">
                <DirectComparisonCalculationSection
                  property={property}
                  template={template}
                  comparativeSurveys={comparativeMarketSurveys}
                />
              </div>
            </div>
            <div>
              <div className="text-lg border-b border-neutral-300 py-2">Adjust Final Value</div>
              <div className="px-4 mt-4">
                <DirectComparisonAdjustAppraisalPriceSection property={property} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
