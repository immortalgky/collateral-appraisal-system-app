export function deriveGroupCollateralType(
  properties: Array<{ propertyType?: string | null }>,
): string {
  const types = properties.map(p => p.propertyType ?? '');
  if (types.includes('U')) return 'U';
  if (types.includes('LB')) return 'LB';
  if (types.includes('L')) return 'L';
  return types[0] ?? '';
}
