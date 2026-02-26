import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import { SaleAdjustmentGridPanel } from '@features/pricingAnalysis/components/SaleAdjustmentGridPanel.tsx';
import { DirectComparisonPanel } from '@features/pricingAnalysis/components/DirectComparisonPanel.tsx';
import { WQSPanel } from '@features/pricingAnalysis/components/WQSPanel.tsx';
import type { PricingServerData } from '../types/selection';
import type {
  GetComparativeFactorsResponseType,
  TemplateDetailType,
} from '../schemas';

interface MethodSectionRendererProps {
  state: SelectionState;
  serverData: PricingServerData;
  calculationMethodData: {
    pricingTemplate: TemplateDetailType[] | null | undefined;
    comparativeFactors: GetComparativeFactorsResponseType | undefined;
  };
  onCalculationSave: (payload: { approachType: string; methodType: string; appraisalValue: number }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function MethodSectionRenderer({
  state,
  serverData,
  calculationMethodData,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: MethodSectionRendererProps) {
  const panelProps = {
    activeMethod: state.activeMethod,
    property: serverData.properties,
    marketSurveys: serverData.marketSurveyDetails,
    allFactors: serverData.allFactors,
    methodTemplates: calculationMethodData.pricingTemplate,
    onCalculationSave,
    onCalculationMethodDirty,
    onCancelCalculationMethod,
  };

  switch (state.activeMethod?.methodType) {
    case 'WQS_MARKET':
      return <WQSPanel {...panelProps} />;
    case 'SAG_MARKET':
      return <SaleAdjustmentGridPanel {...panelProps} />;
    case 'DC_MARKET':
      return <DirectComparisonPanel {...panelProps} />;
    default:
      return <></>;
  }
}
