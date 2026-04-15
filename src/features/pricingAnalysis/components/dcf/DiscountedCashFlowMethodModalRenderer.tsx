import { MethodParameterBasedOnTierOfPropertyValueModal } from './dcfMethods/MethodParameterBasedOnTierOfPropertyValueModal';
import { MethodPositionBasedSalaryCalculationModal } from './dcfMethods/MethodPositionBasedSalaryCalculationModal';
import { MethodProportionModal } from './dcfMethods/MethodProportionModal';
import { MethodProportionOfTheNewReplacementCostModal } from './dcfMethods/MethodProportionOfTheNewReplacementCostModal';
import { MethodRoomCostBasedOnExpensesPerRoomPerDayModal } from './dcfMethods/MethodRoomCostBasedOnExpensesPerRoomPerDayModal';
import { MethodSpecifiedEnergyCostIndexModal } from './dcfMethods/MethodSpecifiedEnergyCostIndexModal';
import { MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal } from './dcfMethods/MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal';
import { MethodSpecifiedRentalIncomePerMonthModal } from './dcfMethods/MethodSpecifiedRentalIncomePerMonthModal';
import { MethodSpecifiedRentalIncomePerSquareMeterModal } from './dcfMethods/MethodSpecifiedRentalIncomePerSquareMeterModal';
import { MethodSpecifiedRoomIncomeBySeasonalRatesModal } from './dcfMethods/MethodSpecifiedRoomIncomeBySeasonalRatesModal';
import { MethodSpecifyRoomIncomePerDayModal } from './dcfMethods/MethodSpecifiedRoomIncomePerDayModal';
import { MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal } from './dcfMethods/MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal';
import { MethodSpecifiedRoomIncomeWithGrowthModal } from './dcfMethods/MethodSpecifiedRoomIncomeWithGrowthModal';
import { MethodSpecifiedValueWithGrowthModal } from './dcfMethods/MethodSpecifiedValueWithGrowthModal';
import type { UseFormGetValues } from 'react-hook-form';
import type { FormValues } from '@features/appraisal/components/tables/bType.tsx';

interface DiscountedCashFlowModalRendererProps {
  name: string;
  methodType: string;
  properties: Record<string, unknown>[];
  getOuterFormValues: UseFormGetValues<FormValues>;
  isReadOnly: boolean;
}
export function DiscountedCashFlowModalRenderer({
  name,
  methodType,
  properties,
  getOuterFormValues,
  isReadOnly,
}: DiscountedCashFlowModalRendererProps) {
  const props = { name, properties, getOuterFormValues, isReadOnly };

  switch (methodType) {
    case 'specifiedRoomIncomePerDay': {
      return <MethodSpecifyRoomIncomePerDayModal {...props} />;
    }
    case 'specifiedRoomIncomeBySeasonalRates':
      return <MethodSpecifiedRoomIncomeBySeasonalRatesModal {...props} />;
    case 'specifiedRoomIncomeWithGrowth':
      return <MethodSpecifiedRoomIncomeWithGrowthModal {...props} />;
    case 'specifiedRoomIncomeWithGrowthByOccupancyRate':
      return <MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal {...props} />;
    case 'specifiedRentalIncomePerMonth':
      return <MethodSpecifiedRentalIncomePerMonthModal {...props} />;
    case 'specifiedRentalIncomePerSquareMeter':
      return <MethodSpecifiedRentalIncomePerSquareMeterModal {...props} />;
    case 'roomCostBasedOnExpensesPerRoomPerDay':
      return <MethodRoomCostBasedOnExpensesPerRoomPerDayModal {...props} />;
    case 'specifiedFoodAndBeverageExpensesPerRoomPerDay':
      return <MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal {...props} />;
    case 'positionBasedSalaryCalculation':
      return <MethodPositionBasedSalaryCalculationModal {...props} />;
    case 'parameterBasedOnTierOfPropertyValue':
      return <MethodParameterBasedOnTierOfPropertyValueModal {...props} />;
    case 'specifiedEnergyCostIndex':
      return <MethodSpecifiedEnergyCostIndexModal {...props} />;
    case 'proportionOfTheNewReplacementCost':
      return <MethodProportionOfTheNewReplacementCostModal {...props} />;
    case 'proportion': {
      return <MethodProportionModal {...props} />;
    }
    case 'specifiedValueWithGrowth':
      return <MethodSpecifiedValueWithGrowthModal {...props} />;
    default: {
      return <></>;
    }
  }
}
