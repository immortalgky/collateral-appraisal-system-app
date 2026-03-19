import { directComparisonPath } from '../adapters/directComparisonFieldPath';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { DirectComparisonScoringSection } from './DirectComparisonScoringSection';
import { SurveySelectionSection } from '@features/pricingAnalysis/components/SurveySelectionSection.tsx';
import { DirectComparisonAdjustAppraisalPriceSection } from '@features/pricingAnalysis/components/DirectComparisonAdjustAppraisalPriceSection.tsx';

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

interface DirectComparisonProps {
  property: Record<string, unknown>;
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
}

export const DirectComparisonForm = ({
  property,
  marketSurveys,
  comparativeMarketSurveys,
  template,
  allFactors,
  onSelectComparativeMarketSurvey,
}: DirectComparisonProps) => {
  const fieldPath = directComparisonPath;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div
        id="form-scroll-container"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden gap-4 py-4"
      >
        <div className="flex flex-col gap-4">
          <SurveySelectionSection
            template={template}
            allFactors={allFactors}
            property={property}
            marketSurveys={marketSurveys}
            comparativeMarketSurveys={comparativeMarketSurveys}
            fieldPath={fieldPath}
            onSelectComparativeMarketSurvey={onSelectComparativeMarketSurvey}
          />
          {comparativeMarketSurveys.length > 0 && (
            <>
              <div>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4 pt-2">
                  <h3 className="text-base font-semibold text-gray-800">
                    Calculation of Appraisal Value
                  </h3>
                </div>
                <div className="px-4">
                  <DirectComparisonScoringSection
                    property={property}
                    template={template}
                    comparativeSurveys={comparativeMarketSurveys}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4 pt-2">
                  <h3 className="text-base font-semibold text-gray-800">Adjust Final Value</h3>
                </div>
                <div className="px-4">
                  <DirectComparisonAdjustAppraisalPriceSection property={property} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
