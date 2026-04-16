import type { DCFMethod, DCFSection } from '../../types/dcf';
import { type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import {
  buildMethodPositionBasedSalaryCalculationDerviedRules,
  buildMethodRoomCostBasedOnExpensesPerRoomPerDayDerivedRules,
  buildMethodSpecifiedEnergyCostIndexDerivedRules,
  buildMethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayDerivedRules,
  buildMethodSpecifiedRentalIncomePerMonthDerivedRules,
  buildMethodSpecifiedRentalIncomePerSquareMeterDerivedRules,
  buildMethodSpecifiedRoomIncomePerDayDerivedRules,
  buildMethodSpecifiedRoomIncomeWithGrowthByOccupancyRateDerivedRules,
  buildMethodSpecifiedRoomIncomeWithGrowthDerivedRules,
  buildMethodSpecifiedValueWithGrowthDerivedRules,
  buildSpecifiedRoomIncomeBySeasonalRatesDerivedRules,
} from '../../adapters/buildDiscountedCashFlowDerivedRules';

type MethodType = DCFMethod['methodType'];

type MethodRuleBuilder = (args: { name: string; totalNumberOfYears: number }) => DerivedFieldRule[];

const methodCalculators: Partial<Record<MethodType, MethodRuleBuilder>> = {
  '01': buildMethodSpecifiedRoomIncomePerDayDerivedRules,
  '02': buildSpecifiedRoomIncomeBySeasonalRatesDerivedRules,
  '03': buildMethodSpecifiedRoomIncomeWithGrowthDerivedRules,
  '04': buildMethodSpecifiedRoomIncomeWithGrowthByOccupancyRateDerivedRules,
  '05': buildMethodSpecifiedRentalIncomePerMonthDerivedRules,
  '06': buildMethodSpecifiedRentalIncomePerSquareMeterDerivedRules,
  '07': buildMethodRoomCostBasedOnExpensesPerRoomPerDayDerivedRules,
  '08': buildMethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayDerivedRules,
  '09': buildMethodPositionBasedSalaryCalculationDerviedRules,
  '11': buildMethodSpecifiedEnergyCostIndexDerivedRules,
  '14': buildMethodSpecifiedValueWithGrowthDerivedRules,
};

export function buildMethodCalculationRules(
  sections: DCFSection[] = [],
  totalNumberOfYears: number,
): DerivedFieldRule[] {
  return sections.flatMap((section, sectionIdx) => {
    const categories = section.categories ?? [];

    return categories.flatMap((category, categoryIdx) => {
      const assumptions = category.assumptions ?? [];

      return assumptions.flatMap((assumption, assumptionIdx) => {
        const methodType = assumption.method?.methodType;
        if (!methodType) return [];

        const buildRules = methodCalculators[methodType];
        if (!buildRules) return [];

        return buildRules({
          name: `sections.${sectionIdx}.categories.${categoryIdx}.assumptions.${assumptionIdx}.method`,
          totalNumberOfYears,
        });
      });
    });
  });
}
