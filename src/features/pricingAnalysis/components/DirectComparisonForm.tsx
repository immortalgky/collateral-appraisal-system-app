import { useFormContext, useWatch } from 'react-hook-form';
import { useMemo } from 'react';
import { directComparisonPath } from '../adapters/directComparisonFieldPath';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { DirectComparisonScoringSection } from './DirectComparisonScoringSection';
import { SurveySelectionSection } from '@features/pricingAnalysis/components/SurveySelectionSection.tsx';
import { DirectComparisonAdjustAppraisalPriceSection } from '@features/pricingAnalysis/components/DirectComparisonAdjustAppraisalPriceSection.tsx';
import { CollapsibleFormSection } from './layout/CollapsibleFormSection';
import { KpiDashboard } from './viz/KpiDashboard';
import { ComparablePositionChart } from './viz/ComparablePositionChart';
import type { KpiItem } from './viz/KpiDashboard';
import type { ComparablePoint } from './viz/ComparablePositionChart';

interface DirectComparisonProps {
  isCostApproach: boolean;
  property: Record<string, unknown>;
  buildingCost?: Record<string, unknown>[];
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
}

export const DirectComparisonForm = ({
  isCostApproach,
  property,
  buildingCost,
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
              <DirectComparisonVizSection
                comparativeMarketSurveys={comparativeMarketSurveys}
                property={property}
              />

              <CollapsibleFormSection
                title="Calculation of Appraisal Value"
                icon="calculator"
                defaultOpen
              >
                <DirectComparisonScoringSection
                  property={property}
                  template={template}
                  comparativeSurveys={comparativeMarketSurveys}
                />
              </CollapsibleFormSection>

              <CollapsibleFormSection
                title="Adjust Final Value"
                icon="badge-dollar"
                defaultOpen
              >
                <DirectComparisonAdjustAppraisalPriceSection
                  property={property}
                  buildingCost={buildingCost}
                  isCostApproach={isCostApproach}
                />
              </CollapsibleFormSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function DirectComparisonVizSection({
  comparativeMarketSurveys,
  property,
}: {
  comparativeMarketSurveys: MarketComparableDetailType[];
  property: Record<string, unknown>;
}) {
  const { control } = useFormContext();
  const finalValue = useWatch({ control, name: 'directComparisonFinalValue.finalValue' });
  const finalValueRounded = useWatch({ control, name: 'directComparisonFinalValue.finalValueRounded' });
  const appraisalPrice = useWatch({ control, name: 'directComparisonAppraisalPrice.appraisalPriceRounded' });

  const toKpiValue = (n: number | null | undefined): number | null =>
    n != null && Number.isFinite(n) ? n : null;

  const primaryKpi: KpiItem = useMemo(() => ({
    label: 'Final Value',
    value: toKpiValue(Number(finalValueRounded)) ?? toKpiValue(Number(finalValue)),
    icon: 'badge-dollar',
    color: 'green',
  }), [finalValue, finalValueRounded]);

  const secondaryKpis: KpiItem[] = useMemo(() => [
    {
      label: 'Appraisal Price',
      value: toKpiValue(Number(appraisalPrice)),
      icon: 'chart-line-up',
      color: 'blue',
    },
    {
      label: 'Comparables',
      value: comparativeMarketSurveys.length > 0 ? comparativeMarketSurveys.length : null,
      icon: 'house-building',
      color: 'gray',
    },
  ], [appraisalPrice, comparativeMarketSurveys.length]);

  const chartPoints: ComparablePoint[] = useMemo(() => {
    const subjectArea = Number(property?.landArea ?? property?.usableArea ?? 0);
    const subjectPrice = subjectArea > 0 && Number(appraisalPrice)
      ? Number(appraisalPrice) / subjectArea
      : 0;

    const points: ComparablePoint[] = comparativeMarketSurveys.map((s) => ({
      name: String(s.projectName ?? s.id ?? 'Comp'),
      pricePerSqm: Number(s.offeringPrice ?? 0),
      adjustmentScore: 0,
    }));

    if (subjectPrice > 0) {
      points.push({
        name: 'Subject',
        pricePerSqm: subjectPrice,
        adjustmentScore: 0,
        isSubject: true,
      });
    }

    return points;
  }, [comparativeMarketSurveys, property, appraisalPrice]);

  return (
    <div className="flex flex-col gap-4">
      <KpiDashboard primary={primaryKpi} secondary={secondaryKpis} />
      {chartPoints.length > 1 && (
        <ComparablePositionChart points={chartPoints} title="Comparable Position" />
      )}
    </div>
  );
}
