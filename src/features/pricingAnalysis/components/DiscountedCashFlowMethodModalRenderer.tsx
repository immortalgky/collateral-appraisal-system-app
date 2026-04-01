import { MethodPositionBasedSalaryCalculationModal } from './dcfMethods/MethodPositionBasedSalaryCalculationModal';
import { MethodProportionModal } from './dcfMethods/MethodProportionModal';
import { MethodProportionOfTheNewReplacementCost } from './dcfMethods/MethodProportionOfTheNewReplacementCost';
import { MethodProportionOfTheNewReplacementCostModal } from './dcfMethods/MethodProportionOfTheNewReplacementCostModal';
import { MethodRoomCostBasedOnExpensesPerRoomPerDayModal } from './dcfMethods/MethodRoomCostBasedOnExpensesPerRoomPerDayModal';
import { MethodSpecifiedEnergyCostIndexModal } from './dcfMethods/MethodSpecifiedEnergyCostIndexModal';
import { MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal } from './dcfMethods/MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal';
import { MethodSpecifiedRentalIncomePerMonthModal } from './dcfMethods/MethodSpecifiedRentalIncomePerMonthModal';
import { MethodSpecifiedRentalIncomePerSquareMeterModal } from './dcfMethods/MethodSpecifiedRentalIncomePerSquareMeterModal';
import { MethodSpecifyRoomIncomePerDayModal } from './dcfMethods/MethodSpecifiedRoomIncomePerDayModal';
import { MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal } from './dcfMethods/MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal';
import { MethodSpecifiedRoomIncomeWithGrowthModal } from './dcfMethods/MethodSpecifiedRoomIncomeWithGrowthModal';
import { MethodSpecifiedValueWithGrowthModal } from './dcfMethods/MethodSpecifiedValueWithGrowthModal';

interface DiscountedCashFlowModalRendererProps {
  name: string;
  methodType: string;
  getOuterFormValues: (name: string) => object;
  getInnerFormValues: (name: string) => object;
}
export function DiscountedCashFlowModalRenderer({
  name,
  methodType,
  getOuterFormValues,
}: DiscountedCashFlowModalRendererProps) {
  const props = { name, getOuterFormValues };

  console.log(methodType);

  switch (methodType) {
    case 'specifiedRoomIncomePerDay': {
      return <MethodSpecifyRoomIncomePerDayModal {...props} />;
    }
    case 'specifiedRoomIncomeBySeasonalRates':
      return <></>;
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
      return <></>;
    case 'specifiedEnergyCostIndex':
      return <MethodSpecifiedEnergyCostIndexModal {...props} />;
    case 'proportionOfTheNewReplacementCost':
      return <MethodProportionOfTheNewReplacementCostModal {...props} />;
    case 'proportion': {
      return <MethodProportionModal {...props} />;
    }
    case 'specifiedValueWithGrowth':
      return <MethodSpecifiedValueWithGrowthModal {...props} />;
    case 'grossOperatingProfit':
      return <></>;
    default: {
      return <></>;
    }
  }
}
