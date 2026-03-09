import { AdjustFinalValueSection } from './WQSAdjustFinalValueSection';
import { SurveySelectionSection } from './SurveySelectionSection';
import { WQSScoringSection } from '@/features/pricingAnalysis/components/WQSScoringSection';
import { WQSRSQSection } from './WQSRSQSection';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { wqsFieldPath } from '../adapters/wqsFieldPath';

interface WQSProps {
  property: Record<string, unknown>;
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
}
export const WQSForm = ({
  property,
  marketSurveys,
  comparativeMarketSurveys,
  template,
  allFactors,
  onSelectComparativeMarketSurvey,
}: WQSProps) => {
  const fieldPath = wqsFieldPath;

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
                  <h3 className="text-base font-semibold text-gray-800">Calculation of Appraisal Value</h3>
                </div>
                <div className="px-4">
                  <WQSScoringSection
                    comparativeSurveys={comparativeMarketSurveys}
                    property={property}
                    template={template}
                    isLoading={false}
                  />
                </div>
              </div>
              <div className="px-4">
                <WQSRSQSection comparativeSurveys={comparativeMarketSurveys} />
              </div>
              <div>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4 pt-2">
                  <h3 className="text-base font-semibold text-gray-800">Adjust Final Value</h3>
                </div>
                <div className="px-4">
                  <AdjustFinalValueSection property={property} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
