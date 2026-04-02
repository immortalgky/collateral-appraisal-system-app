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
import { MethodSpecifiedEnergyCostIndex } from './dcfMethods/MethodSpecifiedEnergyCostIndex';

interface DiscountedCashFlowMethodRendererProps {
  name: string;
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
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYear,
}: DiscountedCashFlowMethodRendererProps) {
  const props = {
    name: name,
    editing: editing,
    expanded: expanded,
    totalNumberOfYears: totalNumberOfYear,
    method: method,
    assumptionId: assumptionId,
    assumptionName: assumptionName,
    baseStyles: {
      rowHeader: 'pl-24 px-1.5 h-12 text-sm text-gray-600 border-b border-gray-300',
      rowBody: 'px-1.5 h-12 text-sm text-right text-gray-600 border-b border-gray-300',
    },
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
      return <MethodSpecifiedEnergyCostIndex {...props} />;
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
