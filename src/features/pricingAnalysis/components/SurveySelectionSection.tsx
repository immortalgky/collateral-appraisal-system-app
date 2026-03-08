import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { useState } from 'react';
import { ComparativeFactorTable } from './ComparativeFactorTable';
import { MarketSurveySelectionModal } from './MarketSurveySelectionModal';

interface SurveySelectionSectionProps {
  property: Record<string, unknown>;
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  fieldPath: Record<string, any>;
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
}
export function SurveySelectionSection({
  template,
  allFactors,
  property,
  marketSurveys,
  comparativeMarketSurveys,
  fieldPath,
  onSelectComparativeMarketSurvey,
}: SurveySelectionSectionProps) {
  const [isShowMarketSurveySelection, setShowMarketSurveySelection] = useState<boolean>(false);
  const handleOnClickAddComparativeSurvey = (check: boolean) => {
    setShowMarketSurveySelection(check);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4 pt-2">
        <h3 className="text-base font-semibold text-gray-800">Comparative Analysis</h3>
      </div>
      <div className="px-4">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleOnClickAddComparativeSurvey(true)}
            className="w-[250px] border border-dashed border-primary text-primary font-medium hover:bg-primary/5 px-4 py-2 rounded-lg cursor-pointer"
          >
            Add Comparative Data
          </button>
          <ComparativeFactorTable
            comparativeMarketSurveys={comparativeMarketSurveys}
            property={property}
            allFactors={allFactors}
            template={template}
            fieldPath={fieldPath}
          />
        </div>
        <MarketSurveySelectionModal
          isOpen={isShowMarketSurveySelection}
          surveys={marketSurveys}
          comparativeSurveys={comparativeMarketSurveys}
          onSelect={onSelectComparativeMarketSurvey}
          onCancel={() => handleOnClickAddComparativeSurvey(false)}
        />
      </div>
    </div>
  );
}
