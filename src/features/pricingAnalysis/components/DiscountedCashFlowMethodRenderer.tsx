import { useWatch } from 'react-hook-form';
import type { DCFMethod } from '../types/dcf';
import { MethodProportion } from './dcfMethods/MethodProportion';
import { MethodSpecifiedRoomIncomePerDay } from './dcfMethods/MethodSpecifiedRoomIncomePerDay';
import { mapDCFMethodCodeToSystemType } from '../domain/mapDCFMethodCodeToSystemType';
import { MethodSpecifiedValueWithGrowth } from './dcfMethods/MethodSpecifiedValueWithGrowth';
import { MethodSpecifiedRoomIncomeWithGrowth } from './dcfMethods/MethodSpecifiedRoomIncomewithGrowth';
import { MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate } from './dcfMethods/MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate';
import { MethodSpecifiedRentalIncomePerMonth } from './dcfMethods/MethodSpecifiedRentalIncomePerMonth';
import { MethodSpecifiedRentalIncomePerSquareMeter } from './dcfMethods/MethodSpecifiedRentalIncomePerSquareMeter';

interface DiscountedCashFlowMethodRendererProps {
  name: string;
  editing: string | null;
  expanded: boolean;
  assumptionId?: string | null;
  assumptionName: string;
  method: DCFMethod;
  totalNumberOfYear: number;
  onCancelEditMode: () => void;
}
export function DiscountedCashFlowMethodRenderer({
  name,
  editing,
  expanded,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYear,
  onCancelEditMode,
}: DiscountedCashFlowMethodRendererProps) {
  const props = {
    name: name,
    editing: editing,
    expanded: expanded,
    totalNumberOfYears: totalNumberOfYear,
    method: method,
    assumptionId: assumptionId,
    assumptionName: assumptionName,
    onCancelEditMode: onCancelEditMode,
  };

  const methodType = mapDCFMethodCodeToSystemType(method.methodType);

  switch (methodType) {
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
