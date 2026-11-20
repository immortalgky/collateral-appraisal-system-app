import { useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  FormFields,
  FormSection,
  FormSheet,
  flowGroup,
  booleanChips,
  type FormField,
} from '@/shared/components/form';
import BoundaryFields from '../components/BoundaryFields';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';
import {
  allocationField,
  anticipationProsperityField,
  environmentProblemItems,
  evictionField,
  expropriateField,
  landAddressFields,
  landBoundaryField,
  otherLegalLimitationsChip,
  otherLegalLimitationsField,
  landDopaAddressFields,
  landEntranceField,
  landFillField,
  landInfoField,
  landInfoFieldTail,
  landLocationField,
  landUseField,
  otherInformationField,
  plotLocationField,
  publicUtilityField,
  remarkLandField,
  roadField,
  roadSurfaceField,
  transpotationField,
  environmentFields,
} from '../configs/fields';
import { PropertyNameTriggerIcon, type PropertyType } from '../components/PropertyNameTriggerIcon';
import { FieldLabels } from '../components/FieldLabels';
import EnvironmentProblemsHeading from '../components/EnvironmentProblemsHeading';
import LimitationLawHints from '../components/LimitationLawHints';
import UrbanPlanningColorField from '../components/UrbanPlanningColorField';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import { useRentedOutFollowsLease } from '../hooks/useRentedOutFollowsLease';

interface LandDetailFormProps {
  propertyType?: PropertyType;
  /** A leasehold property page: its lease tabs are always on, so there is no rented-out switch. */
  hideRentedOut?: boolean;
}

const LandDetailForm = ({ propertyType = 'L', hideRentedOut = false }: LandDetailFormProps) => {
  // 'appraisal' stays the default namespace; 'common' is here for the shared action labels on the
  // deduction-clearing confirm, the same pairing FormTable uses for its own delete dialog.
  const { t } = useTranslation(['appraisal', 'common']);
  const readOnly = usePageReadOnly();
  const { watch, setValue } = useFormContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const lat = watch('latitude');
  const lon = watch('longitude');
  const parsedLat = lat != null && lat !== '' ? Number(lat) : null;
  const parsedLon = lon != null && lon !== '' ? Number(lon) : null;
  const initialLat = parsedLat != null && !Number.isNaN(parsedLat) ? parsedLat : null;
  const initialLon = parsedLon != null && !Number.isNaN(parsedLon) ? parsedLon : null;

  useRentedOutFollowsLease(!hideRentedOut);
  const ownership = useMemo(
    () => (hideRentedOut ? ownershipFields.filter(f => f.name !== 'isRentedOut') : ownershipFields),
    [hideRentedOut],
  );

  const pickerButton = useMemo(
    () => <MapPickerTriggerIcon onClick={() => setPickerOpen(true)} />,
    [],
  );

  const fillIcon = useMemo(
    () => <PropertyNameTriggerIcon propertyType={propertyType} />,
    [readOnly],
  );

  // Auto-fill icon on the property name; map-picker trigger on the lat/lon inputs (hidden in
  // read-only mode).
  const decorate = useMemo(
    () => (list: FormField[]) =>
      list.map(field => {
        if (field.name === 'propertyName' && fillIcon) return { ...field, rightIcon: fillIcon };
        if (
          !readOnly &&
          (field.name === 'latitude' || field.name === 'longitude') &&
          field.type === 'number-input'
        )
          return { ...field, rightIcon: pickerButton };
        return field;
      }),
    [pickerButton, fillIcon, readOnly],
  );
  // The name is drawn in the page header when the shell has one (see PropertyNameInHeaderContext).
  const nameInHeader = useContext(PropertyNameInHeaderContext);
  const identity = useMemo(() => decorate(identityFields), [decorate]);
  // One FormFields call, so the land office and the coordinates are read as one row (6 + 3 + 3).
  const officeAndCoordinates = useMemo(
    () => [...landOfficeFields, ...decorate(coordinateFields)],
    [decorate],
  );

  return (
    <FieldLabels scope="land">
      <div className="w-full max-w-full">
        {/* No page heading here: the section header above this form already names it, so
          printing it again read as two copies of the same title. */}
        <FormSheet>
          {/* The name is the page header's when the shell has one; no group of its own then. */}
          {!nameInHeader && (
            <FormSection title={t('forms.land.groups.identification')} icon="circle-info">
              <FormFields fields={identity} />
            </FormSection>
          )}

          <FormSection title={t('forms.land.groups.ownership')} icon="scale-balanced">
            <FormFields fields={ownership} />
          </FormSection>

          <FormSection title={t('forms.land.groups.location')} icon="map-location-dot">
            <FormFields fields={addressFields} />
            <FormFields fields={dopaAddressFields} />
            <FormFields fields={officeAndCoordinates} />
            <FormFields fields={streetFields} />
            {/* The check of the position comes last, as the report prints it (1.1, then 1.6). */}
            <FormFields fields={locationCheckFields} />
          </FormSection>

          <FormSection title={t('forms.land.groups.areaZoning')} icon="city">
            <FormFields fields={areaZoningToPlanning} />
            <UrbanPlanningColorField />
            <FormFields fields={areaZoningRest} />
            {/* The neighbouring problems close the group. */}
            <EnvironmentProblemsHeading />
            <FormFields fields={environmentProblemItems} />
          </FormSection>

          <FormSection title={t('forms.land.groups.access')} icon="road">
            <FormFields fields={accessFields} />
          </FormSection>

          <FormSection title={t('forms.land.groups.utilities')} icon="bolt">
            <FormFields fields={utilityFields} />
          </FormSection>

          <FormSection title={t('forms.land.groups.physical')} icon="mountain">
            <FormFields fields={physicalFields} />
            <BoundaryFields readOnly={readOnly} />
          </FormSection>

          <FormSection title={t('forms.land.groups.limitation')} icon="triangle-exclamation">
            <FormFields fields={limitationChipFields} />
            <LimitationLawHints />
            <FormFields fields={limitationFollowFields} />
          </FormSection>

          <FormSection
            title={t('landCharacteristicsForm.sections.propertyListRemark')}
            icon="comment"
          >
            <FormFields fields={remarkLandField} />
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
      </div>
    </FieldLabels>
  );
};

