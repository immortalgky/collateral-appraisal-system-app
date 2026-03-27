import { MethodProportionModal } from './dcfMethods/MethodProportionModal';
import { MethodSpecifiedRentalIncomePerMonthModal } from './dcfMethods/MethodSpecifiedRentalIncomePerMonthModal';
import { MethodSpecifiedRentalIncomePerSquareMeterModal } from './dcfMethods/MethodSpecifiedRentalIncomePerSquareMeterModal';
import { MethodSpecifyRoomIncomePerDayModal } from './dcfMethods/MethodSpecifiedRoomIncomePerDayModal';
import { MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal } from './dcfMethods/MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal';
import { MethodSpecifiedRoomIncomeWithGrowthModal } from './dcfMethods/MethodSpecifiedRoomIncomewithGrowthModal';
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
      return <></>;
    case 'specifiedFoodAndBeverageExpensesPerRoomPerDay':
      return <></>;
    case 'positionBasedSalaryCalculation':
      return <></>;
    case 'parameterBasedOnTierOfPropertyValue':
      return <></>;
    case 'specifiedEnergyCostIndex':
      return <></>;
    case 'proportionOfTheNewReplacementCost':
      return <></>;
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
