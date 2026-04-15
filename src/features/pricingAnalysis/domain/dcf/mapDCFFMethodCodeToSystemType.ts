export const mapMethodCodeToValue = [
  // income
  { code: '01', value: 'specifiedRoomIncomePerDay' },
  { code: '02', value: 'specifiedRoomIncomeBySeasonalRates' },
  { code: '03', value: 'specifiedRoomIncomeWithGrowth' },
  { code: '04', value: 'specifiedRoomIncomeWithGrowthByOccupancyRate' },
  { code: '05', value: 'specifiedRentalIncomePerMonth' },
  { code: '06', value: 'specifiedRentalIncomePerSquareMeter' },
  // cost
  { code: '07', value: 'roomCostBasedOnExpensesPerRoomPerDay' },
  { code: '08', value: 'specifiedFoodAndBeverageExpensesPerRoomPerDay' },
  { code: '09', value: 'positionBasedSalaryCalculation' },
  { code: '10', value: 'parameterBasedOnTierOfPropertyValue' },
  { code: '11', value: 'specifiedEnergyCostIndex' },
  { code: '12', value: 'proportionOfTheNewReplacementCost' },
  // general
  { code: '13', value: 'proportion' },
  { code: '14', value: 'specifiedValueWithGrowth' },
];

export function mapDCFMethodCodeToSystemType(methodCode: string) {
  if (!methodCode) return null;

  const mapping = new Map(mapMethodCodeToValue.map(c => [c.code, c.value]));
  return mapping.get(methodCode) ?? null;
}
