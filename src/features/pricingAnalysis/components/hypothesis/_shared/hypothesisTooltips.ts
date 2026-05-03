export const LB_TIPS = {
  totalArea:
    'Total land area of the project in Sq.Wa, derived from the property group\'s title deeds.',

  sellingArea:
    'Selling Area = Selling Area % × Total Area. Typical range: 50–70% of total area. Highlighted red when outside this band.',

  publicUtilityArea:
    'Public Utility Area = Public Utility Area % × Total Area. Covers roads, parks, and common infrastructure allocated to the project.',

  totalRevenue:
    'Sum of all unit selling prices from the uploaded unit details file.',

  estSalesPeriod:
    'Estimated Sales Duration = Total Units ÷ Sales Rate (houses/month). This duration is also used as the horizon for the Discount Rate Factor.',

  publicUtilityConstruction:
    'Total Cost = Rate (Baht/Sq.Wa) × Total Project Area. Enter the construction rate per square wah for public utility work.',

  landFilling:
    'Total Cost = Rate (Baht/Sq.Wa) × Total Project Area. Enter the land-filling rate per square wah.',

  contingencyDev:
    'Contingency Amount = Contingency % × Total Project Development Costs. Accounts for unforeseen development expenses. Default 3%.',

  estConstructionPeriod:
    'Estimated Construction Duration = Total Units ÷ Build Rate (houses/month). This duration feeds into Professional Fee and Admin Cost totals.',

  allocationPermitFee:
    'One-time government permit fee for land allocation. Entered as a fixed Baht amount.',

  landTitleFee:
    'Total Fee = Fee per Plot × Number of Plots (equals total units). Enter the fee charged per individual land title deed division.',

  professionalFee:
    'Total = Professional Fee/Month × Construction Duration (months).',

  adminCost:
    'Total = Admin Cost/Month × Construction Duration (months).',

  sellingAdv:
    'Total = Selling & Advertising % × Total Project Revenue.',

  contingencyProject:
    'Contingency Amount = Contingency % × Total Project Cost Expenses. Default 3%.',

  transferFee:
    'Government land transfer fee. Total = Transfer Fee % × Total Revenue.',

  specificBizTax:
    'Specific Business Tax (SBT) on property transfer. Total = SBT % × Total Revenue.',

  riskPremium:
    'Developer\'s risk allowance. Total = Risk Premium % × Total Revenue.',

  currentPropertyValue:
    'Current Property Value = Total Revenue − Total Development Costs and Expenses.',

  discountRate:
    'Annual discount rate (%). Enter 0 to skip time-value adjustment. Applied over the estimated sales duration.',

  discountRateFactor:
    'Discount Factor = 1 / (1 + Discount Rate / 100) ^ (Sales Duration / 12). Converts the future current property value back to a present-day value.',

  finalPropertyValue:
    'Final Property Value = Current Property Value × Discount Rate Factor.',

  totalAssetValueRounded:
    'Final property value rounded to the nearest 10,000 Baht.',

  totalAssetValuePerSqWa:
    'Total asset value divided by the selling area (Sq.Wa), rounded to the nearest 100 Baht.',
} as const;

export const CONDO_TIPS = {
  areaTitleDeed:
    'Land area per title deed in Sq.Wa. Automatically converted to Sq.M by multiplying × 4.',

  far:
    'Floor Area Ratio (FAR) from the city plan. Construction Area per city plan = Land Area (Sq.M) × FAR.',

  totalBuildingArea:
    'Total gross floor area of the building in Sq.M, entered by the appraiser. This is the basis for the building construction cost calculation.',

  commonArea:
    'Common Area = Total Building Area − Indoor Sales Area. Common Area % = 100% − Indoor Sales Area %.',

  indoorSalesArea:
    'Sourced from the active unit-detail upload: total usable area of all units.',

  projectSalesArea:
    'Net sellable area — equals the Indoor Sales Area from the unit-detail upload.',

  averageSellingPrice:
    'Average Price per Sq.M = Total Selling Price ÷ Project Sales Area.',

  totalRevenue:
    'Total project revenue (GDV) sourced from the unit-detail upload: sum of all unit selling prices.',

  estSalesDuration:
    'User-entered duration in months over which all units are expected to be sold. Used as the horizon for the Discount Rate Factor.',

  condoBuildingCost:
    'Total = Construction Rate (Baht/Sq.M) × Total Building Area.',

  setAvgRoomSize:
    'Total units from the unit-detail upload. Average Indoor Area per Unit = Indoor Sales Area ÷ Total Units.',

  furniture:
    'Total = Furniture Cost per Unit × Number of Units (from the unit-detail upload).',

  externalUtilities:
    'Fixed cost for utilities and infrastructure outside the building. MAO (Maximum Allowable Outcome) constraint applies.',

  hardCostContingency:
    'Contingency = Contingency % × (Building Construction Cost + Project Development Costs). Default 3%.',

  estConstructionPeriod:
    'Duration in months for the construction phase. Used to compute Professional Fee and Admin Cost totals.',

  professionalFee:
    'Total = Professional Fee/Month × Construction Duration (months).',

  adminCost:
    'Total = Admin Cost/Month × Sales Duration (months).',

  sellingAdv:
    'Total = Selling & Advertising % × Total Project Income.',

  titleDeedFee:
    'Fixed fee for issuance of individual condominium title deeds (Chanote).',

  eiaCost:
    'Fixed cost for the Environmental Impact Assessment (EIA) report required for large condominium projects.',

  condoRegistrationFee:
    'Fixed government fee to register the condominium juristic person.',

  otherExpenses:
    'Total = Other Expenses % × Total Project Cost Expenses (soft cost subtotal).',

  transferFee:
    'Government land transfer fee. Total = Transfer Fee % × Total Project Income. Default 1%.',

  specificBizTax:
    'Specific Business Tax (SBT). Total = SBT % × Total Project Income.',

  riskProfit:
    'Developer\'s expected risk and profit margin. Total = Risk & Profit % × Total Project Income.',

  totalRemainingValue:
    'Total Remaining Value = Total Revenue − Total Development Costs.',

  discountRate:
    'Annual discount rate (%). Enter 0 to skip time-value adjustment. Applied over the estimated sales duration.',

  discountRateFactor:
    'Discount Factor = 1 / (1 + Discount Rate / 100) ^ (Sales Duration / 12). Converts the future remaining value back to a present-day value.',

  finalRemainingValue:
    'Final Remaining Value = Total Remaining Value × Discount Rate Factor.',

  totalAssetValueRounded:
    'Final remaining value rounded to the nearest 10,000 Baht.',

  totalAssetValuePerSqM:
    'Total asset value divided by indoor sales area (Sq.M), rounded to the nearest 100 Baht.',
} as const;
