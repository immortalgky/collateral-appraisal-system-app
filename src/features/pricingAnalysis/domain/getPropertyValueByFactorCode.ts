import type { FactorDataType } from '../schemas';

export const getPropertyValueByFactorCode = (
  factorCode: string,
  property: Record<string, any>,
  allFactors: FactorDataType[],
) => {
  if (!property) return '';

  const fieldName = allFactors.find(f => f.factorCode === factorCode)?.fieldName ?? null;

  if (!fieldName) return null;

  const raw = property[fieldName] ?? null;
  if (Array.isArray(raw)) return raw.join(',');
  if (typeof raw === 'string' && raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.join(',');
    } catch { /* not valid JSON, return as-is */ }
  }
  return raw;
};
