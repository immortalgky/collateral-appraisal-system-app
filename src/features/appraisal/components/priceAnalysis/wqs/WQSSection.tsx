import { Dropdown, Icon } from '@/shared/components';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ALL_FACTORS,
  COLLATERAL_TYPE,
  MAPPING_FACTORS_PROPERTIES_FIELDS,
  PROPERTIES,
  WQS_TEMPLATES,
} from './data/data';
import { WQSDto, type WQSRequestType } from './form';
import { AdjustFinalValueSection } from './AdjustFinalValueSection';
import { ComparativeSection } from './ComparativeSection';
import { CalculationSection } from './CalculationSection';
import { useEffect, useState } from 'react';

export const getDesciptions = (id: string) => {
  const factors = new Map(ALL_FACTORS.map(factor => [factor.value, factor.description]));
  return factors.get(id) ?? null;
};

const getCollateralTypeDescriptions = (id: string) => {
  const factors = new Map(COLLATERAL_TYPE.map(factor => [factor.value, factor.label]));
  return factors.get(id) ?? null;
};

export const getPropertyValueByFactorCode = (id: string) => {
  const mapping = new Map(
    MAPPING_FACTORS_PROPERTIES_FIELDS.map(factor => [factor.id, factor.value]),
  );

  const field = mapping.get(id);

  if (!field) return '';

  const property = PROPERTIES[0];
  return property[field] ?? '';
};

