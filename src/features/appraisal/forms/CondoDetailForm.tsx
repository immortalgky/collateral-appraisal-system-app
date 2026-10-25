import { FormFields, FormSection, FormSheet, type FormField } from '@/shared/components/form';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import CondoAreaDetailForm, { UsableAreaCheck } from './CondoAreaDetailForm';
import CondoInsuranceSummary from './CondoInsuranceSummary';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';
import { useFireInsuranceOptions } from '@/shared/api/pricingParameters';
import {
  condoAddressFields,
  condoDopaAddressFields,
  condoFields,
  condoFieldsTail,
  condoLocationFields,
  condoLandCharacteristicsFields,
  condoGovernmentPriceFields,
  condoBuildingInsuranceFields,
  condoDecorationFields,
  ageHeightCondoFields,
  buildingFormFields,
  constructionMaterialsFormFields,
  condoRoomLayoutFormFields,
  locationViewFormFields,
  groundFloorFields,
  upperFloorFields,
  bathroomFloorFields,
  roofFormFields,
  expropriationFields,
  condoFacilityFields,
  environmentFields,
  inForestBoundaryFormFields,
  remarkFormFields,
} from '../configs/fields';
import { PropertyNameTriggerIcon } from '../components/PropertyNameTriggerIcon';
import { FieldLabels } from '../components/FieldLabels';

