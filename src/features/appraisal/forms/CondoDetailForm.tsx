import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import CondoAreaDetailForm from './CondoAreaDetailForm';
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

// SectionRow component for consistent section styling with icons
interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
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
    {!isLast && <div className="h-px bg-gray-200 col-span-full xl:col-span-5" />}
  </>
);

const Card = ({ children }: { children: ReactNode }) => (
  <div className="col-span-12">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

function CondoDetailForm() {
  const { t } = useTranslation('appraisal');
  const { setValue, watch } = useFormContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const lat = watch('latitude');
  const lon = watch('longitude');
  const govPricePerSqm = watch('governmentPricePerSqm');
  const usableArea = watch('usableArea');
  const parsedLat = lat !== undefined && lat !== '' ? Number(lat) : null;
  const parsedLon = lon !== undefined && lon !== '' ? Number(lon) : null;
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

  const fields = useMemo<FormField[]>(
    () =>
      condoFields.map(field => {
        if (field.name === 'propertyName' && fillIcon) return { ...field, rightIcon: fillIcon };
        return field;
      }),
    [fillIcon],
  );

  const tailFields = useMemo<FormField[]>(
    () =>
      condoFieldsTail.map(field => {
        if (
          (field.name === 'latitude' || field.name === 'longitude') &&
          field.type === 'number-input'
        )
          return { ...field, rightIcon: pickerButton };
        return field;
      }),
    [pickerButton],
  );

  // Building Insurance: buildingInsurancePrice is SERVER-DERIVED (rate × usableArea) —
  // unlike Government Price above, there is no client-side computation here. The field
  // is disabled/display-only, populated from whatever the GET response returns; the
  // save mutation invalidates the condo property query so the freshly-derived value
  // comes back after save.
  const fireInsuranceOptions = useFireInsuranceOptions('Condo');
  const buildingInsuranceFields = useMemo<FormField[]>(
    () =>
      condoBuildingInsuranceFields.map(field => {
        // Narrow on `type` as well as `name`: spreading into a bare FormField union
        // widens `options` across every variant (boolean-toggle requires exactly
        // [string, string]), which breaks the discriminated union.
        if (field.type === 'dropdown' && field.name === 'fireInsuranceCondition')
          return {
            ...field,
            label: t('forms.condo.fireInsuranceCondition'),
            options: fireInsuranceOptions,
          };
        if (field.name === 'buildingInsurancePrice')
          return { ...field, label: t('forms.condo.buildingInsurancePrice') };
        return field;
      }),
    [fireInsuranceOptions, t],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <SectionRow title="Condominium Information" icon="building">
        {/* FormFields must remain a DIRECT child of the SectionRow grid so each
            field's wrapperClassName (col-span-3, col-span-6, etc.) resolves
            against the section's 12-col grid. The Latitude field's rightIcon
            opens the MapLocationPicker — no separate button needed. */}
        <FormFields fields={fields} />
        <FieldGroupLabel label="Address" />
        <FormFields fields={condoAddressFields} />
        <FieldGroupLabel label="Dopa Address" />
        <FormFields fields={condoDopaAddressFields} />
        <FormFields fields={tailFields} />
      </SectionRow>

      <SectionRow title="Condominium Location" icon="map-location-dot">
        <FormFields fields={condoLocationFields} />
        <FormFields fields={condoLandCharacteristicsFields} />
      </SectionRow>

      <SectionRow title="Government Price" icon="money-bill">
        <FormFields fields={condoGovernmentPriceFields} />
      </SectionRow>

      <SectionRow title={t('forms.condo.buildingInsuranceSectionTitle')} icon="shield-halved">
        <FormFields fields={buildingInsuranceFields} />
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

      <SectionRow title="Decoration & Structure" icon="paint-roller">
        <Card>
          <FormFields fields={condoDecorationFields} />
        </Card>
        <Card>
          <FormFields fields={ageHeightCondoFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Building Design" icon="building-columns">
        <Card>
          <FormFields fields={buildingFormFields} />
        </Card>
        <Card>
          <FormFields fields={constructionMaterialsFormFields} />
        </Card>
        <Card>
          <FormFields fields={condoRoomLayoutFormFields} />
        </Card>
        <Card>
          <FormFields fields={locationViewFormFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Floor" icon="layer-group">
        <Card>
          <FormFields fields={groundFloorFields} />
        </Card>
        <Card>
          <FormFields fields={upperFloorFields} />
        </Card>
        <Card>
          <FormFields fields={bathroomFloorFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Roof" icon="tent">
        <FormFields fields={roofFormFields} />
      </SectionRow>

      <SectionRow title="Area Details" icon="chart-area">
        <div className="col-span-12">
          <CondoAreaDetailForm name={'areaDetails'} />
        </div>
      </SectionRow>

      <SectionRow title="Expropriation" icon="file-invoice">
        <Card>
          <FormFields fields={expropriationFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Facilities & Environment" icon="dumbbell">
        <Card>
          <FormFields fields={condoFacilityFields} />
        </Card>
        <Card>
          <FormFields fields={environmentFields} />
        </Card>
      </SectionRow>

      <SectionRow title="In Forest Boundary" icon="tree-city">
        <Card>
          <FormFields fields={inForestBoundaryFormFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Remarks" icon="comment" isLast>
        <FormFields fields={remarkFormFields} />
      </SectionRow>
    </div>
  );
}

export default CondoDetailForm;
