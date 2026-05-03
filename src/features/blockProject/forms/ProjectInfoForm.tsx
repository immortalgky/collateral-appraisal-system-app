import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { FormFields } from '@/shared/components/form';
import type { ProjectType } from '../types';
import SectionRow from '../components/SectionRow';
import ProjectTypePill from '../components/ProjectTypePill';
import PartialDateInput from '../components/PartialDateInput';
import type { ChildCounts } from '../components/ChangeProjectTypeDialog';
import {
  condoProjectInfoFields,
  lbProjectInfoFields,
  projectDetailFields,
  projectInformationFields,
  projectLocationFields,
} from '../configs/fields';

interface ProjectInfoFormProps {
  projectType: ProjectType;
  appraisalId: string;
  basePath: string;
  hasExistingProject: boolean;
  childCounts: ChildCounts;
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
  appraisalId,
  basePath,
  hasExistingProject,
  childCounts,
}: ProjectInfoFormProps) => {
  const { control } = useFormContext();
  const typeSpecificInfoFields =
    projectType === 'Condo' ? condoProjectInfoFields : lbProjectInfoFields;

  // Two custom inputs sit inside `projectInformationFields` and need bespoke
  // rendering: ProjectType (dropdown that opens a confirmation dialog, placed
  // inline next to Project Name) and ProjectSaleLaunchDate (segmented partial-
  // date input). Slice the auto-rendered list around them while preserving order.
  const projectNameIdx = projectInformationFields.findIndex(f => f.name === 'projectName');
  const launchDateIdx = projectInformationFields.findIndex(
    f => f.name === 'projectSaleLaunchDate',
  );
  const projectNameField = useMemo(
    () => (projectNameIdx >= 0 ? projectInformationFields.slice(projectNameIdx, projectNameIdx + 1) : []),
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

  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Project Information</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title="Project Information" icon="building-columns">
          <FormFields fields={projectNameField} />
          <div className="col-span-4">
            <ProjectTypePill
              projectType={projectType}
              appraisalId={appraisalId}
              basePath={basePath}
              hasExistingProject={hasExistingProject}
              childCounts={childCounts}
            />
          </div>
          <FormFields fields={beforeLaunchDate} />
          <div className="col-span-4">
            <Controller
              control={control}
              name="projectSaleLaunchDate"
              render={({ field, fieldState }) => (
                <PartialDateInput
                  label="Project Sale Launch Date"
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

        <SectionRow title="Project Location" icon="location-dot">
          <FormFields fields={projectLocationFields} />
        </SectionRow>

        <SectionRow title="Project Detail" icon="list-check" isLast>
          <FormFields fields={projectDetailFields} />
        </SectionRow>
      </div>
    </div>
  );
};

export default ProjectInfoForm;
