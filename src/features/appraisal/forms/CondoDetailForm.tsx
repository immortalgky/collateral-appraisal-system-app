import {
  FormFields,
  FormSection,
  FormSheet,
  booleanChips,
  PART_WIDTH,
  type FormField,
} from '@/shared/components/form';
import { useContext, useEffect, useMemo, useState } from 'react';
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
  environmentProblemItems,
  otherLegalLimitationsChip,
  otherLegalLimitationsField,
  inForestBoundaryFormFields,
  remarkFormFields,
  rentedOutField,
  roadField,
  transpotationField,
} from '../configs/fields';
import { PropertyNameTriggerIcon } from '../components/PropertyNameTriggerIcon';
import { FieldLabels } from '../components/FieldLabels';
import EnvironmentProblemsHeading from '../components/EnvironmentProblemsHeading';
import LimitationLawHints from '../components/LimitationLawHints';
import UrbanPlanningColorField from '../components/UrbanPlanningColorField';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import { useRentedOutFollowsLease } from '../hooks/useRentedOutFollowsLease';
import { documentValidationToggle } from '../utils/documentValidationToggle';

function CondoDetailForm({ hideRentedOut = false }: { hideRentedOut?: boolean }) {
  const { t } = useTranslation('appraisal');
  const { t: tc } = useTranslation('common');
  const { setValue, watch } = useFormContext();
  useRentedOutFollowsLease(!hideRentedOut);
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
              { name: '2', label: tc('toggle.Incorrect') },
              { name: '1', label: tc('toggle.Correct') },
            ] as [{ name: string; label: string }, { name: string; label: string }],
          };
        // Stored as the code '01' (consistent) / '02' (inconsistent): a toggle, inconsistent on the left.
        if (field.name === 'documentValidationResultType')
          return documentValidationToggle(field, key => tc(key as never));
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
  const legal = useMemo(
    () =>
      withIcons(hideRentedOut ? legalFields.filter(f => f.name !== 'isRentedOut') : legalFields),
    [withIcons, hideRentedOut],
  );
  // The name is drawn in the page header when the shell has one (see PropertyNameInHeaderContext).
  const nameInHeader = useContext(PropertyNameInHeaderContext);
  const identity = useMemo(
    () =>
      withIcons(
        nameInHeader ? identityFields.filter(f => f.name !== 'propertyName') : identityFields,
      ),
    [withIcons, nameInHeader],
  );
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
              // A row of its own in the left column of the 6 + 6 rows around it.
              wrapperClassName: `col-span-12 ${PART_WIDTH.half}`,
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
          <FormFields fields={addressFields} />
          <FormFields fields={dopaAddressFields} />
          {/* The Latitude field's rightIcon opens the MapLocationPicker. */}
          <FormFields fields={officeAndCoordinates} />
          <FormFields fields={road} />
          {/* The check of the position comes last, as the report prints it. */}
          <FormFields fields={locationCheck} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.surroundings')} icon="tree-city">
          <FormFields fields={surroundingToPlanning} />
          <UrbanPlanningColorField />
          <FormFields fields={surroundingRest} />
          {/* The neighbouring problems close the group, as they do on the land form. */}
          <EnvironmentProblemsHeading />
          <FormFields fields={environmentProblemItems} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.access')} icon="road">
          <FormFields fields={accessFields} />
        </FormSection>

        <FormSection title={t('forms.condo.groups.utilities')} icon="bolt">
          <FormFields fields={utilityFields} />
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

        <FormSection title={t('forms.condo.groups.limitation')} icon="triangle-exclamation">
          <FormFields fields={limitationChipFields} />
          <LimitationLawHints />
          <FormFields fields={limitationFollowFields} />
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
    otherLegalLimitationsField,
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
    rentedOutField,
    // The road in front and the ways of getting there: the land form's fields, reused.
    roadField.find(f => f.name === 'roadPassInFrontOfLand')!,
    ...transpotationField,
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
  // The names take a row each (the condo's is long); the numbers follow four to a row, then the
  // model beside the usable area, half and half: room, floor, building, registration / model,
  // usable area / title deed.
  ['propertyName', 'col-span-12'],
  ['condoName', 'col-span-12'],
  ['roomNumber', 'col-span-3'],
  ['floorNumber', 'col-span-3'],
  ['buildingNumber', 'col-span-3'],
  ['condoRegistrationNumber', 'col-span-3'],
  // The model and the usable area share a row, half and half (6 + 6).
  ['modelName', 'col-span-6'],
  // Carries the check against the area table below (withIcons), wherever it sits.
  ['usableArea', 'col-span-6'],
  'titleNumber',
);

