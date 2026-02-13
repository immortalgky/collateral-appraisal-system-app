import { ComparativeSurveySection } from './ComparativeSurveySection';
import { MarketSurveySelectionModal } from './MarketSurveySelectionModal';

export function ComparativeMarketSurveySection({
  template,
  allFactors,
  property,
  marketSurveys,
  comparativeMarketSurveys,
  onSelectComparativeMarketSurvey,
  onShowComparativeDataSelection,
  showMarketSurveySelection,
}: {
  template?: WQSTemplate;
  allFactors: Record<string, unknown>[];
  property: Record<string, unknown>;
  marketSurveys: Record<string, unknown>[];
  comparativeMarketSurveys: Record<string, unknown>[];
  onSelectComparativeMarketSurvey: (surveys: Record<string, unknown>[]) => void;
  onShowComparativeDataSelection: (check: boolean) => void;
  showMarketSurveySelection: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg border-b border-neutral-300 py-2">Comparative Analysis</div>
      <div className="px-4 mt-4">
        <button
          type="button"
          onClick={() => onShowComparativeDataSelection(true)}
          className="w-[200px] border border-dashed border-primary text-primary hover:bg-primary/5 px-4 py-2 rounded-lg cursor-pointer"
        >
          Add Comparative Data
        </button>
        {showMarketSurveySelection && (
          <MarketSurveySelectionModal
            surveys={marketSurveys}
            comparativeSurveys={comparativeMarketSurveys}
            onSelect={onSelectComparativeMarketSurvey}
            onCancel={() => onShowComparativeDataSelection(false)}
          />
        )}
        <ComparativeSurveySection
          comparativeSurveys={comparativeMarketSurveys}
          property={property}
          allFactors={allFactors}
          template={template}
        />
      </div>
    </div>
  );
}
