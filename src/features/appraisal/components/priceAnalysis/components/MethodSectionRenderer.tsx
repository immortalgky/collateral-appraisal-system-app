import { WQSMethodPanel } from '../features/wqs/components/WQSMethodPanel';
import { SaleAdjustmentGridPanel } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/components/SaleAdjustmentGridPanel.tsx';
import type { FactorDataType, MarketComparableDetailType } from '../schemas/v1';
import { useMemo } from 'react';
import { useGetPriceAnalysisTemplates } from '../api/api';
import { DirectComparisonPanel } from '../features/directComparison/components/DirectComparisonPanel';

export function MethodSectionRenderer({
  methodId,
  methodType,
  property,
  allFactors,
  marketSurveys,
  onCalculationMethodDirty,
}: {
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  allFactors: FactorDataType[];
  marketSurveys: MarketComparableDetailType[];
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
