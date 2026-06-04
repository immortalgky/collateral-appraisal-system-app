import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
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
  landBoundaryField,
  landEntranceField,
  landFillField,
  landInfoField,
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

/** Section row component for form layout */
interface SectionRowProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
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
    {!isLast && <div className="h-px bg-gray-200 col-span-full xl:col-span-5 my-2" />}
  </>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="col-span-12">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

const LandDetailForm = () => {
  const { t } = useTranslation('appraisal');
  const readOnly = usePageReadOnly();
  const { watch, setValue } = useFormContext();
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

  // Inject the map-picker trigger onto the lat/lon inputs (hidden in read-only mode).
  const landFields = useMemo<FormField[]>(
    () =>
      landInfoField.map(field =>
        !readOnly &&
        (field.name === 'latitude' || field.name === 'longitude') &&
        field.type === 'number-input'
          ? { ...field, rightIcon: pickerButton }
          : field,
      ),
    [pickerButton, readOnly],
  );

  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('forms.land.pageTitle')}</h2>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title={t('forms.land.sectionTitleInfo')} icon="info-circle">
          <FormFields fields={landFields} />
        </SectionRow>

        <SectionRow title={t('forms.land.sectionTitleLocation')} icon="map-location-dot">
          <FormFields fields={landLocationField} />
        </SectionRow>

        <SectionRow title={t('forms.land.sectionTitlePlot')} icon="location-dot">
          <FormFields fields={plotLocationField} />
        </SectionRow>

        <SectionRow title={t('landCharacteristicsForm.sections.landfill')} icon="mountain">
          <FormFields fields={landFillField} />
        </SectionRow>

        <SectionRow title={t('forms.land.sectionTitleRoadSurface')} icon="road">
          <Card>
            <FormFields fields={roadField} />
          </Card>
          <Card>
            <FormFields fields={roadSurfaceField} />
          </Card>
        </SectionRow>

        <SectionRow title={t('forms.land.sectionTitleLandAccessUtilities')} icon="bolt">
          <Card>
            <FormFields fields={publicUtilityField} />
          </Card>
          <Card>
            <FormFields fields={landUseField} />
          </Card>
          <Card>
            <FormFields fields={landEntranceField} />
          </Card>
          <Card>
            <FormFields fields={transpotationField} />
          </Card>
        </SectionRow>

        <SectionRow title={t('landCharacteristicsForm.sections.limitation')} icon="triangle-exclamation">
          <Card>
            <FormFields fields={expropriateField} />
          </Card>
          <Card>
            <FormFields fields={encroachedField} />
          </Card>
          <Card>
            <FormFields fields={electricityField} />
          </Card>
          <Card>
            <FormFields fields={landBoundaryField} />
          </Card>
        </SectionRow>

        <SectionRow title={t('forms.land.sectionTitleAssessment')} icon="chart-line">
          <Card>
            <FormFields fields={anticipationProsperityField} />
          </Card>
          <Card>
            <FormFields fields={evictionField} />
          </Card>
          <Card>
            <FormFields fields={allocationField} />
          </Card>
        </SectionRow>

        <SectionRow title={t('forms.land.sectionTitleBoundary')} icon="ruler-combined">
          <BoundaryFields readOnly={readOnly} />
        </SectionRow>

        <SectionRow title={t('forms.land.sectionTitleOtherInfo')} icon="circle-info">
          <FormFields fields={otherInformationField} />
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
    </div>
  );
};

export default LandDetailForm;
