export function deriveGroupCollateralType(
  properties: Array<{ propertyType?: string | null }>
): string {
  const types = properties.map(p => p.propertyType ?? '');
  if (types.includes('C')) return 'C';
  if (types.includes('LB')) return 'LB';
  if (types.includes('L')) return 'L';
  return types[0] ?? '';
}
