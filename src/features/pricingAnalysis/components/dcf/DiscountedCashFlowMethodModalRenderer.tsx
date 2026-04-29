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
  isReadOnly?: boolean;
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
    // Method 01
    case 'specifiedRoomIncomePerDay': {
      return <MethodSpecifyRoomIncomePerDayModal {...props} />;
    }
    // Method 02
    case 'specifiedRoomIncomeBySeasonalRates':
      return <MethodSpecifiedRoomIncomeBySeasonalRatesModal {...props} />;
    // Method 03
    case 'specifiedRoomIncomeWithGrowth':
      return <MethodSpecifiedRoomIncomeWithGrowthModal {...props} />;
    // Method 04
    case 'specifiedRoomIncomeWithGrowthByOccupancyRate':
      return <MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal {...props} />;
    // Method 05
    case 'specifiedRentalIncomePerMonth':
      return <MethodSpecifiedRentalIncomePerMonthModal {...props} />;
    // Method 06
    case 'specifiedRentalIncomePerSquareMeter':
      return <MethodSpecifiedRentalIncomePerSquareMeterModal {...props} />;
    // Method 07
    case 'roomCostBasedOnExpensesPerRoomPerDay':
      return <MethodRoomCostBasedOnExpensesPerRoomPerDayModal {...props} />;
    // Method 08
    case 'specifiedFoodAndBeverageExpensesPerRoomPerDay':
      return <MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal {...props} />;
    // Method 09
    case 'positionBasedSalaryCalculation':
      return <MethodPositionBasedSalaryCalculationModal {...props} />;
    // Method 10
    case 'parameterBasedOnTierOfPropertyValue':
      return <MethodParameterBasedOnTierOfPropertyValueModal {...props} />;
    // Method 11
    case 'specifiedEnergyCostIndex':
      return <MethodSpecifiedEnergyCostIndexModal {...props} />;
    // Method 12
    case 'proportionOfTheNewReplacementCost':
      return <MethodProportionOfTheNewReplacementCostModal {...props} />;
    // Method 13
    case 'proportion': {
      return <MethodProportionModal {...props} />;
    }
    // Method 14
    case 'specifiedValueWithGrowth':
      return <MethodSpecifiedValueWithGrowthModal {...props} />;
    default: {
      return <></>;
    }
  }
}
