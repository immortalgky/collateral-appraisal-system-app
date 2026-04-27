import { FormFields } from '@/shared/components/form';
import type { ProjectType } from '../types';
import SectionRow from '../components/SectionRow';
import {
  pricingLocationSharedFields,
  pricingForceSaleFields,
  condoPricingLocationFields,
  condoPricingFloorFields,
  lbPricingLocationFields,
} from '../configs/fields';

interface PricingAssumptionFormProps {
  projectType: ProjectType;
}

/**
 * Merged pricing-assumption form for both Condo and LandAndBuilding.
 *
 * Shared sections: Location Method + Corner/Edge/Other, Force Sale Value.
 * Condo-only section: Pool View / South adjustments + Floor Increment.
 * LandAndBuilding-only section: Near Garden + Land Increase/Decrease Rate.
 */
const PricingAssumptionForm = ({ projectType }: PricingAssumptionFormProps) => (
  <div className="w-full max-w-full overflow-hidden">
    <div className="grid grid-cols-5 gap-x-6 gap-y-4">
      <SectionRow title="Location Assumptions" icon="location-dot">
        <FormFields fields={pricingLocationSharedFields} />
        {/* Type-specific location adjustments */}
        {projectType === 'Condo' && <FormFields fields={condoPricingLocationFields} />}
        {projectType === 'LandAndBuilding' && <FormFields fields={lbPricingLocationFields} />}
      </SectionRow>

      {/* Condo-only: floor increment pricing */}
      {projectType === 'Condo' && (
        <SectionRow title="Floor Assumptions" icon="stairs">
          <FormFields fields={condoPricingFloorFields} />
        </SectionRow>
      )}

      <SectionRow title="Force Sale Value" icon="percent" isLast>
        <FormFields fields={pricingForceSaleFields} />
        <div className="col-span-12">
          <p className="text-xs text-gray-400">Applied to calculated unit prices (0 – 100%)</p>
        </div>
      </SectionRow>
    </div>
  </div>
);

export default PricingAssumptionForm;
