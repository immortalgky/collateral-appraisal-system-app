import type { TFunction } from 'i18next';

type HypothesisTFn = TFunction<'pricingAnalysis'>;

export function getLbTooltips(t: HypothesisTFn) {
  return {
    totalArea: t('hypothesisTooltips.lb.totalArea'),
    sellingArea: t('hypothesisTooltips.lb.sellingArea'),
    publicUtilityArea: t('hypothesisTooltips.lb.publicUtilityArea'),
    totalRevenue: t('hypothesisTooltips.lb.totalRevenue'),
    estSalesPeriod: t('hypothesisTooltips.lb.estSalesPeriod'),
    publicUtilityConstruction: t('hypothesisTooltips.lb.publicUtilityConstruction'),
    landFilling: t('hypothesisTooltips.lb.landFilling'),
    contingencyDev: t('hypothesisTooltips.lb.contingencyDev'),
    estConstructionPeriod: t('hypothesisTooltips.lb.estConstructionPeriod'),
    allocationPermitFee: t('hypothesisTooltips.lb.allocationPermitFee'),
    landTitleFee: t('hypothesisTooltips.lb.landTitleFee'),
    professionalFee: t('hypothesisTooltips.lb.professionalFee'),
    adminCost: t('hypothesisTooltips.lb.adminCost'),
    sellingAdv: t('hypothesisTooltips.lb.sellingAdv'),
    contingencyProject: t('hypothesisTooltips.lb.contingencyProject'),
    transferFee: t('hypothesisTooltips.lb.transferFee'),
    specificBizTax: t('hypothesisTooltips.lb.specificBizTax'),
    riskPremium: t('hypothesisTooltips.lb.riskPremium'),
    currentPropertyValue: t('hypothesisTooltips.lb.currentPropertyValue'),
    discountRate: t('hypothesisTooltips.lb.discountRate'),
    discountRateFactor: t('hypothesisTooltips.lb.discountRateFactor'),
    finalPropertyValue: t('hypothesisTooltips.lb.finalPropertyValue'),
    totalAssetValueRounded: t('hypothesisTooltips.lb.totalAssetValueRounded'),
    totalAssetValuePerSqWa: t('hypothesisTooltips.lb.totalAssetValuePerSqWa'),
  } as const;
}

export function getCondoTooltips(t: HypothesisTFn) {
  return {
    areaTitleDeed: t('hypothesisTooltips.condo.areaTitleDeed'),
    far: t('hypothesisTooltips.condo.far'),
    totalBuildingArea: t('hypothesisTooltips.condo.totalBuildingArea'),
    commonArea: t('hypothesisTooltips.condo.commonArea'),
    indoorSalesArea: t('hypothesisTooltips.condo.indoorSalesArea'),
    projectSalesArea: t('hypothesisTooltips.condo.projectSalesArea'),
    averageSellingPrice: t('hypothesisTooltips.condo.averageSellingPrice'),
    totalRevenue: t('hypothesisTooltips.condo.totalRevenue'),
    estSalesDuration: t('hypothesisTooltips.condo.estSalesDuration'),
    condoBuildingCost: t('hypothesisTooltips.condo.condoBuildingCost'),
    setAvgRoomSize: t('hypothesisTooltips.condo.setAvgRoomSize'),
    furniture: t('hypothesisTooltips.condo.furniture'),
    externalUtilities: t('hypothesisTooltips.condo.externalUtilities'),
    hardCostContingency: t('hypothesisTooltips.condo.hardCostContingency'),
    estConstructionPeriod: t('hypothesisTooltips.condo.estConstructionPeriod'),
    professionalFee: t('hypothesisTooltips.condo.professionalFee'),
    adminCost: t('hypothesisTooltips.condo.adminCost'),
    sellingAdv: t('hypothesisTooltips.condo.sellingAdv'),
    titleDeedFee: t('hypothesisTooltips.condo.titleDeedFee'),
    eiaCost: t('hypothesisTooltips.condo.eiaCost'),
    condoRegistrationFee: t('hypothesisTooltips.condo.condoRegistrationFee'),
    otherExpenses: t('hypothesisTooltips.condo.otherExpenses'),
    transferFee: t('hypothesisTooltips.condo.transferFee'),
    specificBizTax: t('hypothesisTooltips.condo.specificBizTax'),
    riskProfit: t('hypothesisTooltips.condo.riskProfit'),
    totalRemainingValue: t('hypothesisTooltips.condo.totalRemainingValue'),
    discountRate: t('hypothesisTooltips.condo.discountRate'),
    discountRateFactor: t('hypothesisTooltips.condo.discountRateFactor'),
    finalRemainingValue: t('hypothesisTooltips.condo.finalRemainingValue'),
    totalAssetValueRounded: t('hypothesisTooltips.condo.totalAssetValueRounded'),
    totalAssetValuePerSqM: t('hypothesisTooltips.condo.totalAssetValuePerSqM'),
  } as const;
}

/** @deprecated Use getLbTooltips(t) */
export const LB_TIPS = getLbTooltips(((k: string) => k) as unknown as HypothesisTFn);
/** @deprecated Use getCondoTooltips(t) */
export const CONDO_TIPS = getCondoTooltips(((k: string) => k) as unknown as HypothesisTFn);