export const WQSSection = () => {
  /**
   * Initial
   * (1) get property information in the group
   * (2) get market survey information in application
   * When we should map between market survey, wqs template and property?
   * => default collateral type, template => generate => query factors in template
   * =>
   */

  /**
   * Comparative
   */

  /**
   * Calculation
   */

  // const methods = useForm<WQSRequestType>({
  //   defaultValues: {
  //     comparativeData: [...compRows],
  //     WQSMarketSurveys: [{ WQSScores: [] }],
  //     WQSCalculation: [...calculation],
  //   },
  //   resolver: zodResolver(WQSDto),
  // });

  const methods = useForm<WQSRequestType>({
    // defaultValues: WQS_LAND,
    resolver: zodResolver(WQSDto),
  });

  const { handleSubmit, getValues, reset, setValue } = methods;
  const [onLoading, setOnLoading] = useState<boolean>(true);
  const [allFactors, setAllFactors] =
    useState<{ value: string; description: string }[]>(ALL_FACTORS);
  const [property, setProperty] = useState<any>(PROPERTIES[0]); // property will be initial when user come to price analysis modal

  const [collateralTypeId, setCollateralTypeId] = useState<string>('');
  const [pricingTemplateCode, setPricingTemplateCode] = useState<string>('');

  const [template, setTemplate] = useState<any>(undefined); // template will be initial when user click generate
  const [surveys, setSurveys] = useState<any>([]); // market survey will be initial when user choose market survey data in application

  const handleOnGenerate = () => {
    if (!pricingTemplateCode) return;

    // load template configuration
    setTemplate(WQS_TEMPLATES.find(template => template.templateCode === pricingTemplateCode));
  };

  useEffect(() => {
    setValue('comparativeSurveys', surveys);
    setValue('WQSCalculations', [
      ...surveys.map(survey => {
        const surveyMap = new Map(survey.factors.map(s => [s.id, s.value]));
        return {
          marketId: survey.id,
          offeringPrice: surveyMap.get('17'),
          offeringPriceMeasurementUnit: surveyMap.get('20'),
          offeringPriceAdjustmentPct: surveyMap.get('18'),
          offeringPriceAdjustmentAmt: surveyMap.get('19'),
          sellingPrice: surveyMap.get('21'),
          sellingPriceMeasurementUnit: surveyMap.get('20'),
          sellingDate: surveyMap.get('22'),
          sellingPriceAdjustmentYear: surveyMap.get('23'),
          numberOfYears: 10, // TODO: convert selling date to number of year
        };
      }),
      {}, // config for collateral column
    ]);
  }, [surveys]);

  useEffect(() => {
    if (!template) return;

    // initial data
    setTimeout(() => {
      setOnLoading(true);
      reset({
        methodId: 'WQSXXXXXXX', // method Id which generate when enable in methods selection screen
        collateralType: collateralTypeId,
        pricingTemplateCode: pricingTemplateCode,
        finalValue: 0,
        roundedFinalValue: 0,
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
        WQSCalculations: [
          // {
          //   id: 'survey1',
          //   offeringPrice: 22750,
          //   offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
          //   offeringPriceAdjustmentAmt: 0,
          //   sellingPrice: undefined,
          //   sellingPriceMeasurementUnit: undefined,
          //   sellingDate: undefined,
          //   sellingPriceAdjustmentYear: undefined,
          //   numberOfYears: undefined,
          // },
          // {
          //   id: 'survey2',
          //   offeringPrice: 22500,
          //   offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
          //   offeringPriceAdjustmentAmt: 0,
          //   sellingPrice: undefined,
          //   sellingPriceMeasurementUnit: undefined,
          //   sellingDate: undefined,
          //   sellingPriceAdjustmentYear: undefined,
          //   numberOfYears: undefined,
          // },
          // {
          //   id: 'survey3',
          //   offeringPrice: undefined,
          //   offeringPriceMeasurementUnit: undefined,
          //   offeringPriceAdjustmentAmt: undefined,
          //   sellingPrice: 21500,
          //   sellingPriceMeasurementUnit: 'Baht/ Sq.Wa',
          //   sellingDate: undefined,
          //   sellingPriceAdjustmentYear: 0,
          //   numberOfYears: 6,
          // },
          {
            id: 'collateral',
          },
        ],
        WQSFinalValue: {
          finalValue: 0,
          finalValueRounded: 0,
          coefficientOfDecision: 0,
          standardError: 0,
          intersectionPoint: 0,
          slope: 0,
          finalAssesedValue: 0,
          lowestEstimate: 0,
          highestEstimate: 0,
          appraisalPriceRounded: 0,
        },
      });
      setOnLoading(false);
    }, 1000);
  }, [template]);

  const onSubmit = data => {
    console.log(getValues());
  };

  const onDraft = () => {
    console.log(getValues());
  };

  const handleOnSelectMarketSurvey = survey => {
    if (surveys.find(s => s.id === survey.id)) {
      setSurveys([...surveys.filter(s => s.id != survey.id)]);
      return;
    }

    setSurveys([...surveys, survey]);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4 w-full min-h-0 mt-2">
          <div className="flex flex-row gap-2">
            <div className="text-2xl">
              <Icon name="scale-balanced"></Icon>
            </div>
            <span className="text-2xl">{'Weighted Quality Scores (WQS)'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Pricing Analysis Template</span>
            <div>
              <Dropdown
                label="Collateral Type"
                options={[...COLLATERAL_TYPE]}
                value={collateralTypeId}
                onChange={value => {
                  setCollateralTypeId(value);
                }}
              />
            </div>
            <div>
              <Dropdown
                label="Template"
                options={
                  WQS_TEMPLATES.filter(
                    template => template.collateralTypeId === collateralTypeId,
                  ).map(template => ({
                    value: template.templateCode,
                    label: template.templateName,
                  })) ?? ''
                }
                value={pricingTemplateCode}
                onChange={value => {
                  setPricingTemplateCode(value);
                }}
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => handleOnGenerate()}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Generate
              </button>
            </div>
          </div>
          {!onLoading && (
            <div className="flex flex-col gap-4">
              <div>
                <ComparativeSection
                  surveys={surveys}
                  template={template}
                  property={property}
                  allFactors={allFactors}
                  onSelectSurvey={handleOnSelectMarketSurvey}
                />
              </div>
              <div>
                <CalculationSection
                  surveys={surveys}
                  template={template}
                  allFactors={allFactors}
                  property={property}
                />
              </div>
              <div>
                <AdjustFinalValueSection />
              </div>
              <div>
                <button type="submit">Submit</button>
              </div>
              <div>
                <button type="button" onClick={() => onDraft()}>
                  Draft
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </FormProvider>
  );
};
