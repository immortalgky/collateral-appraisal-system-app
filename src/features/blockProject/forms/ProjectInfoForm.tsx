import { FormFields } from '@/shared/components/form';
import type { ProjectType } from '../types';
import SectionRow from '../components/SectionRow';
import {
  projectInformationFields,
  projectLocationFields,
  projectDetailFields,
  condoProjectInfoFields,
  condoFacilityFields,
  lbProjectInfoFields,
  lbFacilityFields,
} from '../configs/fields';

interface ProjectInfoFormProps {
  projectType: ProjectType;
}

/**
 * Merged project-info form for both Condo and LandAndBuilding.
 *
 * - Condo: renders builtOnTitleDeedNumber + condo facilities.
 * - LandAndBuilding: renders licenseExpirationDate + LB facility fields.
 *
 * projectType is the discriminator (Condo | LandAndBuilding) stamped from the
 * route prop on submit — it is not a user-editable field and has no form input.
 */
const ProjectInfoForm = ({ projectType }: ProjectInfoFormProps) => {
  const typeSpecificInfoFields = projectType === 'Condo' ? condoProjectInfoFields : lbProjectInfoFields;
  const facilityFields = projectType === 'Condo' ? condoFacilityFields : lbFacilityFields;

  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Project Information</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title="Project Information" icon="building-columns">
          <FormFields fields={projectInformationFields} />
          {/* Type-specific: Condo adds builtOnTitleDeedNumber; LB adds licenseExpirationDate */}
          <FormFields fields={typeSpecificInfoFields} />
        </SectionRow>

        <SectionRow title="Project Location" icon="location-dot">
          <FormFields fields={projectLocationFields} />
        </SectionRow>

        <SectionRow title="Project Detail" icon="list-check" isLast>
          <FormFields fields={projectDetailFields} />
          {/* Facilities differ by type: Condo uses CONDO_FACILITY_OPTIONS; LB uses text-only fallback */}
          <FormFields fields={facilityFields} />
        </SectionRow>
      </div>
    </div>
  );
};

export default ProjectInfoForm;
