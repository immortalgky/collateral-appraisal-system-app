import { COLLATERAL_TYPE } from '../data/data';

export const useGetCollateralTypeDescription = (id: string) => {
  const factors = new Map(COLLATERAL_TYPE.map(factor => [factor.value, factor.label]));
  return factors.get(id) ?? null;
};
