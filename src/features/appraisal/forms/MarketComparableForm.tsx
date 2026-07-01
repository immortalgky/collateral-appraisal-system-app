import { type FormField, FormFields } from '@/shared/components/form';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';
import {
  useGetMarketComparableTemplate,
  useGetMarketComparableTemplateById,
} from '../api/marketComparable';
import { useSearchParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';

// SectionRow component for consistent section styling with icons
interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
}

const SectionRow = ({ title, icon, children }: SectionRowProps) => (
  <>
    <div className="col-span-full xl:col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-full xl:col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
  </>
);

const FactorsSkeleton = () => (
  <div className="space-y-4">
    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="contents">
          <div className="col-span-full xl:col-span-1 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gray-200 animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="col-span-full xl:col-span-4">
            <div className="h-10 w-1/2 bg-gray-200 rounded animate-pulse" />
          </div>
          {i < 4 && <div className="h-px bg-gray-200 col-span-full xl:col-span-5" />}
        </div>
      ))}
    </div>
  </div>
);

const MarketComparableForm = () => {
  const language = useLocaleStore(s => s.language);
  const { getValues, setValue, reset } = useFormContext();
  const [isTemplateChanged, setIsTemplateChanged] = useState(false);
  const isInitialSetup = useRef(true);
  const [searchParams] = useSearchParams();

  // Watch property type to fetch templates
  const propertyType =
    useWatch({
      name: 'propertyType',
    }) || searchParams.get('propertyType');

  // Fetch comparable templates based on property type
  const { data: templates = [], isLoading } = useGetMarketComparableTemplate(
    propertyType || undefined,
  );

  // Prepare comparable template options for dropdown
  const comparableTemplateOptions =
    templates.map((t: any) => ({
      label: t.templateName,
      value: t.templateCode,
    })) ?? [];

  // Watch comparable template code to fetch factors
  const templateCode = useWatch({
    name: 'templateCode',
  });

  const selectedTemplate = templates?.find(t => t.templateCode === templateCode);
  const { data: template, isLoading: getMarketLoading } = useGetMarketComparableTemplateById(
    selectedTemplate?.id,
  );
  const factors = template?.template.factors ?? [];

  // Watch market comparable data to determine edit mode
  const factorData = useWatch({
    name: 'factorData',
  });
  const isEditMode = !!factorData?.length;

  // Location picker (lat/lon) — same pattern as the Land/Condo property forms.
  // Coordinates drive the History Search / 360 map pins for this comparable.
  const [pickerOpen, setPickerOpen] = useState(false);
  const latitude = useWatch({ name: 'latitude' });
  const longitude = useWatch({ name: 'longitude' });
  const initialLat =
    latitude != null && latitude !== '' && !Number.isNaN(Number(latitude))
      ? Number(latitude)
      : null;
  const initialLon =
    longitude != null && longitude !== '' && !Number.isNaN(Number(longitude))
      ? Number(longitude)
      : null;
  const pickerButton = useMemo(
    () => <MapPickerTriggerIcon onClick={() => setPickerOpen(true)} />,
    [],
  );

  // Initialize market comparable template code
  useEffect(() => {
    if (isEditMode) return;
    if (!templates?.length) return;
    const current = getValues('templateCode');
    if (current) return;
    setValue('templateCode', templates[0].templateCode);
    setValue('propertyType', templates[0].propertyType);
  }, [templates, isEditMode, getValues, setValue]);

  // Initialize market comparable data field
  useEffect(() => {
    if (!templateCode) return;
    if (!factors.length) return;

    // edit mode + haven't change template
    if (isEditMode && !isTemplateChanged) return;

    const oldData = getValues('factorData') ?? [];

    const defaultData = defaultMarketComparableData(factors, oldData);

    if (isInitialSetup.current) {
      // Auto-initialization: use reset to update defaultValues baseline
      // so isDirty correctly tracks user changes (including reverts)
      isInitialSetup.current = false;
      reset({ ...getValues(), factorData: defaultData });
    } else {
      // User changed template: just update value, keep dirty state
      setValue('factorData', defaultData);
    }
  }, [templateCode, factors, isEditMode, isTemplateChanged, getValues, setValue, reset]);

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
      group: 'PropertyType',
      wrapperClassName: 'col-span-12',
      required: true,
      disabled: true,
    },
    {
      type: 'dropdown',
      name: 'templateCode',
      label: '',
      options: comparableTemplateOptions,
      wrapperClassName: 'col-span-12',
      required: true,
    },
    {
      type: 'text-input',
      name: 'surveyName',
      label: '',
      wrapperClassName: 'col-span-12',
      required: true,
      maxLength: 200,
    },
    {
      type: 'datetime-input',
      name: 'infoDateTime',
      label: '',
      wrapperClassName: 'col-span-12',
      disableFutureDates: true,
    },
    {
      type: 'text-input',
      name: 'sourceInfo',
      label: '',
      wrapperClassName: 'col-span-12',
      maxLength: 200,
    },
    {
      type: 'number-input',
      name: 'offerPrice',
      label: '',
      wrapperClassName: 'col-span-8',
      maxIntegerDigits: 15,
      decimalPlaces: 2,
      disableWhen: { field: 'salePrice', operator: 'isNotEmpty' },
      disabledValue: null,
    },
    {
      type: 'dropdown',
      name: 'offerPriceUnit',
      label: '',
      group: 'MeasurementUnits',
      wrapperClassName: 'col-span-4',
      disableWhen: { field: 'salePrice', operator: 'isNotEmpty' },
      disabledValue: null,
    },
    {
      type: 'number-input',
      name: 'salePrice',
      label: '',
      wrapperClassName: 'col-span-8',
      maxIntegerDigits: 15,
      decimalPlaces: 2,
      disableWhen: { field: 'offerPrice', operator: 'isNotEmpty' },
      disabledValue: null,
    },
    {
      type: 'dropdown',
      name: 'salePriceUnit',
      label: '',
      group: 'MeasurementUnits',
      wrapperClassName: 'col-span-4',
      disableWhen: { field: 'offerPrice', operator: 'isNotEmpty' },
      disabledValue: null,
    },
    {
      type: 'date-input',
      name: 'saleDate',
      label: '',
      wrapperClassName: 'col-span-12',
      disableWhen: { field: 'offerPrice', operator: 'isNotEmpty' },
      disabledValue: null,
      disableFutureDates: true,
      requiredWhen: { field: 'salePrice', operator: 'isNotEmpty' },
    },
    {
      type: 'number-input',
      name: 'latitude',
      label: 'Latitude',
      wrapperClassName: 'col-span-6',
      rightIcon: pickerButton,
      decimalPlaces: 6,
      maxIntegerDigits: 3,
      allowNegative: true,
      allowZero: true,
      min: -90,
      max: 90,
    },
    {
      type: 'number-input',
      name: 'longitude',
      label: 'Longitude',
      wrapperClassName: 'col-span-6',
      rightIcon: pickerButton,
      decimalPlaces: 6,
      maxIntegerDigits: 3,
      allowNegative: true,
      allowZero: true,
      min: -180,
      max: 180,
    },
  ];

  const formStaticSections = [
    {
      label: 'Property Type',
      icon: 'building',
      fields: staticFields.filter(f => f.name === 'propertyType'),
    },
    {
      label: 'Template',
      icon: 'file-lines',
      fields: staticFields.filter(f => f.name === 'templateCode'),
    },
    {
      label: 'Comparable Name',
      icon: 'tag',
      fields: staticFields.filter(f => f.name === 'surveyName'),
    },
    {
      label: 'Information Date / Time',
      icon: 'calendar',
      fields: staticFields.filter(f => f.name === 'infoDateTime'),
    },
    {
      label: 'Source of Information',
      icon: 'circle-info',
      fields: staticFields.filter(f => f.name === 'sourceInfo'),
    },
    {
      label: 'Offer Price',
      icon: 'money-bill',
      fields: staticFields.filter(f => f.name === 'offerPrice' || f.name === 'offerPriceUnit'),
    },
    {
      label: 'Sale Price',
      icon: 'money-bill',
      fields: staticFields.filter(f => f.name === 'salePrice' || f.name === 'salePriceUnit'),
    },
    {
      label: 'Sale Date',
      icon: 'calendar',
      fields: staticFields.filter(f => f.name === 'saleDate'),
    },
    {
      label: 'Location',
      icon: 'location-dot',
      fields: staticFields.filter(f => f.name === 'latitude' || f.name === 'longitude'),
    },
  ];

  const remark: FormField[] = [
    { type: 'textarea', name: 'notes', label: '', wrapperClassName: 'col-span-12' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Static Fields */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {formStaticSections.map(section => (
          <SectionRow key={section.label} title={section.label} icon={section.icon}>
            <FormFields fields={section.fields} />
          </SectionRow>
        ))}
      </div>

      {/* Survey Factors Section */}
      <div id="factors-section" className="pt-2">
        {isLoading || getMarketLoading ? (
          <FactorsSkeleton />
        ) : (
          factors.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {factors.map((fac: any, index: number) => {
                const fields: FormField[] = buildFormField(fac, index);
                return (
                  <SectionRow
                    key={fac.factorCode}
                    title={getTranslatedFactorName(fac.translations, language)}
                    icon="sliders"
                  >
                    <FormFields fields={fields} />
                  </SectionRow>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Remark */}
      <div className="grid grid-cols-5 gap-6 pt-2">
        <SectionRow title="Remark" icon="note-sticky">
          <FormFields fields={remark} />
        </SectionRow>
      </div>

      <MapLocationPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(newLat, newLon) => {
          setValue('latitude', newLat, { shouldDirty: true, shouldValidate: true });
          setValue('longitude', newLon, { shouldDirty: true, shouldValidate: true });
        }}
        initialLat={initialLat}
        initialLon={initialLon}
      />
    </div>
  );
};

const buildFormField = (fac: any, index: number): FormField[] => {
  const isRequired = !!fac.isMandatory;
  switch (fac.dataType) {
    case 'Dropdown':
      return [
        {
          type: 'dropdown',
          name: `factorData.[${index}].value`,
          label: '',
          wrapperClassName: 'col-span-12',
          group: fac.parameterGroup,
          required: isRequired,
        },
        {
          type: 'text-input',
          label: 'Other',
          name: `factorData.[${index}].otherRemarks`,
          wrapperClassName: 'col-span-12',
          showWhen: { field: `factorData.[${index}].value`, is: ['99'], operator: 'in' },
          requiredWhen: { field: `factorData.[${index}].value`, is: ['99'], operator: 'in' },
          maxLength: 100,
        },
      ];

    case 'Radio':
      return [
        {
          type: 'radio-group',
          name: `factorData.[${index}].value`,
          orientation: 'horizontal',
          group: fac.parameterGroup,
          wrapperClassName: 'col-span-12',
          required: isRequired,
        },
        {
          type: 'text-input',
          label: 'Other',
          name: `factorData.[${index}].otherRemarks`,
          wrapperClassName: 'col-span-12',
          showWhen: { field: `factorData.[${index}].value`, is: ['99'], operator: 'in' },
          requiredWhen: { field: `factorData.[${index}].value`, is: ['99'], operator: 'in' },
          maxLength: 100,
        },
      ];

    case 'CheckboxGroup':
      return [
        {
          type: 'checkbox-group',
          name: `factorData.[${index}].value`,
          orientation: 'horizontal',
          group: fac.parameterGroup,
          wrapperClassName: 'col-span-12',
          required: isRequired,
        },
        {
          type: 'text-input',
          label: 'Other',
          name: `factorData.[${index}].otherRemarks`,
          wrapperClassName: 'col-span-12',
          showWhen: { field: `factorData.[${index}].value`, is: '99', operator: 'contains' },
          requiredWhen: { field: `factorData.[${index}].value`, is: '99', operator: 'contains' },
          maxLength: 100,
        },
      ];

    case 'Checkbox':
      return [
        {
          type: 'checkbox',
          name: `factorData.[${index}].value`,
          wrapperClassName: 'col-span-12',
        },
      ];

    case 'Numeric':
      return [
        {
          type: 'number-input',
          name: `factorData.[${index}].value`,
          label: '',
          wrapperClassName: 'col-span-12',
          required: isRequired,
          ...(fac.fieldLength ? { maxIntegerDigits: fac.fieldLength } : {}),
          ...(fac.fieldDecimal ? { decimalPlaces: fac.fieldDecimal } : {}),
        },
      ];

    default:
      return [
        {
          type: 'text-input',
          name: `factorData.[${index}].value`,
          label: '',
          wrapperClassName: 'col-span-12',
          required: isRequired,
          ...(fac.fieldLength ? { maxLength: fac.fieldLength } : {}),
        },
      ];
  }
};

const defaultMarketComparableData = (newFactors: any[], oldData: any[] = []) => {
  return newFactors.map(fac => {
    const old = oldData.find(d => d?.factorCode === fac.factorCode);

    return {
      factorId: fac.factorId,
      factorCode: fac.factorCode,
      factorDesc: fac.factorDesc,
      fieldName: fac.fieldName,
      dataType: fac.dataType,
      parameterGroup: fac.parameterGroup ?? '',
      fieldLength: fac.fieldLength ?? 0,
      fieldDecimal: fac.fieldDecimal ?? 2,
      isMandatory: fac.isMandatory ?? false,
      value:
        old?.value ??
        (fac.dataType === 'CheckboxGroup'
          ? fac.value || []
          : fac.dataType === 'Checkbox'
            ? false
            : fac.dataType === 'Numeric'
              ? fac.value || ''
              : ''),
    };
  });
};

export default MarketComparableForm;
