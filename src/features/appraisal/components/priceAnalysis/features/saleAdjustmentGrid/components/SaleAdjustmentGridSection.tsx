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
} from '@features/appraisal/components/priceAnalysis/schemas/saleAdjustmentGridForm.ts';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, CancelButton, Icon } from '@/shared/components';
import { SaleAdjustmentGridCalculationSection } from './SaleAdjustmentGridCalculationSection';
import { ComparativeSurveySection } from './ComparativeSurveySection';
import toast from 'react-hot-toast';
import { SaleAdjustmentGridAdjustAppraisalPriceSection } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/components/SaleAdjustmentGridAdjustAppraisalPriceSection.tsx';
import { PriceAnalysisTemplateSelector } from '../../../shared/components/PriceAnalysisTemplateSelector';
import { MarketSurveySelectionModal } from '../../../shared/components/MarketSurveySelectionModal';

interface SaleAdjustmentGridSectionProps {
  property: Record<string, unknown>;
  surveys: Record<string, unknown>[];
  onCalculationMethodDirty: (check: boolean) => void;
}

/**
 * NOTE:
 *
 * Workflow:
 * (1) System retrive method value from database to check whether has value or not
 * (1.1) In case that has value
 * - System can show retrieved value.
 * (1.2) In case that has no value
 * - System can initial value to prepared stages before user take action.
 *
 *
 */
export const SaleAdjustmentGridSection = ({
  property,
  surveys,
  onCalculationMethodDirty,
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
    formState: { errors, isDirty },
  } = methods;

  const [collateralTypeId, setCollateralTypeId] = useState<string>('');
  const [pricingTemplateCode, setPricingTemplateCode] = useState<string>('');
  const [onLoading, setOnLoading] = useState<boolean>(true);
  const [comparativeSurveys, setComparativeSurveys] = useState<any>([]); // market survey will be initial when user choose market survey data in application

  console.log('Sale adjustment grid form errors: ', errors);

  const handleOnGenerate = () => {
    // if (!pricingTemplateCode) return;
    // load template configuration
    // Discard any unsaved edits when generating a new configuration
    reset({}, { keepDirty: false, keepDirtyValues: false, keepTouched: false });
    setComparativeSurveys([]);

    setTemplateQuery(templates.find(template => template.templateCode === pricingTemplateCode));

    // reset template and data on generate
    setOnLoading(false);
  };

  useEffect(() => {
    if (onLoading) return;

    if (!template) {
      reset(
        {
          methodId: 'SALEADJXXX', // method Id which generate when enable in methods selection screen
          collateralType: collateralTypeId,
          pricingTemplateCode: pricingTemplateCode,
          comparativeSurveys: [
            ...comparativeSurveys.map((survey, columnIndex) => ({
              marketId: survey.id,
              displaySeq: columnIndex + 1,
            })),
          ],
          comparativeFactors: [],

          saleAdjustmentGridQualitatives: [],

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
        },
        { keepDirty: false, keepDirtyValues: false, keepTouched: false },
      );
      return;
    }

    // initial data
    reset(
      {
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
      },
      { keepDirty: false, keepDirtyValues: false, keepTouched: false },
    );
  }, [collateralTypeId, onLoading, pricingTemplateCode, reset, surveys, template]);

  useEffect(() => {
    const qualitativeFactors = getValues('saleAdjustmentGridQualitatives') ?? [];

    setValue(
      'comparativeSurveys',
      comparativeSurveys.map((survey, index) => ({
        marketId: survey.id,
        displaySeq: index + 1,
      })),
      { shouldDirty: false },
    );

    setValue(
      'saleAdjustmentGridQualitatives',
      [
        ...qualitativeFactors.map(f => ({
          ...f,
          qualitatives: comparativeSurveys.map(survey => ({
            marketId: survey.id,
            qualitativeLevel: 'E', // TODO: can config
          })),
        })),
      ],
      { shouldDirty: false },
    );

    setValue(
      'saleAdjustmentGridCalculations',
      [
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
            weight: 0,
          };
        }),
      ],
      { shouldDirty: false },
    );

    setValue(
      'saleAdjustmentGridAdjustmentFactors',
      [
        ...qualitativeFactors.map(f => ({
          factorCode: f.factorCode,
          surveys: comparativeSurveys.map(survey => ({
            marketId: survey.id,
            adjustPercent: 0,
            adjustAmount: 0,
          })),
        })),
      ],
      { shouldDirty: false },
    );
  }, [comparativeSurveys, setValue]);

  const handleOnSave = data => {
    console.log(data);
  };

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    onCalculationMethodDirty(isDirty);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleOnSaveDraft = async () => {
    try {
      const data = getValues();
      console.log('Save draft: ', data);
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Draft saved successfully');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to save draft. Please try again.');
      console.error('Save draft error:', error);
    } finally {
      console.log('Completed!');
    }
  };

  const handleOnSelectMarketSurvey = (surveys: Record<string, any>[]) => {
    setComparativeSurveys([...surveys]);
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
            <PriceAnalysisTemplateSelector
              icon="table"
              methodName="Sale Adjustment Grid"
              onGenerate={handleOnGenerate}
              collateralType={{
                onSelectCollateralType: setCollateralTypeId,
                value: collateralTypeId,
                options: collateralTypes,
              }}
              template={{
                onSelectTemplate: setPricingTemplateCode,
                value: pricingTemplateCode,
                options:
                  templates
                    .filter(template => template.collateralTypeId === collateralTypeId)
                    .map(template => ({
                      value: template.templateCode,
                      label: template.templateName,
                    })) ?? '',
              }}
            />
            {!onLoading && (
              <div className="flex flex-col gap-4 mt-4">
                {/* comparative surveys section */}
                <div className="flex flex-col gap-2">
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

                {/* calculation section */}
                {comparativeSurveys.length > 0 && (
                  <>
                    <SaleAdjustmentGridCalculationSection
                      property={property}
                      template={template}
                      comparativeSurveys={comparativeSurveys}
                    />
                    <SaleAdjustmentGridAdjustAppraisalPriceSection property={property} />
                  </>
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
