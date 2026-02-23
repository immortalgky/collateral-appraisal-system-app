import { ALL_FACTORS } from '@features/appraisal/components/priceAnalysis/data/allFactorsData.ts';

export const getFactorDesciption = (factorCode: string) => {
  const factors = new Map(ALL_FACTORS.map(factor => [factor.factorCode, factor.factorName]));
  return factors.get(factorCode) ?? null;
};
