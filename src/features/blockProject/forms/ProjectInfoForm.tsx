import { useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  FormFields,
  FormFieldShell,
  FormReadValue,
  FormSection,
  FormSheet,
  useFormReadOnly,
  type FormField,
} from '@/shared/components/form';
import { FieldLabels } from '@/features/appraisal/components/FieldLabels';
import { hasStructures, isCondo } from '../types';
import type { ProjectType } from '../types';
import ProjectTypePill from '../components/ProjectTypePill';
import PartialDateInput from '../components/PartialDateInput';
import { partialDateText } from '../utils/partialDateText';
import { CondoUnitForSaleHint } from '../components/condo';

import {
  condoProjectCountFields,
  condoProjectInfoFields,
  lbProjectInfoFields,
  projectDetailFields,
  projectInformationFields,
  constructionProgressFields,
  projectLocationFields,
} from '../configs/fields';
import { useLocaleStore } from '@shared/store';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';

interface ProjectInfoFormProps {
  /** The project's effective type: the stored one, which BlockProjectPage resolves (L shares the LB route). */
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
 * projectType is the discriminator (U | LB | L), the stored type stamped on submit — the pill at
 * the top of Project Information surfaces its current value and the change-type dialog. Land (L)
 * hides the construction-progress pair.
 */
const ProjectInfoForm = ({
  projectType,
  pendingType,
  hasExistingProject,
  onProjectTypeChange,
}: ProjectInfoFormProps) => {
  const { t, i18n } = useTranslation('blockProject');
  const { control, watch, setValue } = useFormContext();
  const readOnly = useFormReadOnly();
  const language = useLocaleStore(s => s.language);
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
  const parsedLat = lat != null && lat !== '' ? Number(lat) : null;
  const parsedLon = lon != null && lon !== '' ? Number(lon) : null;
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

  const informationRows = (
    <>
      <FormFields fields={projectNameField} />
      {/* data-field names these two hand-built controls the way FormFields do. */}
      <div className="col-span-4" data-field="projectType">
        <ProjectTypePill
          projectType={projectType}
          pendingType={pendingType}
          hasExistingProject={hasExistingProject}
          onPendingTypeChange={onProjectTypeChange}
        />
      </div>
      <FormFields fields={beforeLaunchDate} />
      {readOnly ? (
        // A read page shows the date as text, not three disabled dropdowns (DESIGN.md 17.3).
        <FormFieldShell
          name="projectSaleLaunchDate"
          label={t('fields.projectInfo.projectSaleLaunchDate')}
          wrapperClassName="col-span-12"
          read
        >
          <FormReadValue
            field={{ type: 'text-input', name: 'projectSaleLaunchDate', label: '' }}
            name="projectSaleLaunchDate"
            value={partialDateText(watch('projectSaleLaunchDate'), language, i18n.language)}
            required={false}
          />
        </FormFieldShell>
      ) : (
        <div className="col-span-12" data-field="projectSaleLaunchDate">
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
      )}
      <FormFields fields={afterLaunchDate} />
      {/* Type-specific sits directly under the land area: Condo's Title Number describes the
          deeds that land is registered on, LB's license date belongs with it too. */}
      <FormFields fields={typeSpecificInfoFields} />
      <FormFields fields={condoProjectCountFields} />
      <CondoUnitForSaleHint />
      {/* Last row of the section — see constructionProgressFields for the layout rationale.
          Hidden for bare Land: a subdivision of empty plots has nothing under construction,
          and the aggregate discards both fields for that type, so showing them would let an
          appraiser tick a box that silently does nothing on save.

          Unmounting leaves the values in form state (RHF keeps them, shouldUnregister is
          false) and they are still posted — which is harmless here, because a Land project
          can only ever hold nulls: Project.Create and Project.Update both drop the pair for a
          type without structures, and the columns are new enough that no stored row predates
          that rule. So what gets posted for Land is null, which the aggregate ignores. */}
      {hasStructures(projectType) && <FormFields fields={constructionProgressFields} />}
    </>
  );
  const locationRows = <FormFields fields={projectLocation} />;
  const detailRows = <FormFields fields={projectDetailFields} />;
  const mapPicker = (
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
  );

  // The shell above names the project, and each FormSection carries its own title: no page title.
  return (
    <FieldLabels ns="blockProject" scope="projectInfo">
      <FormSheet>
        <FormSection title={t('projectInfo.sections.projectInformation')} icon="building-columns">
          {informationRows}
        </FormSection>
        <FormSection title={t('projectInfo.sections.projectLocation')} icon="location-dot">
          {locationRows}
        </FormSection>
        <FormSection title={t('projectInfo.sections.projectDetail')} icon="list-check">
          {detailRows}
        </FormSection>
      </FormSheet>
      {mapPicker}
    </FieldLabels>
  );
};

export default ProjectInfoForm;
