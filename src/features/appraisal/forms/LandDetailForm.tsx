import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormFields, type FormField } from '@/shared/components/form';
import LandAreaDeductionTable from '../components/tables/LandAreaDeductionTable';
import Icon from '@/shared/components/Icon';
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
import FieldGroupLabel from './FieldGroupLabel';
import { PropertyNameTriggerIcon, type PropertyType } from '../components/PropertyNameTriggerIcon';
import { FieldLabels } from '../components/FieldLabels';

/** Section row component for form layout */
interface SectionRowProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  isLast?: boolean;
}
interface LandDetailFormProps {
  propertyType?: PropertyType;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="cas-section-head col-span-full xl:col-span-1 pt-1">
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
    {!isLast && (
      <div className="cas-section-rule h-px bg-gray-200 col-span-full xl:col-span-5 my-2" />
    )}
  </>
);

const LandDetailForm = ({ propertyType = 'L' }: LandDetailFormProps) => {
  // 'appraisal' stays the default namespace; 'common' is here for the shared action labels on the
  // deduction-clearing confirm, the same pairing FormTable uses for its own delete dialog.
  const { t } = useTranslation(['appraisal', 'common']);
  const readOnly = usePageReadOnly();
  const { watch, setValue, getValues } = useFormContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const lat = watch('latitude');
  const lon = watch('longitude');
  const parsedLat = lat !== undefined && lat !== '' ? Number(lat) : null;
  const parsedLon = lon !== undefined && lon !== '' ? Number(lon) : null;
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
  const coordinates = useMemo(() => decorate(coordinateFields), [decorate]);

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
      <div className="w-full max-w-full overflow-hidden">
        {/* No page heading here: the section header above this form already names it, so
          printing it again read as two copies of the same title. */}
        <div className="cas-section-grid cas-sheet grid grid-cols-1 xl:grid-cols-5 gap-x-6 gap-y-4">
          <SectionRow title={t('forms.land.groups.identification')} icon="circle-info">
            <FormFields fields={identity} />
          </SectionRow>

          <SectionRow title={t('forms.land.groups.ownership')} icon="scale-balanced">
            <FormFields fields={ownershipFields} />
          </SectionRow>

          <SectionRow title={t('forms.land.groups.location')} icon="map-location-dot">
            <FormFields fields={locationCheckFields} />
            <FieldGroupLabel label={t('fieldLabels.land.titleAddressGroup')} />
            <FormFields fields={landAddressFields} />
            <FieldGroupLabel label={t('fieldLabels.land.dopaAddressGroup')} />
            <FormFields fields={landDopaAddressFields} />
            <FormFields fields={landOfficeFields} />
            <FormFields fields={streetFields} />
            <FormFields fields={coordinates} />
          </SectionRow>

          <SectionRow title={t('forms.land.groups.areaZoning')} icon="city">
            <FormFields fields={areaZoningFields} />
          </SectionRow>

          <SectionRow title={t('forms.land.groups.access')} icon="road">
            <FormFields fields={accessFields} />
          </SectionRow>

          <SectionRow title={t('forms.land.groups.utilities')} icon="bolt">
            <FormFields fields={utilityFields} />
          </SectionRow>

          <SectionRow title={t('forms.land.groups.physical')} icon="mountain">
            <FormFields fields={physicalFields} />
            <BoundaryFields readOnly={readOnly} />
          </SectionRow>

          <SectionRow
            title={t('landCharacteristicsForm.sections.limitation')}
            icon="triangle-exclamation"
          >
            <FormFields fields={limitationFieldsBeforeDeductions} />
            {hasAreaDeductions && <LandAreaDeductionTable />}
            <FormFields fields={limitationFieldsAfterDeductions} />
          </SectionRow>

          <SectionRow title={t('landCharacteristicsForm.sections.remark')} icon="comment" isLast>
            <FormFields fields={remarkLandField} />
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

        {/* The same dialog the table uses to delete a single row: wiping every row at once
            should not be the less guarded of the two. */}
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
const byName = new Map(
  [
    ...landInfoField,
    ...landInfoFieldTail,
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
  ].map(field => [field.name, field]),
);

const pick = (...entries: (string | [name: string, span: string])[]): FormField[] =>
  entries.map(entry => {
    const [name, span] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`LandDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim() };
  });

const identityFields = pick('propertyName', 'landDescription');

// The deed's issuing office sits under the DOPA address, as on the condo form.
const landOfficeFields = pick('landOffice');

const ownershipFields = pick(
  ['isOwnerVerifiedLand', 'col-span-4'],
  ['ownerNameLand', 'col-span-8'],
  'hasObligation',
  'obligationDetails',
  'isRentedOut',
);

const locationCheckFields = pick(
  'isLandLocationVerified',
  'landCheckMethodType',
  'landCheckMethodTypeOther',
);

const streetFields = pick(
  ['village', 'col-span-6'],
  ['addressLocation', 'col-span-6'],
  'street',
  'soi',
  'distanceFromMainRoad',
);

const coordinateFields = pick('latitude', 'longitude');

const areaZoningFields = pick(
  'landZoneType',
  'landZoneTypeOther',
  'urbanPlanningType',
  'landUseType',
  'landUseTypeOther',
  // Whether the plot sits in a licensed housing-estate project (new / old / not allocated).
  'allocationType',
  'propertyAnticipationType',
  'propertyAnticipationTypeOther',
  'plotLocationType',
  'plotLocationTypeOther',
);

const accessFields = pick(
  'accessRoadWidth',
  'rightOfWay',
  'roadFrontage',
  'numberOfSidesFacingRoad',
  'roadPassInFrontOfLand',
  'landAccessibilityType',
  'landAccessibilityRemark',
  'roadSurfaceType',
  'roadSurfaceTypeOther',
  'landEntranceExitType',
  'landEntranceExitTypeOther',
  'transportationAccessType',
  'transportationAccessTypeOther',
);

const utilityFields = pick('publicUtilityType', 'publicUtilityTypeOther');

const physicalFields = pick(
  'landShapeType',
  'landShapeTypeOther',
  'landFillType',
  'landFillTypeOther',
  'landFillPercent',
  'soilLevel',
  'pondArea',
  'pondDepth',
  'hasBuilding',
  'hasBuildingOther',
);

// Split either side of the deduction table: the table belongs directly under the toggle that
// governs it, and the old single remark is gone — every deduction row carries its own.
const limitationFieldsBeforeDeductions = pick(
  'isExpropriated',
  'expropriationRemark',
  'isInExpropriationLine',
  'expropriationLineRemark',
  'royalDecree',
  'isLandlocked',
  'landlockedRemark',
  'isForestBoundary',
  'forestBoundaryRemark',
  // Named hasElectricity, but it records a plot lying far from the power line (the distance opens
  // only once it is ticked), which costs an extension — a limitation, not a utility.
  'hasElectricity',
  'electricityDistance',
  // Right restriction (การรอนสิทธิ์), stored as evictionType: part of the plot given over to a
  // high-voltage line or an underground railway — a limitation like the expropriation line.
  'evictionType',
  'evictionTypeOther',
  // Area deductions follow the right restriction, their deduction table right under the toggle.
  'isEncroached',
);

const limitationFieldsAfterDeductions = pick('otherLegalLimitations');

export default LandDetailForm;
