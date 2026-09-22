import type { GetPricingAnalysisResponseType, PricingAnalysisConfigType } from '../schemas';
import type { Approach, Method } from '../types/selection';
import { COST_APPROACH_TYPE } from '../types/selection';

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
  // Residual (variant chosen inside the panel via template)
  Hypothesis: 'Hypothesis',
};

// Cost approach methods that share server types with Market
const COST_METHOD_SERVER_TO_CONFIG: Record<string, string> = {
  WQS: 'WQS_COST',
  SaleGrid: 'SAG_COST',
  DirectComparison: 'DC_COST',
};

/** Mirrors the server's PricingUnit vocabulary: PerSqWa/PerSqm price by area, PerUnit is a lumpsum. */
const isLandRateUnit = (unitType?: string | null) =>
  unitType === 'PerSqWa' || unitType === 'PerSqm';

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

        // valuePerUnit doubles as the calculated land rate, so only read it back as a manual
        // entry when the unit says it prices land by area. A PerUnit lumpsum carries no rate.
        landRatePerSqWa: isLandRateUnit(apiMethod?.unitType)
          ? (apiMethod?.valuePerUnit ?? null)
          : null,

        // Not yet in the generated MethodDto schema (v1.ts) — same cast PricingAnalysisPage
        // uses for the group-wide flag. `.passthrough()` lets the raw value survive the parse.
        useSystemCalc: (apiMethod as any)?.useSystemCalc ?? true,
        role: (apiMethod as any)?.role ?? null,
        linkedMethodId: (apiMethod as any)?.linkedMethodId ?? null,
        remark: (apiMethod as any)?.remark ?? null,
        updatedAt: (apiMethod as any)?.updatedAt ?? null,
      };
    }) as Method[];

    // ApproachDto carries no approach value, so it has to be re-derived here — and it must be
    // derived the same way the server does it (PricingAnalysisApproach.ComputeSelectedValue):
    // a Cost approach is the SUM of every selected method, one per role, because its value is
    // assembled from components (land + building + machinery). Every other approach type has
    // exactly one selected method, so the sum degenerates to that method's own value.
    //
    // Taking just `find(isSelected)` — the first selected method — is what made a Cost group
    // open showing only its land figure while the formula row beside it showed land + building,
    // and made the number change on its own as soon as any method was re-ticked (the reducer's
    // SUMMARY_SELECT_METHOD already sums correctly; only this load path did not).
    const selectedMethods = methods.filter(m => m.isSelected);
    const derivedApproachValue =
      confAppr.approachType === COST_APPROACH_TYPE
        ? selectedMethods.reduce((sum, m) => sum + (m.appraisalValue ?? 0), 0)
        : selectedMethods[0]?.appraisalValue;

    return {
      id: apiAppr?.id ?? confAppr.id, // safe fallback
      approachType: confAppr.approachType,
      label: confAppr.label ?? '',
      icon: confAppr.icon ?? 'image',
      appraisalValue: derivedApproachValue ?? confAppr.appraisalValue ?? 0,
      isSelected: apiAppr?.isSelected ?? apiAppr?.isCandidated ?? false,
      methods,
    };
  }) as Approach[];
}
