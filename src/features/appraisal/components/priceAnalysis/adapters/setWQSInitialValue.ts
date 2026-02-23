import type { UseFormReset } from 'react-hook-form';
import type { WQSFormType } from '../schemas/wqsForm';
import type { MarketComparableDataType, TemplateDetailType } from '../schemas/v1';

interface setWQSInitialValueProps {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: TemplateDetailType;
  comparativeSurveys: MarketComparableDataType[];
  reset: UseFormReset<WQSFormType>;
}
export function setWQSInitialValue({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  reset,
}: setWQSInitialValueProps) {
  if (!collateralType || !methodId || !methodType || !property || !comparativeSurveys || !reset)
    return;

  if (!template) {
    reset({
      methodId: 'WQSXXXXXXX', // method Id which generate when enable in methods selection screen
      collateralType: collateralType,
      pricingTemplateCode: '',
      comparativeSurveys: [],
      comparativeFactors: [],
      WQSScores: [],
      WQSTotalScores: undefined,
      WQSCalculations: [],
      WQSFinalValue: {
        landArea: property?.landArea ?? undefined,
        finalValue: 0,
        finalValueRounded: 0,
        coefficientOfDecision: 0,
        standardError: 0,
        intersectionPoint: 0,
        slope: 0,
        lowestEstimate: 0,
        highestEstimate: 0,
        appraisalPriceRounded: 0,
      },
      generateAt: new Date().toISOString().toString(),
    });
    return;
  }

  reset({
    WQSTotalScores: undefined,
    methodId: 'WQSXXXXXXX', // method Id which generate when enable in methods selection screen
    collateralType: collateralType,
    pricingTemplateCode: '', // TODO: replace by template id
    comparativeSurveys: [],
    comparativeFactors:
      template.comparativeFactors?.map(compFact => ({
        factorCode: compFact.factorCode,
      })) ?? [],
    WQSScores: template.calculationFactors?.map(calFact => ({
      factorCode: calFact.factorCode,
      weight: calFact.weight,
      intensity: calFact.intensity,
      surveys: [],
      collateral: 0,
    })),
    WQSCalculations: [],
    WQSFinalValue: {
      landArea: property?.landArea ?? undefined,
      finalValue: 0,
      finalValueRounded: 0,
      coefficientOfDecision: 0,
      standardError: 0,
      intersectionPoint: 0,
      slope: 0,
      lowestEstimate: 0,
      highestEstimate: 0,
      appraisalPriceRounded: 0,
    },
    generateAt: new Date().toISOString().toString(),
  });
}
