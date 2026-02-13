import type { UseFormReset } from 'react-hook-form';
import type { WQSTemplate } from '../../../data/data';
import type { WQSRequestType } from '../schemas/wqsForm';

export function setWQSInitialValue({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  reset,
}: {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: WQSTemplate;
  comparativeSurveys: Record<string, unknown>[];
  reset: UseFormReset<WQSRequestType>;
}) {
  if (
    !collateralType &&
    !methodId &&
    !methodType &&
    !property &&
    !template &&
    !comparativeSurveys &&
    !reset
  )
    return;

  if (!template) {
    reset({
      methodId: 'WQSXXXXXXX', // method Id which generate when enable in methods selection screen
      collateralType: collateralType,
      pricingTemplateCode: '',
      comparativeSurveys: [],
      comparativeFactors: [],
      WQSScores: [],
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
    methodId: 'WQSXXXXXXX', // method Id which generate when enable in methods selection screen
    collateralType: collateralType,
    pricingTemplateCode: '', // TODO: replace by template id
    comparativeSurveys: [],
    comparativeFactors: template.comparativeFactors.map(compFact => ({
      factorCode: compFact.factorId,
    })),
    WQSScores: template.calculationFactors.map(calFact => ({
      factorCode: calFact.factorId,
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
