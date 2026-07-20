import { useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormFields, type FormField } from '@/shared/components/form';
import { isCondo } from '../types';
import type { ProjectType } from '../types';
import SectionRow from '../components/SectionRow';
import ProjectTypePill from '../components/ProjectTypePill';
import PartialDateInput from '../components/PartialDateInput';

import {
  condoProjectInfoFields,
  lbProjectInfoFields,
  projectDetailFields,
  projectInformationFields,
  projectLocationFields,
} from '../configs/fields';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';

interface ProjectInfoFormProps {
  projectType: ProjectType;
  pendingType: ProjectType | null;
  hasExistingProject: boolean;
  onProjectTypeChange: (newType: ProjectType | null) => void;
}

/**
 * Merged project-info form for both Condo and LandAndBuilding.
 *
 * - Condo: renders builtOnTitleDeedNumber + condo facilities.
 * - LandAndBuilding: renders licenseExpirationDate + LB facility fields.
 *
 * projectType is the discriminator (Condo | LandAndBuilding) stamped from the
 * route prop on submit — the pill at the top of Project Information surfaces
 * its current value and the change-type dialog.
 */
const ProjectInfoForm = ({
  projectType,
  pendingType,
  hasExistingProject,
  onProjectTypeChange,
}: ProjectInfoFormProps) => {
  const { t } = useTranslation('blockProject');
  const { control, watch, setValue } = useFormContext();
  const typeSpecificInfoFields = isCondo(projectType)
    ? condoProjectInfoFields
    : lbProjectInfoFields;

  // Two custom inputs sit inside `projectInformationFields` and need bespoke
  // rendering: ProjectType (dropdown that opens a confirmation dialog, placed
  // inline next to Project Name) and ProjectSaleLaunchDate (segmented partial-
  // date input). Slice the auto-rendered list around them while preserving order.
  const projectNameIdx = projectInformationFields.findIndex(f => f.name === 'projectName');
  const launchDateIdx = projectInformationFields.findIndex(f => f.name === 'projectSaleLaunchDate');

  const [pickerOpen, setPickerOpen] = useState(false);
  const lat = watch('latitude');
  const lon = watch('longitude');
  const parsedLat = lat !== undefined && lat !== '' ? Number(lat) : null;
  const parsedLon = lon !== undefined && lon !== '' ? Number(lon) : null;
  const initialLat = parsedLat != null && !Number.isNaN(parsedLat) ? parsedLat : null;
  const initialLon = parsedLon != null && !Number.isNaN(parsedLon) ? parsedLon : null;

  const projectNameField = useMemo(
    () =>
      projectNameIdx >= 0 ? projectInformationFields.slice(projectNameIdx, projectNameIdx + 1) : [],
    [projectNameIdx],
  );
  const beforeLaunchDate = useMemo(
    () =>
      projectInformationFields.slice(
        projectNameIdx >= 0 ? projectNameIdx + 1 : 0,
        launchDateIdx >= 0 ? launchDateIdx : undefined,
      ),
    [projectNameIdx, launchDateIdx],
  );
  const afterLaunchDate = useMemo(
    () => (launchDateIdx >= 0 ? projectInformationFields.slice(launchDateIdx + 1) : []),
    [launchDateIdx],
  );

  const pickerButton = useMemo(
    () => <MapPickerTriggerIcon onClick={() => setPickerOpen(true)} />,
    [],
  );

  const projectLocation = useMemo<FormField[]>(
    () =>
      projectLocationFields.map(field =>
        (field.name === 'latitude' || field.name === 'longitude') && field.type === 'number-input'
          ? { ...field, rightIcon: pickerButton }
          : field,
      ),
    [pickerButton],
  );

  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('projectInfo.title')}</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title={t('projectInfo.sections.projectInformation')} icon="building-columns">
          <FormFields fields={projectNameField} />
          <div className="col-span-4">
            <ProjectTypePill
              projectType={projectType}
              pendingType={pendingType}
              hasExistingProject={hasExistingProject}
              onPendingTypeChange={onProjectTypeChange}
            />
          </div>
          <FormFields fields={beforeLaunchDate} />
          <div className="col-span-6">
            <Controller
              control={control}
              name="projectSaleLaunchDate"
              render={({ field, fieldState }) => (
                <PartialDateInput
                  label={t('fields.projectInfo.projectSaleLaunchDate')}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>
          <FormFields fields={afterLaunchDate} />
          {/* Type-specific: Condo adds builtOnTitleDeedNumber; LB adds licenseExpirationDate */}
          <FormFields fields={typeSpecificInfoFields} />
        </SectionRow>

        <SectionRow title={t('projectInfo.sections.projectLocation')} icon="location-dot">
          <FormFields fields={projectLocation} />
        </SectionRow>

        <SectionRow title={t('projectInfo.sections.projectDetail')} icon="list-check" isLast>
          <FormFields fields={projectDetailFields} />
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
      </div>
    </div>
  );
};

export default ProjectInfoForm;
