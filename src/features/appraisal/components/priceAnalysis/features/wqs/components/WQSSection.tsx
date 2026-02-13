import { AdjustFinalValueSection } from './AdjustFinalValueSection';
import { type WQSTemplate } from '../../../data/data';
import { ScoringTable } from './ScoringTable';
import { ComparativeMarketSurveySection } from '../../../shared/components/ComparativeMarketSurveySection';

interface WQSSectionProps {
  property: Record<string, unknown>;
  surveys: Record<string, unknown>[];
  comparativeSurveys: Record<string, unknown>[];
  template?: WQSTemplate;
  allFactors: Record<string, unknown>[];
  onSelectComparativeMarketSurvey: (surveys: Record<string, unknown>[]) => void;
  onShowComparativeDataSelection: (check: boolean) => void;
  showMarketSurveySelection: boolean;
}
export const WQSSection = ({
  property,
  surveys,
  comparativeSurveys,
  template,
  allFactors,
  onSelectComparativeMarketSurvey,
  onShowComparativeDataSelection,
  showMarketSurveySelection,
}: WQSSectionProps) => {
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
            marketSurveys={surveys}
            comparativeMarketSurveys={comparativeSurveys}
            onSelectComparativeMarketSurvey={onSelectComparativeMarketSurvey}
            onShowComparativeDataSelection={onShowComparativeDataSelection}
            showMarketSurveySelection={showMarketSurveySelection}
          />
          {comparativeSurveys?.length > 0 && (
            <div>
              <div>
                <div className="text-lg border-b border-neutral-300 py-2">
                  Calculation of Appraisal Value
                </div>
                <div className="px-4 mt-4">
                  <ScoringTable
                    comparativeSurveys={comparativeSurveys}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
