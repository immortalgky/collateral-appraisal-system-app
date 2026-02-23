import { ComparativeMarketSurveySection } from '@/features/appraisal/components/priceAnalysis/components/ComparativeMarketSurveySection';
import { saleGridFieldPath } from '../adapters/saleAdjustmentGridfieldPath';
import { SaleAdjustmentGridScoringSection } from './SaleAdjustmentGridScoringSection';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '@features/appraisal/components/priceAnalysis/schemas/v1.ts';
import { SaleAdjustmentGridAdjustAppraisalPriceSection } from '@features/appraisal/components/priceAnalysis/components/SaleAdjustmentGridAdjustAppraisalPriceSection.tsx';
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

interface SaleAdjustmentGridProps {
  property: Record<string, unknown>;
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
}

export const SaleAdjustmentGrid = ({
  property,
  marketSurveys,
  comparativeMarketSurveys,
  template,
  allFactors,
  onSelectComparativeMarketSurvey,
}: SaleAdjustmentGridProps) => {
  const fieldPath = saleGridFieldPath;

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
                  <SaleAdjustmentGridScoringSection
                    comparativeSurveys={comparativeMarketSurveys}
                    property={property}
                    template={template}
                  />
                </div>
              </div>
              <div>
                <div className="text-lg border-b border-neutral-300 py-2">Adjust Final Value</div>
                <div className="px-4 mt-4">
                  <SaleAdjustmentGridAdjustAppraisalPriceSection property={property} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
