import type { DCFAssumption, DCFMethod } from '../../types/dcf';
import { MethodProportion } from './dcfMethods/MethodProportion';
import { MethodSpecifiedRoomIncomePerDay } from './dcfMethods/MethodSpecifiedRoomIncomePerDay';
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

  // Switched on the code rather than the mapped name so TypeScript narrows `method` to the one
  // wrapper each component declares. Codes are mapDCFMethodCodeToSystemType's; '15'
  // (grossOperatingProfit) has no editor and falls through to nothing.
  switch (method.methodType) {
    case '01':
      return <MethodSpecifiedRoomIncomePerDay {...props} method={method} />;
    case '02':
      return <MethodSpecifiedRoomIncomeBySeasonalRates {...props} method={method} />;
    case '03':
      return <MethodSpecifiedRoomIncomeWithGrowth {...props} method={method} />;
    case '04':
      return <MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate {...props} method={method} />;
    case '05':
      return <MethodSpecifiedRentalIncomePerMonth {...props} method={method} />;
    case '06':
      return <MethodSpecifiedRentalIncomePerSquareMeter {...props} method={method} />;
    case '07':
      return <MethodRoomCostBasedOnExpensesPerRoomPerDay {...props} method={method} />;
    case '08':
      return <MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay {...props} method={method} />;
    case '09':
      return <MethodPositionBasedSalaryCalculation {...props} method={method} />;
    case '10':
      return <MethodParameterBasedOnTierOfPropertyValue {...props} method={method} />;
    case '11':
      return <MethodSpecifiedEnergyCostIndex {...props} method={method} />;
    case '12':
      return <MethodProportionOfTheNewReplacementCost {...props} method={method} />;
    case '13':
      return <MethodProportion {...props} method={method} />;
    case '14':
      return <MethodSpecifiedValueWithGrowth {...props} method={method} />;
    default:
      return <></>;
  }
}
