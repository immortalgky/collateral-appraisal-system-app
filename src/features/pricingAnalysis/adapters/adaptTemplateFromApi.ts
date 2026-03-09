import type { GetComparativeAnalysisTemplateByIdResponseType, TemplateFactorDto2Type } from '@/shared/schemas/v1';
import type { FactorDataType, TemplateComparativeFactorType, TemplateCalculationFactorType, TemplateDetailType } from '../schemas';

/**
 * Adapt the real API template response (TemplateFactorDto2 with factorId)
 * to the local template shape used by form initializers (factorCode-based).
 *
 * Uses allFactors to resolve factorId → factorCode.
 */
export function adaptTemplateFromApi(
  apiTemplate: GetComparativeAnalysisTemplateByIdResponseType,
  allFactors: FactorDataType[],
): TemplateDetailType {
  const factorIdToCode = new Map<string, string>();
  for (const f of allFactors) {
    const code = f.factorCode ?? '';
    if (f.factorId) factorIdToCode.set(f.factorId, code);
    if (f.id) factorIdToCode.set(f.id, code);
  }

  const mapToComparative = (tf: TemplateFactorDto2Type): TemplateComparativeFactorType => ({
    id: tf.id,
    factorCode: factorIdToCode.get(tf.factorId) ?? '',
  });

  const mapToCalculation = (tf: TemplateFactorDto2Type): TemplateCalculationFactorType => ({
    id: tf.id,
    factorCode: factorIdToCode.get(tf.factorId) ?? '',
    weight: tf.defaultWeight,
    intensity: tf.defaultIntensity,
  });

  return {
    templateCode: apiTemplate.templateCode,
    templateName: apiTemplate.templateName,
    collateralType: (apiTemplate as any).propertyType ?? '',
    comparativeFactors: apiTemplate.comparativeFactors.map(mapToComparative),
    calculationFactors: apiTemplate.calculationFactors.map(mapToCalculation),
  };
}
