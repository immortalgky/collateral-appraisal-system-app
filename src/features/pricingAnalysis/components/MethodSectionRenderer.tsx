import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import { SaleAdjustmentGridPanel } from '@features/pricingAnalysis/components/SaleAdjustmentGridPanel.tsx';
import { DirectComparisonPanel } from '@features/pricingAnalysis/components/DirectComparisonPanel.tsx';
import { WQSPanel } from '@features/pricingAnalysis/components/WQSPanel.tsx';
import type { PricingServerData } from '../types/selection';
import type { GetComparativeFactorsResponseType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';
import { DiscountedCashFlowPanel } from './dcf/DiscountedCashFlowPanel';
import { deriveGroupCollateralType } from '../domain/deriveGroupCollateralType';
import { CostMachinePanel } from './CostMachinePanel';
import { LeaseholdPanel } from './LeaseholdPanel';
import { ProfitRentPanel } from './ProfitRentPanel';
import { HypothesisPanel } from './hypothesis/HypothesisPanel';
import { CostBuildingPanel } from './CostBuildingPanel';
import { findRentalSourceProperty } from '../utils/leaseProperty';

interface MethodSectionRendererProps {
  state: SelectionState;
  serverData: PricingServerData;
  appraisalId?: string;
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
  appraisalId,
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
    appraisalId: appraisalId,
    activeMethod: state.activeMethod,
    properties: serverData.properties,
    marketSurveys: filteredMarketSurveys,
    allFactors: serverData.allFactors,
    templateList: calculationMethodData.templateList,
    linkedComparables: calculationMethodData.comparativeFactors?.linkedComparables,
    savedComparativeFactors: calculationMethodData.comparativeFactors?.comparativeFactors,
    savedFactorScores: calculationMethodData.comparativeFactors?.factorScores,
    savedCalculations: calculationMethodData.comparativeFactors?.calculations,
    savedComparativeAnalysisTemplateId:
      calculationMethodData.comparativeFactors?.comparativeAnalysisTemplateId,
    savedFinalValueAdjusted:
      (calculationMethodData.comparativeFactors as any)?.finalValue?.finalValueAdjusted ?? null,
    savedLandValue:
      (calculationMethodData.comparativeFactors as any)?.finalValue?.landValue ?? null,
    savedMethodValue: (calculationMethodData.comparativeFactors as any)?.methodValue ?? null,
    onCalculationSave,
    onCalculationMethodDirty,
    onCancelCalculationMethod,
  };

  switch (state.activeMethod?.methodType) {
    case 'WQS_MARKET':
      return (
        <WQSPanel
          {...panelProps}
          savedBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.buildingValue ?? null
          }
          savedAppraisalPrice={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.appraisalPrice ?? null
          }
          savedHasBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.hasBuildingValue ?? null
          }
          savedIncludeLandArea={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.includeLandArea ?? null
          }
        />
      );
    case 'SAG_MARKET':
      return (
        <SaleAdjustmentGridPanel
          {...panelProps}
          savedBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.buildingValue ?? null
          }
          savedAppraisalPrice={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.appraisalPrice ?? null
          }
          savedHasBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.hasBuildingValue ?? null
          }
          savedIncludeLandArea={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.includeLandArea ?? null
          }
        />
      );
    case 'DC_MARKET':
      return (
        <DirectComparisonPanel
          {...panelProps}
          savedBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.buildingValue ?? null
          }
          savedAppraisalPrice={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.appraisalPrice ?? null
          }
          savedHasBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.hasBuildingValue ?? null
          }
          savedIncludeLandArea={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.includeLandArea ?? null
          }
        />
      );
    case 'I':
      return <DiscountedCashFlowPanel {...panelProps} />;
    case 'MC_COST':
      return (
        <CostMachinePanel
          {...panelProps}
          propertiesMap={serverData.propertiesMap}
          marketSurveys={filteredMarketSurveys}
          templateList={calculationMethodData.templateList}
        />
      );
    case 'WQS_COST':
      return (
        <WQSPanel
          {...panelProps}
          savedBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.buildingValue ?? null
          }
          savedAppraisalPrice={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.appraisalPrice ?? null
          }
          savedHasBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.hasBuildingValue ?? null
          }
          savedIncludeLandArea={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.includeLandArea ?? null
          }
        />
      );
    case 'SAG_COST':
      return (
        <SaleAdjustmentGridPanel
          {...panelProps}
          savedBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.buildingValue ?? null
          }
          savedAppraisalPrice={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.appraisalPrice ?? null
          }
          savedHasBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.hasBuildingValue ?? null
          }
          savedIncludeLandArea={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.includeLandArea ?? null
          }
        />
      );
    case 'BC':
      return <CostBuildingPanel {...panelProps} />;
    case 'DC_COST':
      return (
        <DirectComparisonPanel
          {...panelProps}
          savedBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.buildingValue ?? null
          }
          savedAppraisalPrice={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.appraisalPrice ?? null
          }
          savedHasBuildingCost={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.hasBuildingValue ?? null
          }
          savedIncludeLandArea={
            (calculationMethodData.comparativeFactors as any)?.finalValue?.includeLandArea ?? null
          }
        />
      );
    case 'LH': {
      // Source rental data from the rental-bearing property (a lease-agreement
      // property, or plain land rented out to others) rather than assuming
      // properties[0]. A mixed group only needs at least one such property.
      const leaseProperty = findRentalSourceProperty(serverData.groupDetail?.properties);
      return (
        <LeaseholdPanel
          {...panelProps}
          propertiesMap={serverData.propertiesMap}
          firstPropertyId={leaseProperty?.propertyId ?? undefined}
          firstPropertyType={leaseProperty?.propertyType ?? undefined}
          marketSurveys={filteredMarketSurveys}
          templateList={calculationMethodData.templateList}
        />
      );
    }
    case 'PR': {
      const leaseProperty = findRentalSourceProperty(serverData.groupDetail?.properties);
      return (
        <ProfitRentPanel
          {...panelProps}
          propertiesMap={serverData.propertiesMap}
          firstPropertyId={leaseProperty?.propertyId ?? undefined}
          firstPropertyType={leaseProperty?.propertyType ?? undefined}
          marketSurveys={filteredMarketSurveys}
          templateList={calculationMethodData.templateList}
        />
      );
    }
    case 'Hypothesis':
      return (
        <HypothesisPanel
          activeMethod={state.activeMethod}
          onCalculationSave={onCalculationSave}
          onCalculationMethodDirty={onCalculationMethodDirty}
          onCancelCalculationMethod={onCancelCalculationMethod}
        />
      );
    default:
      return <></>;
  }
}
