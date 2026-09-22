import type { DCFAssumption, DCFMethod } from '../../types/dcf';
import { MethodProportion } from './dcfMethods/MethodProportion';
import { MethodSpecifiedRoomIncomePerDay } from './dcfMethods/MethodSpecifiedRoomIncomePerDay';
import { mapDCFMethodCodeToSystemType } from '../../domain/mapDCFMethodCodeToSystemType';
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
import { MethodSpecifiedRoomIncomeBySeasonalRates } from './dcfMethods/MethodSpecifiedRoomIncomeBySeasonalRates';
import { MethodParameterBasedOnTierOfPropertyValue } from './dcfMethods/MethodParameterBasedOnTierOfPropertyValue';

interface DiscountedCashFlowMethodRendererProps {
  name: string;
  editing: string | null;
  expanded: boolean;
  assumption: DCFAssumption;
  method: DCFMethod;
  totalNumberOfYear: number;
  isReadOnly?: boolean;
}
export function DiscountedCashFlowMethodRenderer({
  name,
  editing,
  expanded,
  assumption,
  method,
  totalNumberOfYear,
  isReadOnly,
}: DiscountedCashFlowMethodRendererProps) {
  const props = {
    name: name,
    editing: editing,
    expanded: expanded,
    totalNumberOfYears: totalNumberOfYear,
    method: method,
    assumptionId: assumption.clientId,
    assumptionName: assumption.assumptionName,
    assumptionType: assumption.assumptionType,
    isReadOnly: isReadOnly,
    // Expanded-assumption breakdown lines (mock's tr.dtl): the label td spans both
    // sticky columns via colSpan={2} — added on each of the ~13 Method* components that
    // render `<td className={baseStyles.rowHeader}>`, since colSpan is a JSX attribute
    // on that element itself and can't be smuggled in through a className string. Left
    // padding is the mock's `tr.dtl td.stkw{padding-left:36px}` (mock:695); font/color is
    // `tr.dtl td{color:ink-3;font-size:11px}` (mock:694) — the one place these detail
    // rows deviate from the table's 12px base.
    baseStyles: {
      rowHeader:
        'pl-[36px] pr-[8px] py-0 h-[26px] text-[11px] leading-[25px] text-gray-500 border-b border-gray-300 max-w-[490px] whitespace-nowrap overflow-hidden text-ellipsis [&_*]:whitespace-nowrap [&_span]:text-[11px]',
      rowBody:
        'px-[8px] py-0 h-[26px] text-[11px] leading-[25px] text-right text-gray-500 border-b border-gray-300',
    },
  };

  const systemMethodType = mapDCFMethodCodeToSystemType(method.methodType);
  switch (systemMethodType) {
    case 'specifiedRoomIncomePerDay':
      return <MethodSpecifiedRoomIncomePerDay {...props} />;
    case 'specifiedRoomIncomeBySeasonalRates':
      return <MethodSpecifiedRoomIncomeBySeasonalRates {...props} />;
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
      return <MethodParameterBasedOnTierOfPropertyValue {...props} />;
    case 'specifiedEnergyCostIndex':
      return <MethodSpecifiedEnergyCostIndex {...props} />;
    case 'proportionOfTheNewReplacementCost':
      return <MethodProportionOfTheNewReplacementCost {...props} />;
    case 'proportion':
      return <MethodProportion {...props} />;
    case 'specifiedValueWithGrowth':
      return <MethodSpecifiedValueWithGrowth {...props} />;
    default:
      return <></>;
  }
}
