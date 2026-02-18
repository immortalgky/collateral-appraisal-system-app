import { WQSMethodPanel } from '../features/wqs/components/WQSMethodPanel';
import { SaleAdjustmentGridPanel } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/components/SaleAdjustmentGridPanel.tsx';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas/v1';
import { DirectComparisonPanel } from '../features/directComparison/components/DirectComparisonPanel';

interface MethodSectionRendererProps {
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  allFactors: FactorDataType[];
  marketSurveys: MarketComparableDetailType[];
  templates: TemplateDetailType[];
  onCalculationMethodDirty: (check: boolean) => void;
}

export function MethodSectionRenderer({
  methodId,
  methodType,
  property,
  allFactors,
  marketSurveys,
  templates,
  onCalculationMethodDirty,
}: MethodSectionRendererProps) {
  switch (methodType) {
    case 'WQS_MARKET': {
      return (
        <WQSMethodPanel
          methodId={methodId}
          methodType={methodType}
          property={property}
          marketSurveys={marketSurveys}
          templates={templates}
          allFactors={allFactors}
          onCalculationMethodDirty={onCalculationMethodDirty}
        />
      );
    }
    case 'SAG_MARKET':
      return (
        <SaleAdjustmentGridPanel
          methodId={methodId}
          methodType={methodType}
          property={property}
          marketSurveys={marketSurveys}
          templates={templates}
          allFactors={allFactors}
        />
      );
    case 'DC_MARKET':
      return (
        <DirectComparisonPanel
          methodId={methodId}
          methodType={methodType}
          property={property}
          marketSurveys={marketSurveys}
          templates={templates}
          allFactors={allFactors}
        />
      );
    default:
      return <></>;
  }
}
