import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../../schemas/v1';
import { ComparativeSurveySection } from './ComparativeSurveySection';
import { MarketSurveySelectionModal } from './MarketSurveySelectionModal';
import { useState } from 'react';

interface ComparativeMarketSurveySectionProps {
  property: Record<string, unknown>;
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
}
export function ComparativeMarketSurveySection({
  template,
  allFactors,
  property,
  marketSurveys,
  comparativeMarketSurveys,
  onSelectComparativeMarketSurvey,
}: ComparativeMarketSurveySectionProps) {
  const [isShowMarketSurveySelection, setShowMarketSurveySelection] = useState<boolean>(false);
  const handleOnClickAddComparativeSurvey = (check: boolean) => {
    setShowMarketSurveySelection(check);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg border-b border-neutral-300 py-2">Comparative Analysis</div>
      <div className="px-4 mt-4">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleOnClickAddComparativeSurvey(true)}
            className="w-[200px] border border-dashed border-primary text-primary font-medium hover:bg-primary/5 px-4 py-2 rounded-lg cursor-pointer"
          >
            Add Comparative Data
          </button>
          <ComparativeSurveySection
            comparativeMarketSurveys={comparativeMarketSurveys}
            property={property}
            allFactors={allFactors}
            template={template}
          />
        </div>
        {isShowMarketSurveySelection && (
          <MarketSurveySelectionModal
            surveys={marketSurveys}
            comparativeSurveys={comparativeMarketSurveys}
            onSelect={onSelectComparativeMarketSurvey}
            onCancel={() => handleOnClickAddComparativeSurvey(false)}
          />
        )}
      </div>
    </div>
  );
}
