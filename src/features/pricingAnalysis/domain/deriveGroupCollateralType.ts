export function deriveGroupCollateralType(
  properties: Array<{ propertyType?: string | null; sequenceInGroup?: number | null }>,
): string {
  const types = [...properties]
    .sort((a, b) => (a.sequenceInGroup ?? 0) - (b.sequenceInGroup ?? 0))
    .map(p => p.propertyType ?? '');
  if (types.includes('U')) return 'U';
  if (types.includes('LSU')) return 'LSU';
  if (types.includes('LB')) return 'LB';
  if (types.includes('LS')) return 'LS';
  if (types.includes('L')) return 'L';
  if (types.includes('LSL')) return 'LSL';

  return types[0] ?? '';
}
