import { type FormField, FormFields } from '@/shared/components/form';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import {
  useGetMarketComparableTemplate,
  useGetMarketComparableTemplateById,
} from '../api/marketComparable';
import { useSearchParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';
import { useMarketFormatters } from '../hooks/useMarketFormatters';
import { useSubjectPoints } from '../hooks/useSubjectPoints';
import { hasCoords, nearestKm } from '../utils/marketComparableFormat';

/** Element ids of the form's sections, in page order — the header's bar jumps to them. */
export const COMPARABLE_SECTIONS = {
  source: 'comparable-source',
  price: 'comparable-price',
  location: 'comparable-location',
  factors: 'comparable-factors',
  remark: 'comparable-remark',
} as const;

/** The fields each section holds, so the bar can count a section's errors. Factors count `factorData`. */
export const COMPARABLE_SECTION_FIELDS = {
  source: ['surveyName', 'infoDateTime', 'sourceInfo'],
  // The two prices are left out: only one is on screen, so the page counts the pair once.
  price: ['offerPriceUnit', 'salePriceUnit', 'saleDate'],
  location: ['latitude', 'longitude'],
  // The type has no field of its own (the header's chip shows it); the template sets it.
  factors: ['templateCode', 'propertyType'],
  remark: ['notes'],
} as const;

type PriceKind = 'sale' | 'offer';

const isSet = (v: unknown) => v != null && v !== '';

interface SectionRowProps {
  /** Anchor for the header's section bar. */
  id: string;
  title: string;
  icon: string;
  /** A quiet line under the title, e.g. how many factors the template has. */
  subtitle?: ReactNode;
  isLast?: boolean;
  children: ReactNode;
}

/** Title on the left, fields on the right, a rule between sections — as the property forms lay out. */
const SectionRow = ({ id, title, icon, subtitle, isLast = false, children }: SectionRowProps) => (
  <>
    <div id={id} className="cas-section-head col-span-full xl:col-span-1 pt-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
          <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
        </div>
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
      {subtitle && <p className="mt-1 pl-9 text-xs text-gray-400">{subtitle}</p>}
    </div>
    <div className="col-span-full min-w-0 xl:col-span-4">{children}</div>
    {!isLast && <div className="h-px bg-gray-200 col-span-full xl:col-span-5 my-2" />}
  </>
);

const FactorsSkeleton = () => (
  <div className="flex flex-col gap-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="flex flex-col gap-1.5">
        <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
      </div>
    ))}
  </div>
);