function CondoDetailForm() {
  const { t } = useTranslation('appraisal');
  const { t: tc } = useTranslation('common');
  const { setValue, watch } = useFormContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const lat = watch('latitude');
  const lon = watch('longitude');
  const govPricePerSqm = watch('governmentPricePerSqm');
  const usableArea = watch('usableArea');
  const parsedLat = lat != null && lat !== '' ? Number(lat) : null;
  const parsedLon = lon != null && lon !== '' ? Number(lon) : null;
  const initialLat = parsedLat != null && !Number.isNaN(parsedLat) ? parsedLat : null;
  const initialLon = parsedLon != null && !Number.isNaN(parsedLon) ? parsedLon : null;

  const pickerButton = useMemo(
    () => <MapPickerTriggerIcon onClick={() => setPickerOpen(true)} />,
    [],
  );

  const fillIcon = useMemo(() => <PropertyNameTriggerIcon propertyType="U" />, []);

  // Government price is computed (pricePerSqm × usableArea) and locked, mirroring the
  // Rai/Ngan/Sq.Wa × pricePerSqWa calculation on the land title form.
  useEffect(() => {
    const price = Number(govPricePerSqm) || 0;
    const area = Number(usableArea) || 0;
    setValue('governmentPrice', Math.round(price * area * 100) / 100, { shouldValidate: true });
  }, [govPricePerSqm, usableArea, setValue]);

  // Map picker on the coordinates, the auto-fill icon on the property name.
  const withIcons = useMemo(
    () => (list: FormField[]) =>
      list.map(field => {
        if (field.name === 'propertyName' && fillIcon) return { ...field, rightIcon: fillIcon };
        // The area table's total against this figure, with a way to take the table's.
        if (field.name === 'usableArea' && field.type === 'number-input')
          return { ...field, helperText: <UsableAreaCheck name="areaDetails" /> };
        // Stored as the code '1' (correct) / '2' (incorrect): a toggle like the land location check,
        // incorrect on the left. The captions are the common toggle texts, in the user's language.
        if (field.name === 'locationType')
          return {
            type: 'string-toggle' as const,
            label: field.label ?? '',
            name: field.name,
            wrapperClassName: field.wrapperClassName,
            options: [
              { name: '2', label: tc('toggle.In Correct') },
              { name: '1', label: tc('toggle.Correct') },
            ] as [{ name: string; label: string }, { name: string; label: string }],
          };
        // Stored as the code '01' (consistent) / '02' (inconsistent): a toggle, inconsistent on the left.
        if (field.name === 'documentValidationResultType')
          return {
            type: 'string-toggle' as const,
            label: field.label ?? '',
            name: field.name,
            required: field.required,
            wrapperClassName: field.wrapperClassName,
            options: [
              { name: '02', label: tc('toggle.Inconsistent') },
              { name: '01', label: tc('toggle.Consistent') },
            ] as [{ name: string; label: string }, { name: string; label: string }],
          };
        if (
          (field.name === 'latitude' || field.name === 'longitude') &&
          field.type === 'number-input'
        )
          return { ...field, rightIcon: pickerButton };
        return field;
      }),
    [fillIcon, pickerButton, tc],
  );
  const road = useMemo(() => withIcons(roadFields), [withIcons]);
  const locationCheck = useMemo(() => withIcons(locationCheckFields), [withIcons]);
  const legal = useMemo(() => withIcons(legalFields), [withIcons]);
  const identity = useMemo(() => withIcons(identityFields), [withIcons]);
  // One FormFields call, so the land office and the coordinates are read as one row (6 + 3 + 3).
  const officeAndCoordinates = useMemo(
    () => [...landOfficeFields, ...withIcons(coordinateFields)],
    [withIcons],
  );

  // Building Insurance: buildingInsurancePrice is SERVER-DERIVED (rate × usableArea) —
  // unlike Government Price above, there is no client-side computation here. The field
  // is disabled/display-only, populated from whatever the GET response returns; the
  // save mutation invalidates the condo property query so the freshly-derived value
  // comes back after save.
  const fireInsuranceOptions = useFireInsuranceOptions('Condo');
  const buildingInsuranceFields = useMemo<FormField[]>(
    () =>
      // buildingInsurancePrice is drawn by CondoInsuranceSummary, which shows its formula under it.
      condoBuildingInsuranceFields
        .filter(field => field.name !== 'buildingInsurancePrice')
        .map(field => {
          // Narrow on `type` as well as `name`: spreading into a bare FormField union
          // widens `options` across every variant (boolean-toggle requires exactly
          // [string, string]), which breaks the discriminated union.
          if (field.type === 'dropdown' && field.name === 'fireInsuranceCode')
            return {
              ...field,
              wrapperClassName: 'col-span-4',
              label: t('forms.condo.fireInsuranceCode'),
              options: fireInsuranceOptions,
            };
          return field;
        }),
    [fireInsuranceOptions, t],
  );

  // FormFields must remain a DIRECT child of each FormSection so every field's wrapperClassName
  // (col-span-3, col-span-6, etc.) resolves against the section's 12-col grid.
  return (
    <FieldLabels scope="condo">
      <FormSheet>
        <FormSection title={t('forms.condo.groups.identification')} icon="building">
          <FormFields fields={identity} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.ownership')} icon="scale-balanced">
          <FormFields fields={legal} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.location')} icon="map-location-dot">
          <FormFields fields={locationCheck} />
          <FormFields fields={addressFields} />
          <FormFields fields={dopaAddressFields} />
          {/* The Latitude field's rightIcon opens the MapLocationPicker. */}
          <FormFields fields={officeAndCoordinates} />
          <FormFields fields={road} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.surroundings')} icon="tree-city">
          <FormFields fields={surroundingFields} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.building')} icon="building-columns">
          <FormFields fields={buildingFields} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.unit')} icon="door-open">
          {/* The table is checked against the usable area in the identification section. */}
          <div className="col-span-12">
            <CondoAreaDetailForm name={'areaDetails'} />
          </div>
          <FormFields fields={unitFields} />
        </FormSection>

        <FormSection
          title={t('landCharacteristicsForm.sections.limitation')}
          icon="triangle-exclamation"
        >
          <FormFields fields={limitationFields} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.referencePrices')} icon="money-bill">
          <FormFields fields={governmentPriceFields} />
          <FormFields fields={buildingInsuranceFields} />
          <CondoInsuranceSummary />
        </FormSection>

        <FormSection title={t('forms.condo.groups.remark')} icon="comment">
          <FormFields fields={remarkFormFields} />
        </FormSection>
      </FormSheet>

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
    </FieldLabels>
  );
}

/*
 * The screen's field order: identification, ownership, where it is, what surrounds it, the
 * building, then the unit being appraised. The configs in configs/fields.ts stay as they are and
 * are picked by name here; a span given here replaces the config's own col-span for this screen.
 */
const urbanPlanChips: FormField = {
  type: 'radio-group',
  label: 'Type of urban plan',
  name: 'urbanPlanningType',
  orientation: 'horizontal',
  group: 'TypeOfUrbanPlanning',
  variant: 'button',
  wrapperClassName: 'col-span-12',
};

const byName = new Map(
  [
    ...condoFields,
    ...condoFieldsTail,
    ...condoLocationFields,
    ...condoLandCharacteristicsFields,
    ...condoDecorationFields,
    ...ageHeightCondoFields,
    ...buildingFormFields,
    ...constructionMaterialsFormFields,
    ...condoRoomLayoutFormFields,
    ...locationViewFormFields,
    ...groundFloorFields,
    ...upperFloorFields,
    ...bathroomFloorFields,
    ...roofFormFields,
    ...condoFacilityFields,
    ...environmentFields,
    ...condoAddressFields,
    ...condoDopaAddressFields,
    ...condoGovernmentPriceFields,
    ...expropriationFields,
    ...inForestBoundaryFormFields,
    // Chips on this screen only: the config stays a dropdown elsewhere.
    urbanPlanChips,
  ].map(field => [field.name, field]),
);

