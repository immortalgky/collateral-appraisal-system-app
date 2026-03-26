export function getDefaultMethodDetail(systemMethodType?: string) {
  switch (systemMethodType) {
    case 'proportion':
      return {
        proportionPct: null,
        refAssumptionType: null,
      };

    case 'specifiedValueWithGrowth':
      return {
        firstYearValue: null,
        growthRatePct: null,
        growthEveryYears: null,
      };

    case 'specifiedRoomIncomePerDay':
      return {
        totalSaleableArea: null,
        avgRoomRate: null,
        increaseRatePct: null,
        increaseRateYrs: null,
      };

    default:
      return {};
  }
}
