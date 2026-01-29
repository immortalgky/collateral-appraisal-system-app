import { ALL_FACTORS } from '../data/data';

export const getFactorDesciption = (id: string) => {
  const factors = new Map(ALL_FACTORS.map(factor => [factor.value, factor.description]));
  return factors.get(id) ?? null;
};
