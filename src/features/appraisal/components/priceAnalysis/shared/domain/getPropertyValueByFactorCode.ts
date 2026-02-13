import { MAPPING_FACTORS_PROPERTIES_FIELDS } from '../../data/data';

export const getPropertyValueByFactorCode = (id: string, property: Record<string, any>) => {
  const mapping = new Map(
    MAPPING_FACTORS_PROPERTIES_FIELDS.map(factor => [factor.id, factor.value]),
  );

  const field = mapping.get(id);

  if (!field) return '';

  const value = property;
  return value[field] ?? '';
};
