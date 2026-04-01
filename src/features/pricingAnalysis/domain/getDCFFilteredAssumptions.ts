import type { FieldValues, UseFormGetValues } from 'react-hook-form';
import type { DCFAssumption, DCFCategory, DCFSection } from '../types/dcf';

type Result = {
  section: DCFSection;
  category: DCFCategory;
  assumption: DCFAssumption;
};

type Predicate = (assumption: DCFAssumption, category: DCFCategory, section: DCFSection) => boolean;

export function getDCFFilteredAssumptions(
  getValues: UseFormGetValues<FieldValues>,
  predicate?: Predicate, // optional — if omitted, return everything
): Result[] {
  const form = getValues();
  const results: Result[] = [];

  for (const section of form.sections) {
    if (!section.categories) continue;

    for (const category of section.categories) {
      if (!category.assumptions) continue; // guard added

      for (const assumption of category.assumptions) {
        const shouldInclude = predicate ? predicate(assumption, category, section) : true;

        if (shouldInclude) {
          results.push({ assumption, category, section });
        }
      }
    }
  }

  return results;
}
