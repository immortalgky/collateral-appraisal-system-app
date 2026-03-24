import { mapMethodCodeToValue } from '../data/dcfParameters';

export function mapDCFMethodCodeToSystemType(methodCode: string) {
  const mapping = new Map(mapMethodCodeToValue.map(c => [c.code, c.value]));
  return mapping.get(methodCode);
}
