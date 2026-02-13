import type { WQSTemplate } from '../data/data';
import { DirectComparisonSection } from '../features/directComparison/components/DirectComparisonSection';
import { SaleAdjustmentGridSection } from '../features/saleAdjustmentGrid/components/SaleAdjustmentGridSection';
import { WQSMethodPanel } from '../features/wqs/components/WQSMethodPanel';

export function MethodSectionRenderer({
  methodId,
  methodType,
  property,
  templates,
  allFactors,
  marketSurveys,
  onCalculationMethodDirty,
}: {
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  templates?: WQSTemplate[];
  allFactors: Record<string, unknown>[];
  marketSurveys: Record<string, unknown>[];
  onCalculationMethodDirty: (check: boolean) => void;
}) {
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
        <SaleAdjustmentGridSection
          property={property}
          surveys={marketSurveys}
          onCalculationMethodDirty={onCalculationMethodDirty}
        />
      );
    case 'DC_MARKET':
      return (
        <DirectComparisonSection
          property={property}
          surveys={marketSurveys}
          onCalculationMethodDirty={onCalculationMethodDirty}
        />
      );
    default:
      return <></>;
  }
}
