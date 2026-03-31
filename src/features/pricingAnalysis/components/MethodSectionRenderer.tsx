import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import { SaleAdjustmentGridPanel } from '@features/pricingAnalysis/components/SaleAdjustmentGridPanel.tsx';
import { DirectComparisonPanel } from '@features/pricingAnalysis/components/DirectComparisonPanel.tsx';
import { WQSPanel } from '@features/pricingAnalysis/components/WQSPanel.tsx';
import type { PricingServerData } from '../types/selection';
import type { GetComparativeFactorsResponseType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';
import { deriveGroupCollateralType } from '../domain/deriveGroupCollateralType';
import { CostMachinePanel } from './CostMachinePanel';

interface MethodSectionRendererProps {
  state: SelectionState;
  serverData: PricingServerData;
  calculationMethodData: {
    comparativeFactors: GetComparativeFactorsResponseType | undefined;
    templateList: TemplateDtoType[] | undefined;
  };
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
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
  const groupCollateralType = deriveGroupCollateralType(serverData.groupDetail?.properties ?? []);

  const filteredMarketSurveys = groupCollateralType
    ? serverData.marketSurveyDetails.filter(s => s.propertyType === groupCollateralType)
    : serverData.marketSurveyDetails;

  const panelProps = {
    activeMethod: state.activeMethod,
    property: serverData.properties,
    marketSurveys: filteredMarketSurveys,
    allFactors: serverData.allFactors,
    templateList: calculationMethodData.templateList,
    linkedComparables: calculationMethodData.comparativeFactors?.linkedComparables,
    savedComparativeFactors: calculationMethodData.comparativeFactors?.comparativeFactors,
    savedFactorScores: calculationMethodData.comparativeFactors?.factorScores,
    savedCalculations: calculationMethodData.comparativeFactors?.calculations,
    savedComparativeAnalysisTemplateId:
      calculationMethodData.comparativeFactors?.comparativeAnalysisTemplateId,
    savedMethodValue: calculationMethodData.comparativeFactors?.methodValue ?? null,
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
    case 'MC_COST':
      return <CostMachinePanel {...panelProps} />;
    case 'WQS_COST':
      return <WQSPanel {...panelProps} />;
    case 'SAG_COST':
      return <SaleAdjustmentGridPanel {...panelProps} />;
    case 'DC_COST':
      return <DirectComparisonPanel {...panelProps} />;
    default:
      return <></>;
  }
}
