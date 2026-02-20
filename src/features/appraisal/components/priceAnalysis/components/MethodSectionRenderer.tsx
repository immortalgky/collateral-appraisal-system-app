import { WQSMethodPanel } from './WQSMethodPanel';
import { SaleAdjustmentGridPanel } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/components/SaleAdjustmentGridPanel.tsx';
import { DirectComparisonPanel } from '../features/directComparison/components/DirectComparisonPanel';
import type { PriceAnalysisSelectorState } from '@features/appraisal/components/priceAnalysis/features/selection/domain/useReducer.tsx';

interface MethodSectionRendererProps {
  state: PriceAnalysisSelectorState;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function MethodSectionRenderer({
  state,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: MethodSectionRendererProps) {
  console.log('surveys', state.marketSurveys);
  switch (state.activeMethod?.methodType) {
    case 'WQS_MARKET': {
      return (
        <WQSMethodPanel
          state={state}
          onCalculationMethodDirty={onCalculationMethodDirty}
          onCancelCalculationMethod={onCancelCalculationMethod}
        />
      );
    }
    case 'SAG_MARKET':
      return (
        <SaleAdjustmentGridPanel
          state={state}
          onCalculationMethodDirty={onCalculationMethodDirty}
          onCancelCalculationMethod={onCancelCalculationMethod}
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
