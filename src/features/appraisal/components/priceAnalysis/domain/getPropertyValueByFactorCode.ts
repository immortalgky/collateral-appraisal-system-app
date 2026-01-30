export const getPropertyValueByFactorCode = (id: string, property: Record<string, any>) => {
  const mapping = new Map(property.map(factor => [factor.id, factor.value]));

  const field = mapping.get(id);

  if (!field) return '';

  const value = property;
  return value[field] ?? '';
};
