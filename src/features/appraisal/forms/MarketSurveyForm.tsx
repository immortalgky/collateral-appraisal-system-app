import { FormFields, type FormField } from '@/shared/components/form';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetMarketSurveyTemplate, useSurveyTemplateFactors } from '../api';
import { useEffect } from 'react';
import type { GetMarketSurveyTemplateResponseType } from '@/shared/forms/marketSurvey';

const MarketSurveyForm = () => {
  const { getValues, setValue } = useFormContext();
  const collateralType = useWatch({
    name: 'collateralType',
  });

  const { data: templates = [] } = useGetMarketSurveyTemplate(collateralType);

  const surveyTemplateOptions =
    templates?.map((t: any) => ({
      label: t.templateDesc,
      value: t.surveyTemplateCode,
    })) ?? [];

  const surveyTemplateCode = useWatch({
    name: 'surveyTemplateCode',
  });

  const { data: factor = [], isLoading } = useSurveyTemplateFactors(surveyTemplateCode);

  // mock parameter options
  const parameterOptions = mockParameterOptions.reduce(
    (acc, group) => {
      acc[group.parameterGroup] = group.values.map(v => ({
        value: v.code,
        label: v.description,
      }));
      return acc;
    },
    {} as Record<string, { value: string; label: string }[]>
  );

  useEffect(() => {
    if (!factor.length) return;
    setValue('marketSurveyData', defaultMarketSurveyData(factor));
  }, [factor, getValues, setValue]);

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
          {factor.map((fac, index) => {
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
  fac: GetMarketSurveyTemplateResponseType,
  index: number,
  parameterOptions: Record<string, { value: string; label: string }[]>
): FormField => {
  switch (fac.dataType) {
    case 'dropdown':
      return {
        type: 'dropdown',
        name: `marketSurveyData.[${index}].${fac.fieldName}`,
        label: '',
        wrapperClassName: 'col-span-6',
        options: parameterOptions[fac.parameterGroup] ?? [],
      };

    case 'radio-group':
      return {
        type: 'radio-group',
        name: `marketSurveyData.[${index}].${fac.fieldName}`,
        orientation: 'horizontal',
        options: parameterOptions[fac.parameterGroup] ?? [],
        wrapperClassName: 'col-span-12',
      };

    case 'checkbox-group':
      return {
        type: 'checkbox-group',
        name: `marketSurveyData.[${index}].${fac.fieldName}`,
        orientation: 'horizontal',
        options: parameterOptions[fac.parameterGroup] ?? [],
        wrapperClassName: 'col-span-12',
      };

    case 'boolean-toggle':
      return {
        type: 'boolean-toggle',
        name: `marketSurveyData.[${index}].${fac.fieldName}`,
        label: '',
        options: fac.options,
        wrapperClassName: 'col-span-6',
      };

    case 'number-input':
      return {
        type: 'number-input',
        name: `marketSurveyData.[${index}].${fac.fieldName}`,
        label: '',
        wrapperClassName: 'col-span-6',
      };

    default:
      return {
        type: 'text-input',
        name: `marketSurveyData.[${index}].${fac.fieldName}`,
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
];

const defaultMarketSurveyData = (factors: GetMarketSurveyTemplateResponseType[]) => {
  return factors.map(fac => ({
    marketSurveyId: fac.marketSurveyId,
    factorCode: fac.factorCode,
    factorDesc: fac.factorDesc,
    fieldName: fac.fieldName,
    dataType: fac.dataType,
    parameterGroup: fac.parameterGroup ?? '',
    fieldLength: fac.fieldLength ?? 0,
    fieldDecimal: fac.fieldDecimal ?? 0,
    mandatory: 'N',
    displaySeq: 0,
    value: '',
    measurementUnit: '',
    otherRemark: '',
  }));
};

export default MarketSurveyForm;
