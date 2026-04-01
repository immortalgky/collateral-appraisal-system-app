import { useMemo } from 'react';
import type { DCFMethod, DCFSection } from '../../types/dcf';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import {
  buildMethodPositionBasedSalaryCalculationDerviedRules,
  buildMethodSpecifiedRoomIncomePerDayDerivedRules,
  buildMethodSpecifiedRoomIncomeWithGrowthByOccupancyRateDerivedRules,
  buildMethodSpecifiedRoomIncomeWithGrowthDerivedRules,
} from '../../adapters/buildDiscountedCashFlowDerivedRules';

type MethodType = DCFMethod['methodType'];

type MethodRuleBuilder = (args: {
  name: string;
  sections: DCFSection[];
  totalNumberOfYears: number;
}) => DerivedFieldRule[];

const methodCalculators: Partial<Record<MethodType, MethodRuleBuilder>> = {
  '01': buildMethodSpecifiedRoomIncomePerDayDerivedRules,
  '03': buildMethodSpecifiedRoomIncomeWithGrowthDerivedRules,
  '04': buildMethodSpecifiedRoomIncomeWithGrowthByOccupancyRateDerivedRules,
  '09': buildMethodPositionBasedSalaryCalculationDerviedRules,
};

function buildCalculationRules(
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
          sections,
          totalNumberOfYears,
        });
      });
    });
  });
}

export function useCalculations(sections: DCFSection[] = [], totalNumberOfYears: number) {
  const rules = useMemo(
    () => buildCalculationRules(sections, totalNumberOfYears),
    [sections, totalNumberOfYears],
  );

  console.log(rules);
  useDerivedFields({ rules });
}
