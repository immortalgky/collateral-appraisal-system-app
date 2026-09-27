import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
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
import FieldGroupLabel from './FieldGroupLabel';
import { FieldLabels } from '../components/FieldLabels';

// SectionRow component for consistent section styling with icons
interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isLast?: boolean;
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
    {!isLast && <div className="cas-section-rule h-px bg-gray-200 col-span-full xl:col-span-5" />}
  </>
);

function CondoDetailForm() {
  const { t } = useTranslation('appraisal');
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
        if (
          (field.name === 'latitude' || field.name === 'longitude') &&
          field.type === 'number-input'
        )
          return { ...field, rightIcon: pickerButton };
        return field;
      }),
    [fillIcon, pickerButton],
  );
  const identity = useMemo(() => withIcons(identityFields), [withIcons]);
  const coordinates = useMemo(() => withIcons(coordinateFields), [withIcons]);
  const usableAreaFields = useMemo(() => withIcons(pick('usableArea')), [withIcons]);

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
              label: t('forms.condo.fireInsuranceCode'),
              options: fireInsuranceOptions,
            };
          return field;
        }),
    [fireInsuranceOptions, t],
  );

  // FormFields must remain a DIRECT child of each SectionRow grid so every field's
  // wrapperClassName (col-span-3, col-span-6, etc.) resolves against the section's 12-col grid.
  return (
    <FieldLabels scope="condo">
      <div className="cas-condo-form cas-section-grid cas-sheet grid grid-cols-1 xl:grid-cols-5 gap-6">
        <SectionRow title={t('forms.condo.groups.identification')} icon="building">
          <FormFields fields={identity} />
        </SectionRow>

        <SectionRow title={t('forms.condo.groups.ownership')} icon="scale-balanced">
          <FormFields fields={legalFields} />
        </SectionRow>

        <SectionRow title={t('forms.condo.groups.location')} icon="map-location-dot">
          <FieldGroupLabel label={t('fieldLabels.condo.titleAddressGroup')} />
          <FormFields fields={condoAddressFields} />
          <FieldGroupLabel label={t('fieldLabels.condo.dopaAddressGroup')} />
          <FormFields fields={condoDopaAddressFields} />
          <FormFields fields={landOfficeFields} />
          {/* The Latitude field's rightIcon opens the MapLocationPicker. */}
          <FormFields fields={coordinates} />
          <FormFields fields={roadFields} />
        </SectionRow>

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

        <SectionRow title={t('forms.condo.groups.surroundings')} icon="tree-city">
          <FormFields fields={surroundingFields} />
        </SectionRow>

        <SectionRow title={t('forms.condo.groups.building')} icon="building-columns">
          <FormFields fields={buildingFields} />
        </SectionRow>

        <SectionRow title={t('forms.condo.groups.unit')} icon="door-open">
          {/* The area table sits right under the usable area it is checked against. */}
          <FormFields fields={usableAreaFields} />
          <div className="col-span-12">
            <CondoAreaDetailForm name={'areaDetails'} />
          </div>
          <FormFields fields={unitFields} />
        </SectionRow>

        <SectionRow title={t('forms.condo.groups.referencePrices')} icon="money-bill">
          <FormFields fields={condoGovernmentPriceFields} />
          <FormFields fields={buildingInsuranceFields} />
          <CondoInsuranceSummary />
        </SectionRow>

        <SectionRow
          title={t('landCharacteristicsForm.sections.limitation')}
          icon="triangle-exclamation"
        >
          <FormFields fields={expropriationFields} />
          <FormFields fields={inForestBoundaryFormFields} />
        </SectionRow>

        <SectionRow title={t('forms.condo.groups.remark')} icon="comment" isLast>
          <FormFields fields={remarkFormFields} />
        </SectionRow>
      </div>
    </FieldLabels>
  );
}

/*
 * The screen's field order: identification, ownership, where it is, what surrounds it, the
 * building, then the unit being appraised. The configs in configs/fields.ts stay as they are and
 * are picked by name here; a span given here replaces the config's own col-span for this screen.
 */
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
  ].map(field => [field.name, field]),
);

const pick = (...entries: (string | [name: string, span: string])[]): FormField[] =>
  entries.map(entry => {
    const [name, span] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`CondoDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim() };
  });

const identityFields = pick(
  'propertyName',
  'condoName',
  ['roomNumber', 'col-span-6'],
  ['floorNumber', 'col-span-6'],
  ['buildingNumber', 'col-span-6'],
  ['condoRegistrationNumber', 'col-span-6'],
  ['modelName', 'col-span-12'],
  'titleNumber',
);

const legalFields = pick(
  // The owner's name sits on its own line under the check, as on the land form.
  'isOwnerVerified',
  'ownerName',
  'hasObligation',
  'obligationDetails',
  ['documentValidationResultType', 'col-span-12'],
);

const landOfficeFields = pick('landOffice');

const coordinateFields = pick('latitude', 'longitude');

const roadFields = pick(
  'locationType',
  'street',
  'soi',
  ['distanceFromMainRoad', 'col-span-6'],
  ['accessRoadWidth', 'col-span-3'],
  ['rightOfWay', 'col-span-3'],
  'roadSurfaceType',
  'roadSurfaceTypeOther',
);

const surroundingFields = pick(
  'publicUtilityType',
  'publicUtilityTypeOther',
  'landEntranceExitType',
  'landEntranceExitTypeOther',
  'urbanPlanningType',
  'landFillType',
  'landFillTypeOther',
  'landUseType',
  'landUseTypeOther',
  'environmentType',
  'environmentTypeOther',
);

const buildingFields = pick(
  // One full row each.
  ['buildingAge', 'col-span-12'],
  ['numberOfFloors', 'col-span-12'],
  ['isUnderConstruction', 'col-span-12'],
  'buildingConditionType',
  'buildingConditionTypeOther',
  'buildingFormType',
  'constructionMaterialType',
  'roofType',
  'roofTypeOther',
  'facilityType',
  'facilityTypeOther',
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