/*
 * The screen's field order, grouped the way an appraiser collects it: what the plot is, who owns
 * and uses it, where it is, what surrounds it, how it is reached and served, what it physically is,
 * then its limitations. The configs in configs/fields.ts stay as they are (the land-and-building
 * forms and the schema read them) and are picked by name here; a span given here replaces the
 * config's own col-span for this screen only.
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
    ...landInfoField,
    ...landInfoFieldTail,
    ...landAddressFields,
    ...landDopaAddressFields,
    ...landLocationField,
    ...plotLocationField,
    ...landFillField,
    ...roadField,
    ...roadSurfaceField,
    ...publicUtilityField,
    ...landUseField,
    ...landEntranceField,
    ...transpotationField,
    ...environmentFields,
    ...expropriateField,
    ...landBoundaryField,
    otherLegalLimitationsField,
    ...anticipationProsperityField,
    ...evictionField,
    ...allocationField,
    ...otherInformationField,
    // Chips on this screen only: the config stays a dropdown for the block and market forms.
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
    if (!field) throw new Error(`LandDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim(), narrowSpan };
  });

const identityFields = pick('propertyName');

// The deed's issuing office sits right under the DOPA address, with the coordinates (6 + 3 + 3).
const landOfficeFields = pick(['landOffice', 'col-span-6']);

const ownershipFields = pick(
  // The check and the owner's name are one row: the toggle as wide as it needs, the name the rest.
  ['isOwnerVerifiedLand', 'col-span-3'],
  ['ownerNameLand', 'col-span-9'],
  'obligationType',
  'mortgageDetails',
  'obligationDetails',
  // After the obligation chips and their details, on a row of its own. Full width: the lock hint
  // under it ("Yes because …") is as wide as its cell, and wrapped at a quarter of the row.
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

// The verdict and what it was checked from share a row while there is room; the chips wrap under
// the toggle when there is not. The "other" text and, while the position is incorrect, the remark open
// in the block under them.
const locationCheckFields = [
  flowGroup(
    pick('isLandLocationVerified', 'landCheckMethodType'),
    pick('landCheckMethodTypeOther', 'landLocationRemark'),
  ),
];

const streetFields = pick(
  ['village', 'col-span-6'],
  ['addressLocation', 'col-span-6'],
  // Street (as wide as the land office above it), soi and the distance to the main road: 6 + 3 + 3.
  ['street', 'col-span-6'],
  ['soi', 'col-span-3'],
  ['distanceFromMainRoad', 'col-span-3'],
);

const coordinateFields = pick(['latitude', 'col-span-3'], ['longitude', 'col-span-3']);

const areaZoningToPlanning = pick(
  'landZoneType',
  'landZoneTypeOther',
  // The surroundings, as chips (the condo form's field, reused).
  'environmentType',
  'environmentTypeOther',
  // Whether the plot sits in a licensed housing-estate project (new / old / not allocated).
  ['allocationType', 'col-span-6'],
  ['propertyAnticipationType', 'col-span-6'],
  'propertyAnticipationTypeOther',
  'developmentSuitabilityType',
  'urbanPlanningType',
);

// After the planning type and its colour cards.
const areaZoningRest = pick('landUseType', 'landUseTypeOther');

// Access first (chips, full rows), then the road: road in front on a row of its own, the carriageway,
// right-of-way and lanes (4 + 4 + 4), then the frontage and the sides it faces the road on (6 + 6),
// then the surface.
const accessFields = pick(
  'landAccessibilityType',
  'landAccessibilityRemark',
  'transportationAccessType',
  'transportationAccessTypeOther',
  'landEntranceExitType',
  'landEntranceExitTypeOther',
  ['roadPassInFrontOfLand', 'col-span-12'],
  ['carriagewayWidth', 'col-span-4'],
  ['rightOfWayWidth', 'col-span-4'],
  ['numberOfLanes', 'col-span-4'],
  ['roadFrontage', 'col-span-6'],
  ['numberOfSidesFacingRoad', 'col-span-6'],
  'roadSurfaceType',
  'roadSurfaceTypeOther',
);

const utilityFields = pick('publicUtilityType', 'publicUtilityTypeOther');

const physicalFields = pick(
  // Chips: a row of their own in Standard, whatever span is given. The shape and the plot's
  // position (moved here from the area group, as the report prints them) come first.
  ['landShapeType', 'col-span-6'],
  'landShapeTypeOther',
  'plotLocationType',
  'plotLocationTypeOther',
  ['landFillType', 'col-span-6'],
  'landFillTypeOther',
  // Fill share and soil level make one row (6 + 6), the pond's area and depth the next (6 + 6).
  ['landFillPercent', 'col-span-6'],
  ['soilLevel', 'col-span-6'],
  // "Has a building" (hasBuilding / hasBuildingOther) is not asked any more: the fields stay in the
  // schema and mappers so a stored value goes back untouched on save.
  ['pondArea', 'col-span-6'],
  ['pondDepth', 'col-span-6'],
  // The description of the land, relabelled "physical characteristics (description)" (same field, new label).
  'landDescription',
);

// The area-deduction switch and table sit under the title deeds (LandAreaDeductionSection).
// The limitations found are one multi-select chip group. The expropriation line and the forest line are
// plain yes/no chips: their detail (the decree, the remarks) is a topic of the Law & Regulation tab,
// which `LimitationLawHints` points to under the chips; "Others" opens its text.
const limitationChipFields = [
  // Right restriction (a state utility taking part of the plot), stored as evictionType, first in the section: part of the plot
  // given over to a high-voltage line or an underground railway — a limitation like the
  // expropriation line.
  ...pick('evictionType', 'evictionTypeOther', 'evictionRemark'),
  booleanChips(
    'limitationFlags',
    'Limitations Found',
    pick('isInExpropriationLine', 'isForestBoundary').concat(otherLegalLimitationsChip),
  ),
];
const limitationFollowFields = pick('otherLegalLimitations');

export default LandDetailForm;