const MarketComparableForm = () => {
  const { t } = useTranslation('appraisal');
  const language = useLocaleStore(s => s.language);
  const isReadOnly = usePageReadOnly();
  const { getValues, setValue, reset, clearErrors, formState } = useFormContext();
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

  // Distance to the appraisal's nearest collateral, from the coordinates as typed.
  const appraisalId = useAppraisalId();
  const subjects = useSubjectPoints(appraisalId);
  const f = useMarketFormatters();
  const point =
    initialLat != null && initialLon != null && hasCoords(initialLat, initialLon)
      ? { lat: initialLat, lon: initialLon }
      : null;
  const nearest = nearestKm(point, subjects);

  // A sale price and an asking price are exclusive. Until the user picks, open on what was saved —
  // a comparable holding only an asking price opens on it. Read from the defaults rather than the
  // live values, so clearing the field being typed in does not flip the choice under the cursor.
  const [chosenKind, setChosenKind] = useState<PriceKind | null>(null);
  const saved = formState.defaultValues;
  const priceKind: PriceKind =
    chosenKind ?? (isSet(saved?.offerPrice) && !isSet(saved?.salePrice) ? 'offer' : 'sale');
  const choosePriceKind = (kind: PriceKind) => {
    if (kind === priceKind) return;
    const other =
      kind === 'sale'
        ? ['offerPrice', 'offerPriceUnit']
        : ['salePrice', 'salePriceUnit', 'saleDate'];
    for (const name of other) {
      if (isSet(getValues(name))) setValue(name, null, { shouldDirty: true });
    }
    clearErrors(['offerPrice', 'salePrice', 'saleDate']);
    setChosenKind(kind);
  };
  const priceKindOptions = [
    { value: 'sale' as const, label: t('marketEditor.price.sale'), icon: 'handshake' },
    { value: 'offer' as const, label: t('marketEditor.price.offer'), icon: 'tag' },
  ];

  const sourceFields: FormField[] = [
    {
      type: 'text-input',
      name: 'surveyName',
      label: t('marketEditor.fields.surveyName'),
      wrapperClassName: 'col-span-12',
      required: true,
      maxLength: 100,
    },
    {
      type: 'datetime-input',
      name: 'infoDateTime',
      label: t('marketEditor.fields.infoDateTime'),
      wrapperClassName: 'col-span-12 md:col-span-6',
      required: true,
      disableFutureDates: true,
    },
    {
      type: 'text-input',
      name: 'sourceInfo',
      label: t('marketEditor.fields.sourceInfo'),
      placeholder: t('marketEditor.fields.sourcePlaceholder'),
      wrapperClassName: 'col-span-12 md:col-span-6',
      maxLength: 200,
    },
  ];

  const templateFields: FormField[] = [
    {
      type: 'dropdown',
      name: 'templateCode',
      label: t('marketEditor.fields.template'),
      options: comparableTemplateOptions,
      wrapperClassName: 'col-span-12',
      required: true,
    },
  ];

  const priceFields: FormField[] =
    priceKind === 'sale'
      ? [
          {
            type: 'number-input',
            name: 'salePrice',
            label: t('marketEditor.price.sale'),
            wrapperClassName: 'col-span-12 md:col-span-5',
            required: true,
            maxIntegerDigits: 15,
            decimalPlaces: 2,
          },
          {
            type: 'dropdown',
            name: 'salePriceUnit',
            label: t('marketEditor.fields.priceUnit'),
            group: 'MeasurementUnits',
            wrapperClassName: 'col-span-12 md:col-span-4',
          },
          {
            type: 'date-input',
            name: 'saleDate',
            label: t('marketEditor.fields.saleDate'),
            wrapperClassName: 'col-span-12 md:col-span-3',
            disableFutureDates: true,
            requiredWhen: { field: 'salePrice', operator: 'isNotEmpty' },
          },
        ]
      : [
          {
            type: 'number-input',
            name: 'offerPrice',
            label: t('marketEditor.price.offer'),
            wrapperClassName: 'col-span-12 md:col-span-5',
            required: true,
            maxIntegerDigits: 15,
            decimalPlaces: 2,
          },
          {
            type: 'dropdown',
            name: 'offerPriceUnit',
            label: t('marketEditor.fields.priceUnit'),
            group: 'MeasurementUnits',
            wrapperClassName: 'col-span-12 md:col-span-4',
          },
        ];

  const locationFields: FormField[] = [
    {
      type: 'number-input',
      name: 'latitude',
      label: t('marketEditor.fields.latitude'),
      wrapperClassName: 'col-span-12 md:col-span-6',
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
      label: t('marketEditor.fields.longitude'),
      wrapperClassName: 'col-span-12 md:col-span-6',
      rightIcon: pickerButton,
      decimalPlaces: 6,
      maxIntegerDigits: 3,
      allowNegative: true,
      allowZero: true,
      min: -180,
      max: 180,
    },
  ];

  const remark: FormField[] = [
    {
      type: 'textarea',
      name: 'notes',
      label: '',
      wrapperClassName: 'col-span-12',
      maxLength: 4000,
      showCharCount: true,
    },
  ];

  // One factor per row, top to bottom, each labelled with its own name.
  const otherLabel = t('marketEditor.fields.other');
  const factorFields = factors.flatMap((fac: any, index: number) =>
    buildFormField(fac, index, getTranslatedFactorName(fac.translations, language), otherLabel),
  );

  let factorsBody: ReactNode;
  if (isLoading || getMarketLoading) factorsBody = <FactorsSkeleton />;
  else if (factors.length > 0)
    factorsBody = (
      <div className="grid grid-cols-12 gap-4">
        <FormFields fields={factorFields} />
      </div>
    );
  else factorsBody = <p className="text-sm text-gray-400">{t('marketEditor.factors.empty')}</p>;

  return (
    <>
      <div className="cas-section-grid grid grid-cols-1 xl:grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow
          id={COMPARABLE_SECTIONS.source}
          title={t('marketEditor.sections.source')}
          icon="circle-info"
        >
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={sourceFields} />
          </div>
        </SectionRow>

        <SectionRow
          id={COMPARABLE_SECTIONS.price}
          title={t('marketEditor.sections.price')}
          icon="money-bill"
        >
          {!isReadOnly && (
            <SegmentedControl
              className="mb-3 w-fit"
              options={priceKindOptions}
              value={priceKind}
              onChange={choosePriceKind}
            />
          )}
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={priceFields} />
          </div>
        </SectionRow>

        <SectionRow
          id={COMPARABLE_SECTIONS.location}
          title={t('marketEditor.sections.location')}
          icon="location-dot"
        >
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={locationFields} />
          </div>
          {point ? (
            nearest != null && (
              <p className="mt-3 text-xs text-gray-500">
                {t('marketEditor.location.nearest', { d: f.distance(nearest) })}
              </p>
            )
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
              <Icon name="location-dot" style="solid" className="text-[10px]" />
              {t('marketEditor.location.noCoords')}
            </p>
          )}
        </SectionRow>

        <SectionRow
          id={COMPARABLE_SECTIONS.factors}
          title={t('marketEditor.sections.factors')}
          icon="sliders"
          subtitle={
            factors.length > 0 ? t('marketEditor.factors.count', { n: factors.length }) : undefined
          }
        >
          {/* The template decides which factors there are, so it sits right above them. */}
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={templateFields} />
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4">{factorsBody}</div>
        </SectionRow>

        <SectionRow
          id={COMPARABLE_SECTIONS.remark}
          title={t('marketEditor.sections.remark')}
          icon="note-sticky"
          isLast
        >
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={remark} />
          </div>
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
    </>
  );
};

const buildFormField = (
  fac: any,
  index: number,
  label: string,
  otherLabel: string,
): FormField[] => {
  const isRequired = !!fac.isMandatory;
  switch (fac.dataType) {
    case 'Dropdown':
      return [
        {
          type: 'dropdown',
          name: `factorData.[${index}].value`,
          label,
          wrapperClassName: 'col-span-12',
          group: fac.parameterGroup,
          required: isRequired,
        },
        {
          type: 'text-input',
          label: otherLabel,
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
          label,
          name: `factorData.[${index}].value`,
          orientation: 'horizontal',
          group: fac.parameterGroup,
          wrapperClassName: 'col-span-12',
          required: isRequired,
        },
        {
          type: 'text-input',
          label: otherLabel,
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
          label,
          name: `factorData.[${index}].value`,
          orientation: 'horizontal',
          group: fac.parameterGroup,
          wrapperClassName: 'col-span-12',
          required: isRequired,
        },
        {
          type: 'text-input',
          label: otherLabel,
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
          label,
          name: `factorData.[${index}].value`,
          wrapperClassName: 'col-span-12',
        },
      ];

    case 'Numeric':
      return [
        {
          type: 'number-input',
          name: `factorData.[${index}].value`,
          label,
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
          label,
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
