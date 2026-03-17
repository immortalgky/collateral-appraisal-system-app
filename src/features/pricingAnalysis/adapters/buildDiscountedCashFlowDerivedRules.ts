import type { DerivedFieldRule } from './useDerivedFieldArray';

export function buildCalculateTotalIncomeDerivedRules(): DerivedFieldRule[] {
  return [
    {
      targetPath: '',
      deps: [],
      compute: ({ getValues }) => {},
    },
  ];
}
