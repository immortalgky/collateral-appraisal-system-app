import { MAPPING_FACTORS_PROPERTIES_FIELDS } from '../../data/mappingFactorsAndProperty';

export const getPropertyValueByFactorCode = (id: string, property: Record<string, any>) => {
  const mapping = new Map(
    MAPPING_FACTORS_PROPERTIES_FIELDS.map(factor => [factor.factorCode, factor.fieldName]),
  );

  const field = mapping.get(id);

  if (!field) return '';

  const value = property;
  return value[field] ?? '';
};
