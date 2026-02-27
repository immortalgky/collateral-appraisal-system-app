import type { FactorDataType } from '../schemas';

export const getFactorDesciption = (
  factorCode: string,
  allFactors: FactorDataType[] = [],
) => {
  const factors = new Map(allFactors.map(factor => [factor.factorCode, factor.factorName]));
  return factors.get(factorCode) ?? null;
};
