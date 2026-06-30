import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import { type ReactNode, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import CondoAreaDetailForm from './CondoAreaDetailForm';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';
import {
  condoFields,
  condoLocationFields,
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
  const { setValue, watch } = useFormContext();
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

  const fillIcon = useMemo(() => <PropertyNameTriggerIcon propertyType="U" />, []);

  const fields = useMemo<FormField[]>(
    () =>
      condoFields.map(field => {
        if (field.name === 'propertyName' && fillIcon) return { ...field, rightIcon: fillIcon };
        if (
          (field.name === 'latitude' || field.name === 'longitude') &&
          field.type === 'number-input'
        )
          return { ...field, rightIcon: pickerButton };
        return field;
      }),
    [pickerButton, fillIcon],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <SectionRow title="Condominium Information" icon="building">
        {/* FormFields must remain a DIRECT child of the SectionRow grid so each
            field's wrapperClassName (col-span-3, col-span-6, etc.) resolves
            against the section's 12-col grid. The Latitude field's rightIcon
            opens the MapLocationPicker — no separate button needed. */}
        <FormFields fields={fields} />
      </SectionRow>

      <SectionRow title="Condominium Location" icon="map-location-dot">
        <FormFields fields={condoLocationFields} />
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
