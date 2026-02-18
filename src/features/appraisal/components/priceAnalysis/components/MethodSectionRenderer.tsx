import { WQSMethodPanel } from '../features/wqs/components/WQSMethodPanel';
import { SaleAdjustmentGridPanel } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/components/SaleAdjustmentGridPanel.tsx';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas/v1';
import { DirectComparisonPanel } from '../features/directComparison/components/DirectComparisonPanel';
import type { PriceAnalysisSelectorState } from '@features/appraisal/components/priceAnalysis/features/selection/domain/useReducer.tsx';

interface MethodSectionRendererProps {
  state: PriceAnalysisSelectorState;
  onCalculationMethodDirty: (check: boolean) => void;
}

export function MethodSectionRenderer({
  state,
  onCalculationMethodDirty,
}: MethodSectionRendererProps) {
  console.log('surveys', state.marketSurveys);
  switch (state.activeMethod?.methodType) {
    case 'WQS_MARKET': {
      return (
        <WQSMethodPanel
          methodId={state.activeMethod?.methodId}
          methodType={state.activeMethod?.methodType}
          property={state.property}
          marketSurveys={state.marketSurveys}
          templates={state.methodTemplates}
          allFactors={state.allFactors}
          onCalculationMethodDirty={onCalculationMethodDirty}
        />
      );
    }
    case 'SAG_MARKET':
      return (
        <SaleAdjustmentGridPanel
          methodId={state.activeMethod?.methodId}
          methodType={state.activeMethod?.methodType}
          property={state.property}
          marketSurveys={state.marketSurveys}
          templates={state.methodTemplates}
          allFactors={state.allFactors}
        />
      );
    case 'DC_MARKET':
      return (
        <DirectComparisonPanel
          methodId={state.activeMethod?.methodId}
          methodType={state.activeMethod?.methodType}
          property={state.property}
          marketSurveys={state.marketSurveys}
          templates={state.methodTemplates}
          allFactors={state.allFactors}
        />
      );
    default:
      return <></>;
  }
}
