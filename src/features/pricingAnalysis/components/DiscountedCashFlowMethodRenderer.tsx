import { useWatch } from 'react-hook-form';
import type { DCFMethodFormType } from '../schemas/dcfForm';
import type { DCFMethod } from '../types/dcf';
import { MethodProportion } from './dcfMethods/MethodProportion';
import { MethodSpecifiedRoomIncomePerDay } from './dcfMethods/MethodSpecifiedRoomIncomePerDay';
import { mapDCFMethodCodeToSystemType } from '../domain/mapDCFMethodCodeToSystemType';
import { MethodSpecifiedValueWithGrowth } from './dcfMethods/MethodSpecifiedValueWithGrowth';

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

  const watchMethodType = useWatch({ name: `${name}.methodType` });
  const methodType = mapDCFMethodCodeToSystemType(watchMethodType);

  switch (methodType) {
    case 'specifiedRoomIncomePerDay':
      return <MethodSpecifiedRoomIncomePerDay {...props} />;
    case 'specifiedRoomIncomeBySeasonalRates':
      return <></>;
    case 'specifiedRoomIncomewithGrowth':
      return <></>;
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
