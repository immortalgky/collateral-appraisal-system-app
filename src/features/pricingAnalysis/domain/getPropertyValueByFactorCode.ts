import { MAPPING_FACTORS_PROPERTIES_FIELDS } from '../data/mappingFactorsAndProperty';

export const getPropertyValueByFactorCode = (factorCode: string, property: Record<string, any>) => {
  if (!property) return '';

  const mapping =
    MAPPING_FACTORS_PROPERTIES_FIELDS.find((factor: any) => factor.factorCode === factorCode)
      ?.fieldName ?? null;

  if (!mapping) return null;

  const propertyValue = property[mapping] ?? null;

  if (!propertyValue) return null;

  return propertyValue;
};
