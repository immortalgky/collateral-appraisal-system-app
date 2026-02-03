import { useEffect, useMemo, useState } from 'react';
import {
  ALL_FACTORS,
  COLLATERAL_TYPE,
  SALE_GRID_TEMPLATES,
  type SaleAdjustmentGridTemplate,
} from '../../../data/data';
import { FormProvider, useForm } from 'react-hook-form';
import {
  SaleAdjustmentGridDto,
  type SaleAdjustmentGridType,
} from '../schemas/saleAdjustmentGridForm';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, CancelButton, Dropdown, Icon } from '@/shared/components';
import { SaleAdjustmentGridCalculationSection } from './SaleAdjustmentGridCalculationSection';
import { ComparativeSurveySection } from './ComparativeSurveySection';
import { MarketSurveySelectionModal } from '../../../components/MarketSurveySelectionModal';

interface SaleAdjustmentGridSectionProps {
  property: Record<string, any>;
  surveys: Record<string, any>[];
}
export const SaleAdjustmentGridSection = ({
  property,
  surveys,
}: SaleAdjustmentGridSectionProps) => {
  const [allFactors, setAllFactors] =
    useState<{ value: string; description: string }[]>(ALL_FACTORS);
  const [templates, setTemplates] = useState<SaleAdjustmentGridTemplate[]>(SALE_GRID_TEMPLATES);
  const [collateralTypes, setCollateralTypes] =
    useState<{ value: string; label: string }[]>(COLLATERAL_TYPE);

  const [templateQuery, setTemplateQuery] = useState<SaleAdjustmentGridTemplate | undefined>(
    undefined,
  ); // template will be initial when user click generate
  const template = useMemo(() => {
    return templateQuery;
  }, [templateQuery]);

  const methods = useForm<SaleAdjustmentGridType>({
    mode: 'onSubmit',
    resolver: zodResolver(SaleAdjustmentGridDto),
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

  console.log('Sale adjustment grid form errors: ', errors);

  const handleOnGenerate = () => {
    // if (!pricingTemplateCode) return;
    // load template configuration
    setTemplateQuery(templates.find(template => template.templateCode === pricingTemplateCode));
    setOnLoading(false);
  };

  useEffect(() => {
    if (onLoading) return;

    if (!template) {
      // setTimeout(() => {
      //   setOnLoading(true);
      //   reset({
      //     methodId: 'SALEADJXXX', // method Id which generate when enable in methods selection screen
      //     collateralType: collateralTypeId,
      //     pricingTemplateCode: '',
      //     comparativeSurveys: [],
      //     comparativeFactors: [],
      //     saleAdjustmentGridCalculations: [],
      //     saleAdjustmentGridAdjustmentFactors: [],
      //     saleAdjustmentGridFinalValue: {
      //       finalValue: 0,
      //       finalValueRounded: 0,
      //     },
      //   });
      //   setOnLoading(false);
      // }, 1000);
      // return;
    }

    // initial data
    setTimeout(() => {
      setOnLoading(true);
      reset({
        methodId: 'SALEADJXXX', // method Id which generate when enable in methods selection screen
        collateralType: collateralTypeId,
        pricingTemplateCode: pricingTemplateCode,
        comparativeSurveys: [
          ...comparativeSurveys.map((survey, columnIndex) => ({
            marketId: survey.id,
            displaySeq: columnIndex + 1,
          })),
        ],
        comparativeFactors: template.comparativeFactors.map(compFact => ({
          factorCode: compFact.factorId,
        })),

        saleAdjustmentGridQualitatives: template.qualitativeFactors.map(q => ({
          factorCode: q.factorId,
          qualitatives: comparativeSurveys.map(s => ({ qualitativeLevel: 'E' })),
        })),

        saleAdjustmentGridCalculations: [
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
        ],
        saleAdjustmentGridAdjustmentFactors: [],
        saleAdjustmentGridFinalValue: {
          finalValue: 0,
          finalValueRounded: 0,
        },
      });
      setOnLoading(false);
    }, 1000);
  }, [
    collateralTypeId,
    comparativeSurveys,
    onLoading,
    pricingTemplateCode,
    reset,
    surveys,
    template,
  ]);

  useEffect(() => {
    setValue(
      'comparativeSurveys',
      comparativeSurveys.map((survey, index) => ({
        marketId: survey.id,
        displaySeq: index + 1,
      })),
    );
    // setValue(
    //   'WQSScores',
    //   getValues('WQSScores')?.map(score => ({
    //     ...score,
    //     surveys: comparativeSurveys.map(survey => ({ marketId: survey.id, surveyScore: 0 })),
    //   })) ?? [],
    // );
    setValue('saleAdjustmentGridCalculations', [
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
          adjustedValue: 0,
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
                <Icon name="table"></Icon>
              </div>
              <span className="text-2xl">{'Sale Adjustment Grid'}</span>
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
                <button
                  type="button"
                  onClick={() => setShowMarketSurveySelection(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
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
                <SaleAdjustmentGridCalculationSection
                  property={property}
                  template={template}
                  comparativeSurveys={comparativeSurveys}
                />
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