const legalFields = pick(
  // The check and the owner's name are one row (toggle + field), as on the land form.
  ['isOwnerVerified', 'col-span-3'],
  ['ownerName', 'col-span-9'],
  'obligationType',
  'mortgageDetails',
  'obligationDetails',
  // The document check sits right under the obligations, and rented out on the row after it: each a
  // lone toggle on a full-row cell, at its own width. (`isRentedOut` can be filtered out by name.)
  ['documentValidationResultType', 'col-span-12'],
  ['isRentedOut', 'col-span-12'],
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

// The toggle alone on its row, then the two prices half and half (the fire insurance rows below
// keep to the same two columns).
const governmentPriceFields = pick(
  ['isMissingFromSurvey', 'col-span-12'],
  ['governmentPricePerSqm', 'col-span-6'],
  ['governmentPrice', 'col-span-6'],
);

// The land office and the coordinates make one row (6 + 3 + 3), right under the DOPA address.
const landOfficeFields = pick(['landOffice', 'col-span-6']);

const coordinateFields = pick(['latitude', 'col-span-3'], ['longitude', 'col-span-3']);

// Last field of the location section, as on the land form; the remark opens under it while incorrect.
const locationCheckFields = pick(
  ['locationType', 'col-span-3', 3],
  ['locationRemark', 'col-span-12'],
);

// Street (as wide as the land office above it), soi and the distance to the main road: 6 + 3 + 3.
const roadFields = pick(
  ['street', 'col-span-6'],
  ['soi', 'col-span-3'],
  ['distanceFromMainRoad', 'col-span-3'],
);

// Access first (the right of way in and out, then the ways of getting there: chips, each on a row of
// its own), then the road in front on a full row, then, as on the land form, the carriageway,
// right-of-way and lanes 4 + 4 + 4, and the surface.
const accessFields = pick(
  'landEntranceExitType',
  'landEntranceExitTypeOther',
  'transportationAccessType',
  'transportationAccessTypeOther',
  ['roadPassInFrontOfLand', 'col-span-12'],
  ['carriagewayWidth', 'col-span-4'],
  ['rightOfWayWidth', 'col-span-4'],
  ['numberOfLanes', 'col-span-4'],
  'roadSurfaceType',
  'roadSurfaceTypeOther',
);

const utilityFields = pick('publicUtilityType', 'publicUtilityTypeOther');

const surroundingToPlanning = pick('urbanPlanningType');

// After the planning type and its colour cards.
const surroundingRest = pick(
  ['landFillType', 'col-span-8'],
  'landFillTypeOther',
  'landUseType',
  'landUseTypeOther',
  'environmentType',
  'environmentTypeOther',
);

const buildingFields = pick(
  // Whether it is under construction opens the group, alone on a full-row cell with the toggle at its
  // own width (picking the condition "under construction" turns it on: `defaultWhen`). The age and the
  // floors follow, each on a row of its own at half width.
  ['isUnderConstruction', 'col-span-12'],
  ['buildingAge', `col-span-12 ${PART_WIDTH.half}`],
  ['numberOfFloors', `col-span-12 ${PART_WIDTH.half}`],
  'buildingConditionType',
  'buildingConditionTypeOther',
  ['buildingFormType', 'col-span-12'],
  ['constructionMaterialType', 'col-span-12'],
  'roofType',
  'roofTypeOther',
  'facilityType',
  'facilityTypeOther',
);

// As on the land form: the limitations found are one chip group; the expropriation line and the forest
// line are plain yes/no chips (their detail is in the Law & Regulation tab, see `LimitationLawHints`),
// and "Others" opens its text.
const limitationChipFields = [
  booleanChips(
    'limitationFlags',
    'Limitations Found',
    pick('isInExpropriationLine', 'isForestBoundary').concat(otherLegalLimitationsChip),
  ),
];
const limitationFollowFields = pick('otherLegalLimitations');

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
