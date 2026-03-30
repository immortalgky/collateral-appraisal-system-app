import type { GetPricingAnalysisResponseType, PricingAnalysisConfigType } from '../schemas';
import type { Approach, Method } from '../types/selection';

// Reverse mapping: server types → config types
// (forward mapping lives in saveEditingSelection.ts)
const SERVER_TO_CONFIG_APPROACH: Record<string, string> = {
  Market: 'MARAPPR',
  Cost: 'COSTAPPR',
  Income: 'INCOMEAPPR',
  Residual: 'RESAPPR',
};
// Note: WQS/SaleGrid/DirectComparison map to MARKET variants by default.
// Cost variants (WQS_COST, etc.) share the same server type — disambiguation
// happens via the parent approach type, so these defaults work for the
// reverse lookup when the approach context is available.
const SERVER_TO_CONFIG_METHOD: Record<string, string> = {
  // Market (default when approach context not used)
  WQS: 'WQS_MARKET',
  SaleGrid: 'SAG_MARKET',
  DirectComparison: 'DC_MARKET',
  // Cost-specific
  BuildingCost: 'BC',
  ProfitRent: 'PR',
  Leasehold: 'LH',
  MachineryCost: 'MC_COST',
  // Income
  Income: 'I',
  // Residual
  Hypothesis: 'HYPO',
};

// Cost approach methods that share server types with Market
const COST_METHOD_SERVER_TO_CONFIG: Record<string, string> = {
  WQS: 'WQS_COST',
  SaleGrid: 'SAG_COST',
  DirectComparison: 'DC_COST',
};

/** Normalise an approach/method type so it matches the config key.
 *  If the value is already a config key (e.g. "MARAPPR") it passes through. */
const normalizeApproachType = (t: string) => SERVER_TO_CONFIG_APPROACH[t] ?? t;
const normalizeMethodType = (t: string, approachConfigType?: string) => {
  // For Cost approach, WQS/SaleGrid/DirectComparison map to _COST variants
  if (approachConfigType === 'COSTAPPR' && COST_METHOD_SERVER_TO_CONFIG[t]) {
    return COST_METHOD_SERVER_TO_CONFIG[t];
  }
  return SERVER_TO_CONFIG_METHOD[t] ?? t;
};

export function createInitialState(
  pricingAnalysisConfig: PricingAnalysisConfigType[],
  pricingAnalysisData: GetPricingAnalysisResponseType,
): Approach[] {
  const apiApproaches = pricingAnalysisData?.approaches ?? [];
  const apiApproachByType = new Map(
    apiApproaches.map(a => [normalizeApproachType(a.approachType), a]),
  );

  return pricingAnalysisConfig.map((confAppr: PricingAnalysisConfigType) => {
    const apiAppr = apiApproachByType.get(confAppr.approachType);

    const apiMethods = apiAppr?.methods ?? [];
    const apiMethodByType = new Map(
      apiMethods.map(m => [normalizeMethodType(m.methodType, confAppr.approachType), m]),
    );

    const methods = confAppr.methods.map(confMethod => {
      const apiMethod = apiMethodByType.get(confMethod.methodType);

      return {
        // If backend has its own method id, prefer it when present (useful for update/delete)
        id: apiMethod?.id ?? undefined,
        methodType: confMethod.methodType,
        label: confMethod.label ?? '',
        icon: confMethod.icon ?? 'image',

        // “included” if it exists in API (since API stores only included methods)
        isIncluded: !!apiMethod,
        isSelected: apiMethod?.isSelected ?? false,
        appraisalValue: apiMethod?.methodValue ?? confMethod.appraisalValue ?? 0,
      };
    }) as Method[];

    // Derive approach value from the candidated method (ApproachDto has no appraisalValue field)
    const selectedMethod = methods.find(m => m.isSelected);

    return {
      id: apiAppr?.id ?? confAppr.id, // safe fallback
      approachType: confAppr.approachType,
      label: confAppr.label ?? '',
      icon: confAppr.icon ?? 'image',
      appraisalValue: selectedMethod?.appraisalValue ?? confAppr.appraisalValue ?? 0,
      isSelected: apiAppr?.isSelected ?? apiAppr?.isCandidated ?? false,
      methods,
    };
  }) as Approach[];
}
