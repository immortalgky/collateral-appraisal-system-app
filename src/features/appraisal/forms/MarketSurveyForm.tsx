import { FormFields, type FormField } from '@/shared/components/form';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetMarketSurveyTemplate } from '../api';
import { useEffect, useState } from 'react';
import type { GetMarketSurveyTemplateFactorResponseType } from '@/shared/forms/marketSurvey';

const MarketSurveyForm = () => {
  const { getValues, setValue } = useFormContext();
  const [isTemplateChanged, setIsTemplateChanged] = useState(false);

  // Watch collateral type to fetch templates
  const collateralType = useWatch({
    name: 'collateralType',
  });

  // Fetch survey templates based on collateral type
  const { data: templates = [], isLoading } = useGetMarketSurveyTemplate(collateralType);

  // Prepare survey template options for dropdown
  const surveyTemplateOptions =
    templates?.map((t: any) => ({
      label: t.templateDesc,
      value: t.surveyTemplateCode,
    })) ?? [];

  // Watch survey template code to fetch factors
  const surveyTemplateCode = useWatch({
    name: 'surveyTemplateCode',
  });

  const selectedTemplate = templates?.find(t => t.surveyTemplateCode === surveyTemplateCode);

  const factor = selectedTemplate?.factor ?? [];

  // Watch market survey data to determine edit mode
  const marketSurveyData = useWatch({
    name: 'marketSurveyData',
  });
  const isEditMode = !!marketSurveyData?.length;

  const useTemplateFactor = !isEditMode || isTemplateChanged;

  // Determine which factors to display
  const displayFactors = useTemplateFactor ? factor : marketSurveyData;

  // Map Option
  // TODO: remove mock parameter options
  const parameterOptions = mockParameterOptions.reduce(
    (acc, group) => {
      acc[group.parameterGroup] = group.values.map(v => ({
        value: v.code,
        label: v.description,
      }));
      return acc;
    },
    {} as Record<string, { value: string; label: string }[]>,
  );

  useEffect(() => {
    if (!surveyTemplateCode) return;
    setIsTemplateChanged(true);
  }, [surveyTemplateCode]);

  // Initialize market surveytemplate code
  useEffect(() => {
    if (isEditMode) return;
    if (!templates?.length) return;
    const current = getValues('surveyTemplateCode');
    if (current) return;
    setValue('surveyTemplateCode', templates[0].surveyTemplateCode);
  }, [templates, isEditMode, getValues, setValue]);

  // Initialize market survey data field
  useEffect(() => {
    if (!surveyTemplateCode) return;
    if (!displayFactors.length) return;

    // edit mode + ยังไม่ได้เปลี่ยน template → อย่าแตะ
    if (isEditMode && !isTemplateChanged) return;

    const oldData = getValues('marketSurveyData') ?? [];

    const defaultData = defaultMarketSurveyData(displayFactors, oldData);

    setValue('marketSurveyData', defaultData, { shouldDirty: true });
  }, [surveyTemplateCode, displayFactors, isEditMode, isTemplateChanged, getValues, setValue]);

  const templateField: FormField[] = [
    {
      type: 'dropdown',
      name: 'surveyTemplateCode',
      label: '',
      options: surveyTemplateOptions,
      wrapperClassName: 'col-span-6',
      required: true,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="col-span-1">
        <p>Collateral Type</p>
      </div>
      <div className="col-span-3">
        <div className="grid grid-cols-12 gap-4">
          <FormFields fields={collateralTypeField} />
        </div>
      </div>
      <div className="col-span-1">
        <p>Template</p>
      </div>
      <div className="col-span-3">
        <div className="grid grid-cols-12 gap-4">
          <FormFields fields={templateField} />
        </div>
      </div>
      <div className="col-span-1">
        <p>Survey Name</p>
      </div>
      <div className="col-span-3">
        <div className="grid grid-cols-12 gap-4">
          <FormFields fields={surveyNameField} />
        </div>
      </div>
      {isLoading ? (
        <span className="loading loading-spinner text-primary"></span>
      ) : (
        <div className="grid col-span-4 gap-6">
          {displayFactors.map((fac: any, index: number) => {
            const fields: FormField[] = [buildFormField(fac, index, parameterOptions)];
            return (
              <div key={fac.factorCode} className="grid grid-cols-4 gap-6">
                <div className="col-span-1">
                  <p>{fac.factorDesc}</p>
                </div>
                <div className="col-span-3">
                  <div className="grid grid-cols-12 gap-4">
                    <FormFields fields={fields} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const collateralTypeField: FormField[] = [
  {
    type: 'dropdown',
    name: 'collateralType',
    label: '',
    options: [
      { value: 'L', label: 'Lands' },
      { value: 'LB', label: 'Land and Building' },
      { value: 'B', label: 'Building' },
      { value: 'U', label: 'Condominium' },
      { value: 'LS', label: 'Lease Agreement Lands' },
      { value: 'BS', label: 'Lease Agreement Building' },
      { value: 'LBS', label: 'Lease Agreement Land and Building' },
      { value: 'MC', label: 'Machinery' },
    ],
    wrapperClassName: 'col-span-6',
    required: true,
    disabled: true,
  },
];

const surveyNameField: FormField[] = [
  {
    type: 'text-input',
    name: 'surveyName',
    label: '',
    wrapperClassName: 'col-span-6',
    required: true,
  },
];

const buildFormField = (
  fac: GetMarketSurveyTemplateFactorResponseType,
  index: number,
  parameterOptions: Record<string, { value: string; label: string }[]>,
): FormField => {
  switch (fac.dataType) {
    case 'dropdown':
      return {
        type: 'dropdown',
        name: `marketSurveyData.[${index}].value`,
        label: '',
        wrapperClassName: 'col-span-6',
        options: parameterOptions[fac.parameterGroup] ?? [],
      };

    case 'radio-group':
      return {
        type: 'radio-group',
        name: `marketSurveyData.[${index}].value`,
        orientation: 'horizontal',
        options: parameterOptions[fac.parameterGroup] ?? [],
        wrapperClassName: 'col-span-12',
      };

    case 'checkbox-group':
      return {
        type: 'checkbox-group',
        name: `marketSurveyData.[${index}].value`,
        orientation: 'horizontal',
        options: parameterOptions[fac.parameterGroup] ?? [],
        wrapperClassName: 'col-span-12',
      };

    case 'number-input':
      return {
        type: 'number-input',
        name: `marketSurveyData.[${index}].value`,
        label: '',
        wrapperClassName: 'col-span-6',
      };

    default:
      return {
        type: 'text-input',
        name: `marketSurveyData.[${index}].value`,
        label: '',
        wrapperClassName: 'col-span-6',
      };
  }
};

const mockParameterOptions = [
  {
    parameterGroup: 'BuildingType',
    values: [
      { code: 'SGH', description: 'Single House' },
      { code: 'TWH', description: 'Twin House' },
      { code: 'TNH', description: 'Townhouse' },
      { code: 'CMB', description: 'Commercial Building' },
      { code: 'UNT', description: 'Condominium' },
      { code: 'PROJ', description: 'Project' },
      { code: 'OFC', description: 'Office' },
      { code: 'HTL', description: 'Hotel' },
      { code: 'DPS', description: 'Department Store' },
      { code: 'FAC', description: 'Factory' },
      { code: 'WH', description: 'Warehouse' },
      { code: 'APT', description: 'Apartment' },
      { code: 'RSB', description: 'Residential Building' },
      { code: 'L', description: 'Land' },
      { code: '99', description: 'Other' },
    ],
  },
  {
    parameterGroup: 'BuildingCondition',
    values: [
      { code: 'NEW', description: 'New' },
      { code: 'MODERATE', description: 'Moderate' },
      { code: 'OLD', description: 'Old' },
      { code: 'CONSTRUCTION', description: 'Construction' },
      { code: 'DILAPIDATED', description: 'Dilapidated' },
    ],
  },
  {
    parameterGroup: 'PlotLocation',
    values: [
      { code: 'ShowHouse', description: 'Show House' },
      { code: 'PrivateZone', description: 'Private Zone' },
      { code: 'CornerPlot', description: 'Corner Plot' },
      { code: 'NearClubhouse', description: 'Near Clubhouse' },
    ],
  },
];

const defaultMarketSurveyData = (
  newFactors: GetMarketSurveyTemplateFactorResponseType[],
  oldData: any[] = [],
) => {
  return newFactors.map(fac => {
    const old = oldData.find(d => d.factorCode === fac.factorCode);

    return {
      marketSurveyId: fac.marketSurveyId,
      factorCode: fac.factorCode,
      factorDesc: fac.factorDesc,
      fieldName: fac.fieldName,
      dataType: fac.dataType,
      parameterGroup: fac.parameterGroup ?? '',
      fieldLength: fac.fieldLength ?? 0,
      fieldDecimal: fac.fieldDecimal ?? 2,
      value:
        old?.value ??
        (fac.dataType === 'checkbox-group'
          ? fac.value || []
          : fac.dataType === 'number-input'
            ? fac.value || ''
            : ''),
    };
  });
};

export default MarketSurveyForm;
