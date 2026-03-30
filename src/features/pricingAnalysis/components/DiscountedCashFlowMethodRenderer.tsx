import type { DCFMethod } from '../types/dcf';
import { MethodProportion } from './dcfMethods/MethodProportion';
import { MethodSpecifiedRoomIncomePerDay } from './dcfMethods/MethodSpecifiedRoomIncomePerDay';
import { mapDCFMethodCodeToSystemType } from '../domain/mapDCFMethodCodeToSystemType';
import { MethodSpecifiedValueWithGrowth } from './dcfMethods/MethodSpecifiedValueWithGrowth';
import { MethodSpecifiedRoomIncomeWithGrowth } from './dcfMethods/MethodSpecifiedRoomIncomeWithGrowth';
import { MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate } from './dcfMethods/MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate';
import { MethodSpecifiedRentalIncomePerMonth } from './dcfMethods/MethodSpecifiedRentalIncomePerMonth';
import { MethodSpecifiedRentalIncomePerSquareMeter } from './dcfMethods/MethodSpecifiedRentalIncomePerSquareMeter';
import { MethodRoomCostBasedOnExpensesPerRoomPerDay } from './dcfMethods/MethodRoomCostBasedOnExpensesPerRoomPerDay';
import { MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay } from './dcfMethods/MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay';
import { MethodPositionBasedSalaryCalculation } from './dcfMethods/MethodPositionBasedSalaryCalculation';
import { MethodProportionOfTheNewReplacementCost } from './dcfMethods/MethodProportionOfTheNewReplacementCost';

interface DiscountedCashFlowMethodRendererProps {
  name: string;
  property: Record<string, unknown> | undefined;
  editing: string | null;
  expanded: boolean;
  assumptionId?: string | null;
  assumptionName: string;
  method: DCFMethod;
  totalNumberOfYear: number;
}
export function DiscountedCashFlowMethodRenderer({
  name,
  editing,
  expanded,
  property,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYear,
}: DiscountedCashFlowMethodRendererProps) {
  const props = {
    name: name,
    property: property,
    editing: editing,
    expanded: expanded,
    totalNumberOfYears: totalNumberOfYear,
    method: method,
    assumptionId: assumptionId,
    assumptionName: assumptionName,
  };

  const systemMethodType = mapDCFMethodCodeToSystemType(method.methodType);
  switch (systemMethodType) {
    case 'specifiedRoomIncomePerDay':
      return <MethodSpecifiedRoomIncomePerDay {...props} />;
    case 'specifiedRoomIncomeBySeasonalRates':
      return <></>;
    case 'specifiedRoomIncomeWithGrowth':
      return <MethodSpecifiedRoomIncomeWithGrowth {...props} />;
    case 'specifiedRoomIncomeWithGrowthByOccupancyRate':
      return <MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate {...props} />;
    case 'specifiedRentalIncomePerMonth':
      return <MethodSpecifiedRentalIncomePerMonth {...props} />;
    case 'specifiedRentalIncomePerSquareMeter':
      return <MethodSpecifiedRentalIncomePerSquareMeter {...props} />;
    case 'roomCostBasedOnExpensesPerRoomPerDay':
      return <MethodRoomCostBasedOnExpensesPerRoomPerDay {...props} />;
    case 'specifiedFoodAndBeverageExpensesPerRoomPerDay':
      return <MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay {...props} />;
    case 'positionBasedSalaryCalculation':
      return <MethodPositionBasedSalaryCalculation {...props} />;
    case 'parameterBasedOnTierOfPropertyValue':
      return <></>;
    case 'specifiedEnergyCostIndex':
      return <></>;
    case 'proportionOfTheNewReplacementCost':
      return <MethodProportionOfTheNewReplacementCost {...props} />;
    case 'proportion':
      return <MethodProportion {...props} />;
    case 'specifiedValueWithGrowth':
      return <MethodSpecifiedValueWithGrowth {...props} />;
    case 'grossOperatingProfit':
      return <></>;
    default:
      return <></>;
  }
}
