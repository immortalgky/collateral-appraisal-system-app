import type { DCFAssumption, DCFCategory, DCFSection } from '../types/dcf';
import type { DerivedFieldRule } from './useDerivedFieldArray';

export function buildCalculateTotalIncomeDerivedRules(
  sections: DCFSection[] | undefined,
  totalNumberOfYears: number,
): DerivedFieldRule[] {
  return (sections ?? [])
    .filter(section => section.sectionType === 'income' || section.sectionType === 'expenses')
    .flatMap((section, sectionIdx) => {
      return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
        const name = `sections.${sectionIdx}`;
        return [
          {
            targetPath: `${name}.totalSectionValues.${idx}`,
            deps: [`${name}.categories`],
            compute: ({ getValues }) => {
              const categories = getValues(`${name}.categories`) ?? [];
              const totalCategoryValue = categories.reduce((prev, curr: DCFCategory) => {
                return prev + Number(curr.totalCategoryValues?.[idx] ?? 0);
              }, 0);

              console.log(totalCategoryValue);
              return Number(totalCategoryValue);
            },
          },
        ];
      });
    });
}

export function buildCalculateTotalCategoryDerivedRules(
  sections: DCFSection[] | undefined,
  totalNumberOfYears: number,
): DerivedFieldRule[] {
  return (sections ?? [])
    .filter(section => section.sectionType === 'income' || section.sectionType === 'expenses')
    .flatMap((section, sectionIdx) => {
      return (section.categories ?? []).flatMap((category, categoryIdx) => {
        return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
          const name = `sections.${sectionIdx}.categories.${categoryIdx}`;
          return {
            targetPath: `${name}.totalCategoryValues.${idx}`,
            deps: [`${name}.assumptions`],
            compute: ({ getValues }) => {
              const assumptions = getValues(`${name}.assumptions`) ?? [];
              return assumptions.reduce((prev: number, curr: DCFAssumption) => {
                return prev + Number(curr.totalAssumptionValues?.[idx] ?? 0);
              }, 0);
            },
          };
        });
      });
    });
}

export function buildCalculateTotalAssumptionDerivedRules(
  sections: DCFSection[] | undefined,
  totalNumberOfYears: number,
): DerivedFieldRule[] {
  return (sections ?? [])
    .filter(section => section.sectionType === 'income' || section.sectionType === 'expenses')
    .flatMap((section, sectionIdx) => {
      return (section.categories ?? []).flatMap((category, categoryIdx) => {
        return (category.assumptions ?? []).flatMap((assumption, assumptionIdx) => {
          return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
            const name = `sections.${sectionIdx}.categories.${categoryIdx}.assumptions.${assumptionIdx}`;
            return [
              {
                targetPath: `${name}.totalAssumptionValues.${idx}`,
                deps: [`${name}.method.totalMethodValues.${idx}`],
                compute: ({ getValues }) => {
                  const totalMethodValue =
                    getValues(`${name}.method.totalMethodValues.${idx}`) ?? 0;
                  return Number(totalMethodValue);
                },
              },
            ];
          });
        });
      });
    });
}
