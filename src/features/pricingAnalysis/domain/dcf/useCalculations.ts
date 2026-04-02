import { useMemo } from 'react';
import type { DCFMethod, DCFSection } from '../../types/dcf';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import {
  buildMethodPositionBasedSalaryCalculationDerviedRules,
  buildMethodProportionDerivedRules,
  buildMethodProportionOfTheNewReplacementCostDerivedRules,
  buildMethodRoomCostBasedOnExpensesPerRoomPerDayDerivedRules,
  buildMethodRoomCostBasedOnExpensesPerRoomPerDayDerivedRulesDerivedRules,
  buildMethodSpecifiedEnergyCostIndexDerivedRules,
  buildMethodSpecifiedRentalIncomePerMonthDerivedRules,
  buildMethodSpecifiedRentalIncomePerSquareMeterDerivedRules,
  buildMethodSpecifiedRoomIncomePerDayDerivedRules,
  buildMethodSpecifiedRoomIncomeWithGrowthByOccupancyRateDerivedRules,
  buildMethodSpecifiedRoomIncomeWithGrowthDerivedRules,
  buildMethodSpecifiedValueWithGrowthDerivedRules,
} from '../../adapters/buildDiscountedCashFlowDerivedRules';

type MethodType = DCFMethod['methodType'];

type MethodRuleBuilder = (args: { name: string; totalNumberOfYears: number }) => DerivedFieldRule[];

const methodCalculators: Partial<Record<MethodType, MethodRuleBuilder>> = {
  '01': buildMethodSpecifiedRoomIncomePerDayDerivedRules,
  // '02'
  '03': buildMethodSpecifiedRoomIncomeWithGrowthDerivedRules,
  '04': buildMethodSpecifiedRoomIncomeWithGrowthByOccupancyRateDerivedRules,
  '05': buildMethodSpecifiedRentalIncomePerMonthDerivedRules,
  '06': buildMethodSpecifiedRentalIncomePerSquareMeterDerivedRules,
  '07': buildMethodRoomCostBasedOnExpensesPerRoomPerDayDerivedRules,
  '08': buildMethodRoomCostBasedOnExpensesPerRoomPerDayDerivedRulesDerivedRules,
  '09': buildMethodPositionBasedSalaryCalculationDerviedRules,
  // // '10':
  '11': buildMethodSpecifiedEnergyCostIndexDerivedRules,
  '12': buildMethodProportionOfTheNewReplacementCostDerivedRules,
  '13': buildMethodProportionDerivedRules,
  '14': buildMethodSpecifiedValueWithGrowthDerivedRules,
  // '15':
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
