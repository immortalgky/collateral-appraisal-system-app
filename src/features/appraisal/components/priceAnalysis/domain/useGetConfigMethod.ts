import type { MethodConfiguration } from '../features/selection/type';

const typeToConfigMethod: Record<string, string> = {
  L: 'land',
  LB: 'landAndBuilding',
  C: 'condo',
};

export function useGetConfigMethod(
  methodType: string,
  configuration: PriceAnalysisConfigType,
) {
  const configMethodType = typeToConfigMethod[methodType];
  return configuration;
}
