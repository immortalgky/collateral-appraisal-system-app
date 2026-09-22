/**
 * The collateral kinds offered when adding collateral, mapped to the property type each becomes,
 * so the list draws them with the same icons as the Property Information tab (`getPropertyIcon`).
 */
export const collateralPropertyType: Record<string, string> = {
  Land: 'L',
  Building: 'B',
  LandAndBuilding: 'LB',
  Condo: 'U',
  Machine: 'MAC',
  LS: 'LSL',
  BS: 'LSB',
  LBS: 'LS',
};
