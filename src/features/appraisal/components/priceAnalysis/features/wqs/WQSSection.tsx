import { Button, CancelButton, Dropdown, Icon } from '@/shared/components';
import { FormProvider, useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { WQSDto, type WQSRequestType } from '../../schemas/form';
import { AdjustFinalValueSection } from './AdjustFinalValueSection';
import { ComparativeSection } from './ComparativeSection';
import { CalculationSection } from './CalculationSection';
import { useEffect, useMemo, useState } from 'react';
import {
  ALL_FACTORS,
  COLLATERAL_TYPE,
  MAPPING_FACTORS_PROPERTIES_FIELDS,
  PROPERTIES,
  WQS_TEMPLATES,
  type WQSTemplate,
} from '../../data/data';
import { MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND } from '../../data/comparativeData';
import { ComparativeSurveySection } from './components_/ComparativeSurveySection';
import { ScoringTable } from './components_/ScoringTable';
import { MarketSurveySelectionModal } from '../../components/MarketSurveySelectionModal';

export const getDesciptions = (id: string) => {
  const factors = new Map(ALL_FACTORS.map(factor => [factor.value, factor.description]));
  return factors.get(id) ?? null;
};

const getCollateralTypeDescriptions = (id: string) => {
  const factors = new Map(COLLATERAL_TYPE.map(factor => [factor.value, factor.label]));
  return factors.get(id) ?? null;
};

export const getPropertyValueByFactorCode = (id: string, property: Record<string, any>) => {
  const mapping = new Map(
    MAPPING_FACTORS_PROPERTIES_FIELDS.map(factor => [factor.id, factor.value]),
  );

  const field = mapping.get(id);

  if (!field) return '';

  const value = property;
  return value[field] ?? '';
};

interface WQSSectionProps {
  property: Record<string, any>;
  surveys: Record<string, any>[];
}
export const WQSSection = ({ property, surveys }: WQSSectionProps) => {
  /**
   * => default collateral type, template => generate => query factors in template
   * =>
   * API stages:
   * stage (1): after user click 'AP' button
   * - use 'groupId' to query property in the group, market survey in application
   *
   * stage (2): after user trigger 'pencil' button to start method
   * - load 'collateral type', 'template', 'all factors' parameter
   *
   * stage (3): after user trigger 'generate' button
   * - initial template setting into methods
   *
   * WQS divided into 4 sections:
   * (1) select comparative data
   * (2) WQS score
   * (3) WQS calculation
   * (4) adjust value
   *
   * WQS flow:
   * (1) user choose collateral type and template then system initial data
   * (2) user choose market survey in application to calculate at section (1)
   * (3) user adjust score in section (2)
   * (4) user adjust pricing from market survey such as offering price or selling price (3)
   * (5) after system calculate final value, user will adjust final value at section (4)
   *
   * Control logic:
   * section (1)
   * - in selection market survey screen, system will display in map ***
   * - factor from template setting cannot change/ remove
   * - user can add more factor from all parameter
   * - in case that no template, user still select factor by themself
   * section (2)
   * - factor from template setting cannot change/ remove
   * - user can add more factor from section (1), these factors can change or remove
   * - if total intensity > 100, system will show red color
   * - in case that no template, no factor initail from section (1). but user still choose factor from section (1) to key in score
   * section (3)
   * - market survey data will deliver either offering price or selling price
   * - if offering price has value, user can adjust value by either percentage or amount. but default percentage 5%
   * - if selling price has value, system will calculate total number of year of collateral from date. then, user can adjust period of time (%) and period of time also default 3%
   * section (4)
   * - if coefficient > 0.85, highlight red color
   * others
   * - warning when change template button data already key in ***
   */

  // stage (1): moc data
  // const [property, setProperty] = useState<Record<string, any>>(PROPERTIES[1]);
  // const [surveys, setSurvey] = useState<Record<string, any>[]>(
  //   MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND,
  // );

  // stage (2): moc data
  const [allFactors, setAllFactors] =
    useState<{ value: string; description: string }[]>(ALL_FACTORS);
  const [templates, setTemplates] = useState<WQSTemplate[]>(WQS_TEMPLATES);
  const [collateralTypes, setCollateralTypes] =
    useState<{ value: string; label: string }[]>(COLLATERAL_TYPE);

  // stage (3): generate button was triggered
  const [templateQuery, setTemplateQuery] = useState<WQSTemplate | undefined>(undefined); // template will be initial when user click generate
  const template = useMemo(() => {
    return templateQuery;
  }, [templateQuery]);

  // ===== implement =====

  const methods = useForm<WQSRequestType>({
    mode: 'onSubmit',
    resolver: zodResolver(WQSDto),
  });
  const {
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { errors },
  } = methods;
  const [collateralTypeId, setCollateralTypeId] = useState<string>('');
  const [pricingTemplateCode, setPricingTemplateCode] = useState<string>('');
  const [onLoading, setOnLoading] = useState<boolean>(true);
  const [comparativeSurveys, setComparativeSurveys] = useState<any>([]); // market survey will be initial when user choose market survey data in application

  console.log('WQS form errors: ', errors);

  const handleOnGenerate = () => {
    // if (!pricingTemplateCode) return;
    // load template configuration
    setTemplateQuery(templates.find(template => template.templateCode === pricingTemplateCode));
    setOnLoading(false);
  };

  useEffect(() => {
    if (onLoading) return;

    if (!template) {
      setTimeout(() => {
        setOnLoading(true);
        reset({
          methodId: 'WQSXXXXXXX', // method Id which generate when enable in methods selection screen
          collateralType: collateralTypeId,
          pricingTemplateCode: '',
          comparativeSurveys: [],
          comparativeFactors: [],
          WQSScores: [],
          WQSCalculations: [],
          WQSFinalValue: {
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
        });
        setOnLoading(false);
      }, 1000);
      return;
    }

    // initial data
    setTimeout(() => {
      setOnLoading(true);
      reset({
        methodId: 'WQSXXXXXXX', // method Id which generate when enable in methods selection screen
        collateralType: collateralTypeId,
        pricingTemplateCode: pricingTemplateCode,
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
      });
      setOnLoading(false);
    }, 1000);
  }, [collateralTypeId, pricingTemplateCode, reset, template]);

  useEffect(() => {
    setValue(
      'comparativeSurveys',
      comparativeSurveys.map((survey, index) => ({
        marketId: survey.id,
        displaySeq: index + 1,
      })),
    );
    setValue(
      'WQSScores',
      getValues('WQSScores')?.map(score => ({
        ...score,
        surveys: comparativeSurveys.map(survey => ({ marketId: survey.id, surveyScore: 0 })),
      })) ?? [],
    );
    setValue('WQSCalculations', [
      ...comparativeSurveys.map(survey => {
        const surveyMap = new Map(survey.factors.map(s => [s.id, s.value]));
        return {
          marketId: survey.id,
          offeringPrice: surveyMap.get('17') ?? 0,
          offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
          offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
          offeringPriceAdjustmentAmt: surveyMap.get('19') ?? null,
          sellingPrice: surveyMap.get('21') ?? 0,
          sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
          sellingDate: surveyMap.get('22') ?? '',
          sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
          numberOfYears: 10, // TODO: convert selling date to number of year
        };
      }),
    ]);
  }, [comparativeSurveys, setValue]);

  const handleOnSave = data => {
    console.log(data);
  };

  const handleOnSaveDraft = () => {
    console.log(getValues());
  };

  const handleOnSelectMarketSurvey = (survey: Record<string, any>) => {
    if (comparativeSurveys.find(s => s.id === survey.id)) {
      setComparativeSurveys([...comparativeSurveys.filter(s => s.id != survey.id)]);
      return;
    }

    setComparativeSurveys([...comparativeSurveys, survey]);
  };

  const [showMarketSurveySelection, setShowMarketSurveySelection] = useState<boolean>(false);

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleOnSave)} className="flex-1 min-h-0 flex flex-col">
          <div
            id="form-scroll-container"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden gap-4 py-4"
          >
            <div className="flex flex-row gap-2">
              <div className="text-2xl">
                <Icon name="scale-balanced"></Icon>
              </div>
              <span className="text-2xl">{'Weighted Quality Scores (WQS)'}</span>
            </div>
            <div className="grid grid-cols-12 items-end gap-4">
              <div className="col-span-2 flex h-full items-center">
                <span>Pricing Analysis Template</span>
              </div>
              <div className="col-span-3">
                <Dropdown
                  label="Collateral Type"
                  options={[...collateralTypes]}
                  value={collateralTypeId}
                  onChange={value => {
                    setCollateralTypeId(value);
                  }}
                />
              </div>
              <div className="col-span-3">
                <Dropdown
                  label="Template"
                  options={
                    templates
                      .filter(template => template.collateralTypeId === collateralTypeId)
                      .map(template => ({
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
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => handleOnGenerate()}
                  className="px-4 py-2 border border-primary text-primary rounded-lg cursor-pointer hover:bg-primary/10"
                >
                  Generate
                </button>
              </div>
            </div>
            {!onLoading && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  <div className="text-lg border-b border-neutral-300 py-2">
                    Comparative Analysis
                  </div>
                  <div className="px-4 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowMarketSurveySelection(true)}
                      className="w-[200px] border border-dashed border-primary text-primary hover:bg-primary/5 px-4 py-2 rounded-lg cursor-pointer"
                    >
                      Add Comparative Data
                    </button>
                    {showMarketSurveySelection && (
                      <MarketSurveySelectionModal
                        surveys={surveys}
                        comparativeSurveys={comparativeSurveys}
                        onSelect={handleOnSelectMarketSurvey}
                        onCancel={() => setShowMarketSurveySelection(false)}
                      />
                    )}
                    <ComparativeSurveySection
                      comparativeSurveys={comparativeSurveys}
                      property={property}
                      allFactors={allFactors}
                      template={template}
                    />
                  </div>
                </div>
                {comparativeSurveys?.length > 0 && (
                  <div>
                    <div>
                      <div className="text-lg border-b border-neutral-300 py-2">
                        Calculation of Appraisal Value
                      </div>
                      <div className="px-4 mt-4">
                        <ScoringTable
                          comparativeSurveys={comparativeSurveys}
                          property={property}
                          template={template}
                          isLoading={false}
                        />
                        {/* <CalculationSection
                          comparativeSurveys={comparativeSurveys}
                          template={template}
                          allFactors={allFactors}
                          property={property}
                        /> */}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg border-b border-neutral-300 py-2">
                        Adjust Final Value
                      </div>
                      <div className="px-4 mt-4">
                        <AdjustFinalValueSection property={property} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {!onLoading && (
            <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <CancelButton />
                  <div className="h-6 w-px bg-gray-200" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" type="button" onClick={handleOnSaveDraft}>
                    <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                    Save draft
                  </Button>
                  <Button type="submit">
                    <Icon name="check" style="solid" className="size-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Sticky Action Buttons */}
        </form>
      </FormProvider>
    </div>
  );
};
