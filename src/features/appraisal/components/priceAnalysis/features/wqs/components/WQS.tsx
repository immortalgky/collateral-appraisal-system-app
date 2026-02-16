import { AdjustFinalValueSection } from './AdjustFinalValueSection';
import { type WQSTemplate } from '../../../data/data';
import { ComparativeMarketSurveySection } from '../../../shared/components/ComparativeMarketSurveySection';
import { WQSScoringSection } from '@features/appraisal/components/priceAnalysis/features/wqs/components/WQSScoringSection.tsx';

interface WQSProps {
  property: Record<string, unknown>;
  marketSurveys: Record<string, unknown>[];
  comparativeMarketSurveys: Record<string, unknown>[];
  template?: WQSTemplate;
  allFactors: Record<string, unknown>[];
  onSelectComparativeMarketSurvey: (surveys: Record<string, unknown>[]) => void;
}
export const WQS = ({
  property,
  marketSurveys,
  comparativeMarketSurveys,
  template,
  allFactors,
  onSelectComparativeMarketSurvey,
}: WQSProps) => {
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
