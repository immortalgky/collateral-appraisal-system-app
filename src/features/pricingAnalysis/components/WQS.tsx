import { AdjustFinalValueSection } from './WQSAdjustFinalValueSection';
import { ComparativeMarketSurveySection } from './ComparativeMarketSurveySection';
import { WQSScoringSection } from '@/features/pricingAnalysis/components/WQSScoringSection';
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
export const WQS = ({
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
          <ComparativeMarketSurveySection
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
                <div className="text-lg border-b border-neutral-300 py-2">
                  Calculation of Appraisal Value
                </div>
                <div className="px-4 mt-4">
                  <WQSScoringSection
                    comparativeSurveys={comparativeMarketSurveys}
                    property={property}
                    template={template}
                    isLoading={false}
                  />
                </div>
              </div>
              <div>
                <div className="text-lg border-b border-neutral-300 py-2">Adjust Final Value</div>
                <div className="px-4 mt-4">
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