const pick = (
  ...entries: (string | [name: string, span: string, narrowSpan?: 3 | 4 | 6 | 12])[]
): FormField[] =>
  entries.map(entry => {
    const [name, span, narrowSpan] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`CondoDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim(), narrowSpan };
  });

const identityFields = pick(
  ['propertyName', 'col-span-6'],
  ['condoName', 'col-span-6'],
  ['roomNumber', 'col-span-6'],
  ['floorNumber', 'col-span-6'],
  ['buildingNumber', 'col-span-6'],
  ['condoRegistrationNumber', 'col-span-6'],
  ['modelName', 'col-span-6'],
  // Carries the check against the area table below (withIcons), wherever it sits.
  ['usableArea', 'col-span-6'],
  'titleNumber',
);

const legalFields = pick(
  // The owner's name sits on its own line under the check, as on the land form.
  ['isOwnerVerified', 'col-span-4'],
  ['ownerName', 'col-span-8'],
  'hasObligation',
  ['obligationDetails', 'col-span-12'],
  // On a row of its own under the obligation; the long captions keep their width when narrow.
  ['documentValidationResultType', 'col-span-4', 4],
);

const addressFields = pick(
  ['subDistrict', 'col-span-4'],
  ['districtName', 'col-span-4'],
  ['provinceName', 'col-span-4'],
);

const dopaAddressFields = pick(
  ['dopaSubDistrict', 'col-span-4'],
  ['dopaDistrictName', 'col-span-4'],
  ['dopaProvinceName', 'col-span-4'],
);

const governmentPriceFields = pick(
  ['isMissingFromSurvey', 'col-span-4'],
  ['governmentPricePerSqm', 'col-span-4'],
  ['governmentPrice', 'col-span-4'],
);

// The land office and the coordinates make one row (6 + 3 + 3), right under the DOPA address.
const landOfficeFields = pick(['landOffice', 'col-span-6']);

const coordinateFields = pick(['latitude', 'col-span-3'], ['longitude', 'col-span-3']);

// First field of the location section, as on the land form.
const locationCheckFields = pick(['locationType', 'col-span-3', 3]);

const roadFields = pick(
  ['street', 'col-span-4'],
  ['soi', 'col-span-4'],
  ['distanceFromMainRoad', 'col-span-4'],
  ['accessRoadWidth', 'col-span-6'],
  ['rightOfWay', 'col-span-6'],
  ['roadSurfaceType', 'col-span-6'],
  'roadSurfaceTypeOther',
);

const surroundingFields = pick(
  'publicUtilityType',
  'publicUtilityTypeOther',
  'landEntranceExitType',
  'landEntranceExitTypeOther',
  'urbanPlanningType',
  ['landFillType', 'col-span-8'],
  'landFillTypeOther',
  'landUseType',
  'landUseTypeOther',
  'environmentType',
  'environmentTypeOther',
);

const buildingFields = pick(
  ['buildingAge', 'col-span-3'],
  ['numberOfFloors', 'col-span-3'],
  ['isUnderConstruction', 'col-span-6'],
  'buildingConditionType',
  'buildingConditionTypeOther',
  ['buildingFormType', 'col-span-6'],
  ['constructionMaterialType', 'col-span-6'],
  'roofType',
  'roofTypeOther',
  'facilityType',
  'facilityTypeOther',
);

// As on the land form: the two expropriation toggles and the royal decree make one row at every
// width (3 + 3 + 6), the remarks open as full rows under it, then the forest toggle and its remark.
const limitationFields = pick(
  ['isExpropriated', 'col-span-3', 3],
  ['isInExpropriationLine', 'col-span-3', 3],
  ['royalDecree', 'col-span-6'],
  'expropriationRemark',
  'expropriationLineRemark',
  ['isForestBoundary', 'col-span-3', 3],
  'forestBoundaryRemark',
);

const unitFields = pick(
  'decorationType',
  'decorationTypeOther',
  'roomLayoutType',
  'roomLayoutTypeOther',
  'locationViewType',
  'locationViewTypeOther',
  'groundFloorMaterialType',
  'groundFloorMaterialTypeOther',
  'upperFloorMaterialType',
  'upperFloorMaterialTypeOther',
  'bathroomFloorMaterialType',
  'bathroomFloorMaterialTypeOther',
);

export default CondoDetailForm;
