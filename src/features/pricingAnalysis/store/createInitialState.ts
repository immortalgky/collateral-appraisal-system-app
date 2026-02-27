import type { GetPricingAnalysisResponseType, PriceAnalysisConfigType } from '../schemas';
import type { Approach, Method } from '../types/selection';

// Reverse mapping: server types → config types
// (forward mapping lives in saveEditingSelection.ts)
const SERVER_TO_CONFIG_APPROACH: Record<string, string> = {
  Market: 'MARAPPR',
  Cost: 'COSTAPPR',
  Income: 'INCOMEAPPR',
  Residual: 'RESAPPR',
};
const SERVER_TO_CONFIG_METHOD: Record<string, string> = {
  WQS: 'WQS_MARKET',
  SaleGrid: 'SAG_MARKET',
  DirectComparison: 'DC_MARKET',
};

/** Normalise an approach/method type so it matches the config key.
 *  If the value is already a config key (e.g. "MARAPPR") it passes through. */
const normalizeApproachType = (t: string) => SERVER_TO_CONFIG_APPROACH[t] ?? t;
const normalizeMethodType = (t: string) => SERVER_TO_CONFIG_METHOD[t] ?? t;

export function createInitialState(
  priceAnalysisConfig: PriceAnalysisConfigType[],
  priceAnalysisData: GetPricingAnalysisResponseType,
): Approach[] {
  const apiApproaches = priceAnalysisData?.approaches ?? [];
  const apiApproachByType = new Map(
    apiApproaches.map(a => [normalizeApproachType(a.approachType), a]),
  );

  return priceAnalysisConfig.map((confAppr: PriceAnalysisConfigType) => {
    const apiAppr = apiApproachByType.get(confAppr.approachType);

    const apiMethods = apiAppr?.methods ?? [];
    const apiMethodByType = new Map(
      apiMethods.map(m => [normalizeMethodType(m.methodType), m]),
    );

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
