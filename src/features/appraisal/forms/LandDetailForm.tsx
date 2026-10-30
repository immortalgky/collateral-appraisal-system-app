import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormFields, FormSection, FormSheet, type FormField } from '@/shared/components/form';
import LandAreaDeductionTable from '../components/tables/LandAreaDeductionTable';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import BoundaryFields from '../components/BoundaryFields';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';
import {
  allocationField,
  anticipationProsperityField,
  electricityField,
  encroachedField,
  evictionField,
  expropriateField,
  landAddressFields,
  landBoundaryField,
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
} from '../configs/fields';
import { PropertyNameTriggerIcon, type PropertyType } from '../components/PropertyNameTriggerIcon';
import { FieldLabels } from '../components/FieldLabels';

interface LandDetailFormProps {
  propertyType?: PropertyType;
}

const LandDetailForm = ({ propertyType = 'L' }: LandDetailFormProps) => {
  // 'appraisal' stays the default namespace; 'common' is here for the shared action labels on the
  // deduction-clearing confirm, the same pairing FormTable uses for its own delete dialog.
  const { t } = useTranslation(['appraisal', 'common']);
  const readOnly = usePageReadOnly();
  const { watch, setValue, getValues } = useFormContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const lat = watch('latitude');
  const lon = watch('longitude');
  const parsedLat = lat != null && lat !== '' ? Number(lat) : null;
  const parsedLon = lon != null && lon !== '' ? Number(lon) : null;
  const initialLat = parsedLat != null && !Number.isNaN(parsedLat) ? parsedLat : null;
  const initialLon = parsedLon != null && !Number.isNaN(parsedLon) ? parsedLon : null;

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
  const identity = useMemo(() => decorate(identityFields), [decorate]);
  // One FormFields call, so the land office and the coordinates are read as one row (6 + 3 + 3).
  const officeAndCoordinates = useMemo(
    () => [...landOfficeFields, ...decorate(coordinateFields)],
    [decorate],
  );

  // Stored as IsEncroached, but the label now names the whole bucket the bank already uses —
  // encroachment, land used by others, and any other reason to cut appraised area.
  const hasAreaDeductions = useWatch({ name: 'isEncroached' });

  // Switching the toggle off clears the deduction rows. Hiding the table alone left them in form
  // state and they went on being saved, so the appraised area stayed reduced by a table nobody
  // could see. An empty list is the API's "delete them all" (null means "leave alone"), and the
  // handler recalculates the stored DeductedAreaInSqWa afterwards — so clearing here is what
  // reaches the database, and the net area goes back to the registered area.
  //
  // Only on a genuine on -> off flip by the appraiser, the same rule the shared clearOnHide
  // effect uses: the form defaults isEncroached to false, so neither mount nor the reset() that
  // lands a saved record looks like a flip, and a stored record opens with its rows untouched.
  const wasEncroachedRef = useRef<boolean | null>(null);
  // How many rows are waiting on the appraiser's confirmation; null means no dialog is open.
  const [pendingClearCount, setPendingClearCount] = useState<number | null>(null);

  useEffect(() => {
    const wasEncroached = wasEncroachedRef.current;
    wasEncroachedRef.current = hasAreaDeductions === true;

    if (wasEncroached !== true || hasAreaDeductions === true) return;
    const rowCount = ((getValues('landAreaDeductions') as unknown[] | null) ?? []).length;
    // Nothing to lose, nothing to ask: with no rows entered this stays a plain toggle.
    if (rowCount === 0) return;

    // Put the switch back ON and ask first. The toggle has already written its own value by the
    // time this runs, so leaving it off while the rows still exist would put the screen at odds
    // with the data — the very thing the clearing is here to prevent. Restoring it also means
    // Cancel needs no undo path: the switch simply never stayed off. shouldDirty lets RHF
    // re-derive the flag against the loaded record, so restoring it on a record that was already
    // encroached drops the dirty mark rather than leaving a phantom unsaved change.
    setValue('isEncroached', true, { shouldDirty: true, shouldValidate: false });
    setPendingClearCount(rowCount);
  }, [hasAreaDeductions, getValues, setValue]);

  // Confirmed: drop the rows first, then let the switch go off. That order is what stops the
  // dialog reopening itself — the effect re-fires on the flip and stops at its own "nothing to
  // lose" guard, because by then there is nothing left to lose.
  //
  // Dirty on purpose: the stored rows really do change, so the form must offer to save it and
  // the unsaved-changes prompt must fire if the appraiser leaves.
  const confirmClearDeductions = () => {
    setValue('landAreaDeductions', [], { shouldDirty: true, shouldValidate: false });
    setValue('isEncroached', false, { shouldDirty: true, shouldValidate: false });
    setPendingClearCount(null);
  };

  return (
    <FieldLabels scope="land">
      <div className="w-full max-w-full">
        {/* No page heading here: the section header above this form already names it, so
          printing it again read as two copies of the same title. */}
        <FormSheet>
          <FormSection title={t('forms.land.groups.identification')} icon="circle-info">
            <FormFields fields={identity} />
          </FormSection>

          <FormSection title={t('forms.land.groups.ownership')} icon="scale-balanced">
            <FormFields fields={ownershipFields} />
          </FormSection>

          <FormSection title={t('forms.land.groups.location')} icon="map-location-dot">
            <FormFields fields={locationCheckFields} />
            <FormFields fields={addressFields} />
            <FormFields fields={dopaAddressFields} />
            <FormFields fields={officeAndCoordinates} />
            <FormFields fields={streetFields} />
          </FormSection>

          <FormSection title={t('forms.land.groups.areaZoning')} icon="city">
            <FormFields fields={areaZoningFields} />
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

          <FormSection
            title={t('landCharacteristicsForm.sections.limitation')}
            icon="triangle-exclamation"
          >
            <FormFields fields={limitationFieldsBeforeDeductions} />
            {hasAreaDeductions && <LandAreaDeductionTable />}
            <FormFields fields={limitationFieldsAfterDeductions} />
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

        {/* One row takes two clicks (ConfirmDeleteButton); wiping every row at once keeps this dialog. */}
        <ConfirmDialog
          isOpen={pendingClearCount !== null}
          onClose={() => setPendingClearCount(null)}
          onConfirm={confirmClearDeductions}
          title={t('landCharacteristicsForm.confirmClearDeductions.title')}
          message={t('landCharacteristicsForm.confirmClearDeductions.message', {
            count: pendingClearCount ?? 0,
          })}
          confirmText={t('common:actions.delete')}
          cancelText={t('common:actions.cancel')}
          variant="danger"
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
    ...expropriateField,
    ...encroachedField,
    ...electricityField,
    ...landBoundaryField,
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

const identityFields = pick('propertyName', 'landDescription');

// The deed's issuing office sits right under the DOPA address, with the coordinates (6 + 3 + 3).
const landOfficeFields = pick(['landOffice', 'col-span-6']);

const ownershipFields = pick(
  ['isOwnerVerifiedLand', 'col-span-4'],
  ['ownerNameLand', 'col-span-8'],
  'hasObligation',
  'obligationDetails',
  // After the obligation chips and their details, on a row of its own.
  ['isRentedOut', 'col-span-3'],
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

const locationCheckFields = pick(
  ['isLandLocationVerified', 'col-span-4'],
  ['landCheckMethodType', 'col-span-8'],
  'landCheckMethodTypeOther',
);

const streetFields = pick(
  ['village', 'col-span-6'],
  ['addressLocation', 'col-span-6'],
  ['street', 'col-span-4'],
  ['soi', 'col-span-4'],
  ['distanceFromMainRoad', 'col-span-4'],
);

const coordinateFields = pick(['latitude', 'col-span-3'], ['longitude', 'col-span-3']);

const areaZoningFields = pick(
  'landZoneType',
  'landZoneTypeOther',
  // Whether the plot sits in a licensed housing-estate project (new / old / not allocated).
  ['allocationType', 'col-span-6'],
  ['propertyAnticipationType', 'col-span-6'],
  'propertyAnticipationTypeOther',
  'urbanPlanningType',
  'landUseType',
  'landUseTypeOther',
  'plotLocationType',
  'plotLocationTypeOther',
);

// Access first (chips, full rows), then the road: road in front 6 + width 3 + lanes 3, surface,
// frontage 6 + sides 6.
const accessFields = pick(
  'landAccessibilityType',
  'landAccessibilityRemark',
  'transportationAccessType',
  'transportationAccessTypeOther',
  'landEntranceExitType',
  'landEntranceExitTypeOther',
  ['roadPassInFrontOfLand', 'col-span-6'],
  ['accessRoadWidth', 'col-span-3'],
  ['rightOfWay', 'col-span-3'],
  'roadSurfaceType',
  'roadSurfaceTypeOther',
  ['roadFrontage', 'col-span-6'],
  ['numberOfSidesFacingRoad', 'col-span-6'],
);

const utilityFields = pick('publicUtilityType', 'publicUtilityTypeOther');

const physicalFields = pick(
  // Chips: a row of their own in Standard, whatever span is given.
  ['landFillType', 'col-span-6'],
  'landFillTypeOther',
  // Fill share, soil level and shape make one row (3 + 3 + 6).
  ['landFillPercent', 'col-span-3'],
  ['soilLevel', 'col-span-3'],
  ['landShapeType', 'col-span-6'],
  'landShapeTypeOther',
  ['pondArea', 'col-span-3'],
  ['pondDepth', 'col-span-3'],
  ['hasBuilding', 'col-span-3'],
  'hasBuildingOther',
);

// Split either side of the deduction table: the table belongs directly under the toggle that
// governs it, and the old single remark is gone — every deduction row carries its own.
const limitationFieldsBeforeDeductions = pick(
  // The royal decree belongs to the expropriation line and stays top-right whichever toggle is on
  // (3 + 3 + 6); both remarks open under that row, so they never push the decree down.
  ['isExpropriated', 'col-span-3', 3],
  ['isInExpropriationLine', 'col-span-3', 3],
  ['royalDecree', 'col-span-6'],
  'expropriationRemark',
  'expropriationLineRemark',
  // Three toggles and a distance make one row (3 + 3 + 3 + 3); their remarks open under it.
  ['isLandlocked', 'col-span-3', 3],
  ['isForestBoundary', 'col-span-3', 3],
  // Named hasElectricity, but it records a plot lying far from the power line (the distance opens
  // only once it is ticked), which costs an extension — a limitation, not a utility.
  ['hasElectricity', 'col-span-3', 3],
  ['electricityDistance', 'col-span-3', 3],
  'landlockedRemark',
  'forestBoundaryRemark',
  // Right restriction (การรอนสิทธิ์), stored as evictionType: part of the plot given over to a
  // high-voltage line or an underground railway — a limitation like the expropriation line.
  ['evictionType', 'col-span-6'],
  'evictionTypeOther',
  // Area deductions follow the right restriction, their deduction table right under the toggle.
  'isEncroached',
);

const limitationFieldsAfterDeductions = pick('otherLegalLimitations');

export default LandDetailForm;
