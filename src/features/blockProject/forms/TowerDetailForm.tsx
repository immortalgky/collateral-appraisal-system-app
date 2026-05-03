import { FormFields } from '@/shared/components/form';
import CheckboxGroup from '@/shared/components/inputs/CheckboxGroup';
import { useParameterAsCheckboxOptions } from '@/shared/utils/parameterUtils';
import SectionRow from '../components/SectionRow';
import {
  condoTowerInfoFields,
  condoTowerConditionFields,
  condoTowerLocationFields,
  condoTowerStructureFields,
  condoTowerRoofFields,
  condoTowerLegalFields,
} from '../configs/fields';

// ─── RoofTypeSelector ─────────────────────────────────────────────────────────

const RoofTypeSelector = () => {
  const options = useParameterAsCheckboxOptions('Roof');
  return (
    <div className="col-span-12">
      <CheckboxGroup name="roofType" options={options} variant="tag" wrap />
    </div>
  );
};

// ─── TowerDetailForm ──────────────────────────────────────────────────────────

/**
 * Condo-only tower detail form.
 *
 * Condo tower detail form — unified in blockProject.
 */
const TowerDetailForm = () => (
  <div className="w-full max-w-full overflow-hidden">
    <h2 className="text-lg font-semibold text-gray-900 mb-6">Tower Detail</h2>
    <div className="grid grid-cols-5 gap-x-6 gap-y-4">
      <SectionRow title="Tower Information" icon="building">
        <FormFields fields={condoTowerInfoFields} />
      </SectionRow>

      <SectionRow title="Condominium Condition" icon="star">
        <FormFields fields={condoTowerConditionFields} />
      </SectionRow>

      <SectionRow title="Location" icon="map-location-dot">
        <FormFields fields={condoTowerLocationFields} />
      </SectionRow>

      <SectionRow title="Structure & Decoration" icon="building-columns">
        <FormFields fields={condoTowerStructureFields} />
      </SectionRow>

      <SectionRow title="Roof" icon="tent">
        <RoofTypeSelector />
        <FormFields fields={condoTowerRoofFields} />
      </SectionRow>

      <SectionRow title="Legal" icon="gavel" isLast>
        <FormFields fields={condoTowerLegalFields} />
      </SectionRow>
    </div>
  </div>
);

export default TowerDetailForm;
