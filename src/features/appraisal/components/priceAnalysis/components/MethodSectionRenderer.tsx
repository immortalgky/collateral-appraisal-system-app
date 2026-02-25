import type { PriceAnalysisSelectorState } from '@features/appraisal/components/priceAnalysis/features/selection/domain/useReducer.tsx';
import { SaleAdjustmentGridPanel } from '@features/appraisal/components/priceAnalysis/components/SaleAdjustmentGridPanel.tsx';
import { DirectComparisonPanel } from '@features/appraisal/components/priceAnalysis/components/DirectComparisonPanel.tsx';
import { WQSPanel } from '@features/appraisal/components/priceAnalysis/components/WQSPanel.tsx';

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
  switch (state.activeMethod?.methodType) {
    case 'WQS_MARKET': {
      return (
        <WQSPanel
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
          state={state}
          onCalculationMethodDirty={onCalculationMethodDirty}
          onCancelCalculationMethod={onCancelCalculationMethod}
        />
      );
    default:
      return <></>;
  }
}
