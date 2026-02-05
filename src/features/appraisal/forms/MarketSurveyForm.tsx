import { FormFields, type FormField } from '@/shared/components/form';
import { useFormContext, useWatch } from 'react-hook-form';
import { useEffect, useState } from 'react';
import type { GetMarketSurveyTemplateFactorResponseType } from '@/shared/forms/marketSurvey';
import { useGetMarketSurveyTemplateById, useGetMarketSurveyTemplateByPropertyType } from '../api';
import { useSearchParams } from 'react-router-dom';

const MarketSurveyForm = () => {
  const { getValues, setValue } = useFormContext();
  const [isTemplateChanged, setIsTemplateChanged] = useState(false);
  const [searchParams] = useSearchParams();

  // Watch property type to fetch templates
  const propertyType =
    useWatch({
      name: 'propertyType',
    }) || searchParams.get('propertyType');

  // Fetch survey templates based on property type
  const { data, isLoading } = useGetMarketSurveyTemplateByPropertyType(propertyType || undefined);

  const templates = data?.templates ?? [];

  // Prepare survey template options for dropdown
  const surveyTemplateOptions =
    templates.map((t: any) => ({
      label: t.templateName,
      value: t.templateCode,
    })) ?? [];

  // Watch survey template code to fetch factors
  const templateCode = useWatch({
    name: 'templateCode',
  });

  const selectedTemplate = templates?.find(t => t.templateCode === templateCode);
  const { data: template, isLoading: getMarketLoading } = useGetMarketSurveyTemplateById(
    selectedTemplate?.id,
  );
  const factors = template?.template.factors ?? [];

  // Watch market survey data to determine edit mode
  const factorData = useWatch({
    name: 'factorData',
  });
  const isEditMode = !!factorData?.length;

  // Initialize market surveytemplate code
  useEffect(() => {
    if (isEditMode) return;
    if (!templates?.length) return;
    const current = getValues('templateCode');
    if (current) return;
    setValue('templateCode', templates[0].templateCode);
    setValue('propertyType', templates[0].propertyType);
  }, [templates, isEditMode, getValues, setValue]);

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

  // Initialize market survey data field
  useEffect(() => {
    if (!templateCode) return;
    if (!factors.length) return;

    // edit mode + haven't change template
    if (isEditMode && !isTemplateChanged) return;

    const oldData = getValues('factorData') ?? [];

    const defaultData = defaultMarketSurveyData(factors, oldData);

    setValue('factorData', defaultData, { shouldDirty: true });
  }, [templateCode, factors, isEditMode, isTemplateChanged, getValues, setValue]);

  useEffect(() => {
    if (!templateCode) return;
    setIsTemplateChanged(true);
    setValue('templateId', selectedTemplate?.id || null);
  }, [templateCode, selectedTemplate]);

  const staticFields: FormField[] = [
    {
      type: 'dropdown',
      name: 'propertyType',
      label: '',
      options: [
        { value: 'Land', label: 'Lands' },
        { value: 'LandAndBuilding', label: 'Land and Building' },
        { value: 'Building', label: 'Building' },
        { value: 'Condo', label: 'Condominium' },
        { value: 'LeaseLand', label: 'Lease Agreement Lands' },
        { value: 'LeaseBuilding', label: 'Lease Agreement Building' },
        { value: 'LeaseLandAndBuilding', label: 'Lease Agreement Land and Building' },
        { value: 'Machine', label: 'Machinery' },
      ],
      wrapperClassName: 'col-span-6',
      required: true,
      disabled: true,
    },
    {
      type: 'dropdown',
      name: 'templateCode',
      label: '',
      options: surveyTemplateOptions,
      wrapperClassName: 'col-span-6',
      required: true,
    },
    {
      type: 'text-input',
      name: 'surveyName',
      label: '',
      wrapperClassName: 'col-span-6',
      required: true,
    },
    {
      type: 'date-input',
      name: 'infoDateTime',
      label: '',
      wrapperClassName: 'col-span-6',
    },
    {
      type: 'text-input',
      name: 'sourceInfo',
      label: '',
      wrapperClassName: 'col-span-6',
    },
  ];

  const formStaticSections = [
    {
      label: 'Property Type',
      fields: staticFields.filter(f => f.name === 'propertyType'),
    },
    {
      label: 'Template',
      fields: staticFields.filter(f => f.name === 'templateCode'),
    },
    {
      label: 'Survey Name',
      fields: staticFields.filter(f => f.name === 'surveyName'),
    },
    {
      label: 'Information Date / Time',
      fields: staticFields.filter(f => f.name === 'infoDateTime'),
    },
    {
      label: 'Source of Information',
      fields: staticFields.filter(f => f.name === 'sourceInfo'),
    },
  ];

  return (
    <div>
      {formStaticSections.map(section => (
        <div key={section.label} className="grid grid-cols-4 gap-6 mb-6">
          <div className="col-span-1">
            <p>{section.label}</p>
          </div>
          <div className="col-span-3">
            <div className="grid grid-cols-12 gap-4">
              <FormFields fields={section.fields} />
            </div>
          </div>
        </div>
      ))}
      {isLoading || getMarketLoading ? (
        <div className="w-full flex justify-center col-span-4">
          <span className="loading loading-spinner text-primary"></span>
        </div>
      ) : (
        <div>
          {factors.map((fac: any, index: number) => {
            const fields: FormField[] = [buildFormField(fac, index, parameterOptions)];
            return (
              <div key={fac.factorCode} className="grid grid-cols-4 gap-6 mb-6">
                <div className="col-span-1">
                  <p>{fac.factorName}</p>
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

const buildFormField = (
  fac: GetMarketSurveyTemplateFactorResponseType,
  index: number,
  parameterOptions: Record<string, { value: string; label: string }[]>,
): FormField => {
  switch (fac.dataType) {
    case 'Dropdown':
      return {
        type: 'dropdown',
        name: `factorData.[${index}].value`,
        label: '',
        wrapperClassName: 'col-span-6',
        options: parameterOptions[fac.parameterGroup] ?? [],
      };

    case 'Radio':
      return {
        type: 'radio-group',
        name: `factorData.[${index}].value`,
        orientation: 'horizontal',
        options: parameterOptions[fac.parameterGroup] ?? [],
        wrapperClassName: 'col-span-12',
      };

    case 'CheckboxGroup':
      return {
        type: 'checkbox-group',
        name: `factorData.[${index}].value`,
        orientation: 'horizontal',
        options: parameterOptions[fac.parameterGroup] ?? [],
        wrapperClassName: 'col-span-12',
      };

    case 'Checkbox':
      return {
        type: 'checkbox-group',
        name: `factorData.[${index}].value`,
        orientation: 'horizontal',
        options: parameterOptions[fac.parameterGroup] ?? [],
        wrapperClassName: 'col-span-12',
      };

    case 'Numeric':
      return {
        type: 'number-input',
        name: `factorData.[${index}].value`,
        label: '',
        wrapperClassName: 'col-span-6',
      };

    default:
      return {
        type: 'text-input',
        name: `factorData.[${index}].value`,
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
    parameterGroup: 'PLOT_LOCATION_OPTIONS',
    values: [
      { code: 'ShowHouse', description: 'Show House' },
      { code: 'PrivateZone', description: 'Private Zone' },
      { code: 'CornerPlot', description: 'Corner Plot' },
      { code: 'NearClubhouse', description: 'Near Clubhouse' },
    ],
  },
  {
    parameterGroup: 'LAND_SHAPE_OPTIONS',
    values: [
      {
        code: 'LANDSHAPE_1',
        description:
          'A shape with soil, space is appropriate for development made a very beneficial',
      },
      {
        code: 'LANDSHAPE_2',
        description: 'A shape with soil, space is appropriate for development benefit and medium',
      },
      {
        code: 'LANDSHAPE_3',
        description: 'A shape with soil, space, there are no appropriate development benefits',
      },
      {
        code: 'Rectangle',
        description: 'Rectangle shape',
      },
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
      factorId: fac.factorId,
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
