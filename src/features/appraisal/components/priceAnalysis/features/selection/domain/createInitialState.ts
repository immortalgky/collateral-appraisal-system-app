import type { GetPricingAnalysisResponseType, PriceAnalysisConfigType } from '../../../schemas/v1';
import type { Approach, Method } from '../type';

export function createInitialState(
  priceAnalysisConfig: PriceAnalysisConfigType[],
  priceAnalysisData: GetPricingAnalysisResponseType,
): Approach[] {
  console.log(priceAnalysisData);
  console.log('matching!');
  const apiApproaches = priceAnalysisData?.approaches ?? [];
  const apiApproachByType = new Map(apiApproaches.map(a => [a.approachType, a]));

  return priceAnalysisConfig.map((confAppr: PriceAnalysisConfigType) => {
    const apiAppr = apiApproachByType.get(confAppr.approachType);

    const apiMethods = apiAppr?.methods ?? [];
    const apiMethodByType = new Map(apiMethods.map(m => [m.methodType, m])); // match by methodType

    return {
      id: apiAppr?.id ?? confAppr.id, // safe fallback
      approachType: confAppr.approachType,
      label: confAppr.label ?? '',
      icon: confAppr.icon ?? 'image',
      appraisalValue: apiAppr?.appraisalValue ?? confAppr.appraisalValue ?? 0,
      isCandidated: apiAppr?.isCandidated ?? false,

      methods: confAppr.methods.map(confMethod => {
        const apiMethod = apiMethodByType.get(confMethod.methodType);

        return {
          // If backend has its own method id, prefer it when present (useful for update/delete)
          id: apiMethod?.id ?? undefined,
          methodType: confMethod.methodType,
          label: confMethod.label ?? '',
          icon: confMethod.icon ?? 'image',

          // “selected” if it exists in API (since API stores only selected methods)
          isSelected: !!apiMethod,
          isCandidated: apiMethod?.isCandidated ?? false,
          appraisalValue: apiMethod?.appraisalValue ?? confMethod.appraisalValue ?? 0,
        };
      }) as Method[],
    };
  }) as Approach[];
}
