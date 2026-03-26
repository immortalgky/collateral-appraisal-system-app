import { MethodProportionModal } from './dcfMethods/MethodProportionModal';
import { MethodSpecifyRoomIncomePerDayModal } from './dcfMethods/MethodSpecifiedRoomIncomePerDayModal';
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
    case 'specifiedRoomIncomewithGrowth':
      return <MethodSpecifiedRoomIncomeWithGrowthModal {...props} />;
    case 'specifiedRoomIncomewithGrowthbyOccupancyRate':
      return <></>;
    case 'specifiedRentalIncomePerMonth':
      return <></>;
    case 'specifiedRentalIncomePerSquareMeter':
      return <></>;
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
