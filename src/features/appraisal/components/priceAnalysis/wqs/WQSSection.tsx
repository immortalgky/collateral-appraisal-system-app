import { Dropdown, Icon } from '@/shared/components';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ALL_FACTORS,
  COLLATERAL_TYPE,
  FACTORS,
  MAPPING_FACTORS_PROPERTIES_FIELDS,
  PROPERTIES,
  TEMPLATE,
} from './data/data';
import { WQSDto, type WQSRequestType } from './form';
import { AdjustFinalValueSection } from './AdjustFinalValueSection';
import { ComparativeSection } from './ComparativeSection';
import { CalculationSection } from './CalculationSection';
import { useEffect, useState } from 'react';
import { MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND } from './data/comparativeData';

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

  const { handleSubmit, getValues, reset } = methods;
  const [collateralType, setCollateralType] = useState<string | undefined>('');
  const [templateId, setTemplateId] = useState<string | undefined>('');
  const [onLoading, setOnLoading] = useState<boolean>(true);

  const handleOnGenerate = () => {
    if (!templateId) return;

    setTimeout(() => {
      setOnLoading(true);
      reset({
        collateralType: collateralType,
        template: templateId,
        finalValue: 0,
        roundedFinalValue: 0,
        comparativeData: TEMPLATE.find(t => t.id === templateId).comparativeFactors.map(
          compFact => ({
            factorId: compFact.id,
          }),
        ),
        WQSScores: TEMPLATE.find(t => t.id === templateId)?.calculationFactors.map(calFact => ({
          factorId: calFact.id,
          weight: calFact.weight,
          intensity: calFact.intensity,
          surveys: [],
          collateral: 0,
        })),
        WQSCalculations: [
          {
            id: 'survey1',
            offeringPrice: 22750,
            offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
            offeringPriceAdjustmentAmt: 0,
            sellingPrice: undefined,
            sellingPriceMeasurementUnit: undefined,
            sellingDate: undefined,
            sellingPriceAdjustmentYear: undefined,
            numberOfYears: undefined,
          },
          {
            id: 'survey2',
            offeringPrice: 22500,
            offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
            offeringPriceAdjustmentAmt: 0,
            sellingPrice: undefined,
            sellingPriceMeasurementUnit: undefined,
            sellingDate: undefined,
            sellingPriceAdjustmentYear: undefined,
            numberOfYears: undefined,
          },
          {
            id: 'survey3',
            offeringPrice: undefined,
            offeringPriceMeasurementUnit: undefined,
            offeringPriceAdjustmentAmt: undefined,
            sellingPrice: 21500,
            sellingPriceMeasurementUnit: 'Baht/ Sq.Wa',
            sellingDate: undefined,
            sellingPriceAdjustmentYear: 0,
            numberOfYears: 6,
          },
          {
            id: 'collateral',
          },
        ],
      });
      setOnLoading(false);
    }, 1000);
  };

  const onSubmit = data => {
    console.log(getValues());
  };

  const onDraft = () => {
    console.log(getValues());
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
                value={collateralType}
                onChange={value => {
                  setCollateralType(value);
                }}
              />
            </div>
            <div>
              <Dropdown
                label="Template"
                options={
                  TEMPLATE.filter(t => t.collateralType === collateralType).map(t => ({
                    value: t.id,
                    label: t.label,
                  })) ?? ''
                }
                value={templateId}
                onChange={value => {
                  setTemplateId(value);
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
                  comparativeData={MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND}
                  surveyData={MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND}
                />
              </div>
              <div>
                <CalculationSection comparativeData={MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND} />
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
