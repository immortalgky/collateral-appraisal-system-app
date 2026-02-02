import { MAPPING_FACTORS_PROPERTIES_FIELDS } from '../data/data';

export const getPropertyValueByFactorCode = (id: string, property: Record<string, any>) => {
  if (!property) return '';

  const mapping = MAPPING_FACTORS_PROPERTIES_FIELDS.find(f => f.id === id)?.value ?? null;

  if (!mapping) return '';

  const propertyValue = property[mapping] ?? null;

  if (!propertyValue) return '';

  return propertyValue;
};
