import { FormFields } from '@/shared/components/form';
import CheckboxGroup from '@/shared/components/inputs/CheckboxGroup';
import type { ProjectModel } from '../types';
import SectionRow from '../components/SectionRow';
import {
  condoTowerInfoFields,
  condoTowerConditionFields,
  condoTowerLocationFields,
  condoTowerStructureFields,
  condoTowerFloorFields,
  condoTowerRoofFields,
  condoTowerLegalFields,
} from '../configs/fields';
import { CONDO_ROOF_OPTIONS } from '../configs/fields';

// ─── ModelTypeSelector ────────────────────────────────────────────────────────
//
// modelTypeIds uses dynamic options from useGetProjectModels — options are NOT
// known at build time, so this field is intentionally outside configs/fields.ts
// and rendered here via CheckboxGroup.

interface ModelTypeSelectorProps {
  models: ProjectModel[];
}

const ModelTypeSelector = ({ models }: ModelTypeSelectorProps) => {
  if (models.length === 0) {
    return (
      <p className="col-span-12 text-sm text-gray-400">
        No models available. Add models first.
      </p>
    );
  }

  const options = models.map(m => ({
    value: m.id,
    label: m.modelName ?? m.id,
  }));

  return (
    <div className="col-span-12">
      <CheckboxGroup
        name="modelTypeIds"
        options={options}
        variant="tag"
        wrap
      />
    </div>
  );
};

// ─── RoofTypeSelector ─────────────────────────────────────────────────────────

const RoofTypeSelector = () => (
  <div className="col-span-12">
    <CheckboxGroup
      name="roofType"
      options={CONDO_ROOF_OPTIONS}
      variant="tag"
      wrap
    />
  </div>
);

// ─── TowerDetailForm ──────────────────────────────────────────────────────────

interface TowerDetailFormProps {
  /** Models loaded from useGetProjectModels — used to populate the ModelTypeSelector */
  models: ProjectModel[];
}

/**
 * Condo-only tower detail form.
 *
 * Condo tower detail form — unified in blockProject.
 */
const TowerDetailForm = ({ models }: TowerDetailFormProps) => (
  <div className="w-full max-w-full overflow-hidden">
    <h2 className="text-lg font-semibold text-gray-900 mb-6">Tower Detail</h2>
    <div className="grid grid-cols-5 gap-x-6 gap-y-4">
      <SectionRow title="Tower Information" icon="building">
        <FormFields fields={condoTowerInfoFields} />
      </SectionRow>

      <SectionRow title="Model Types" icon="layer-group">
        <ModelTypeSelector models={models} />
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

      <SectionRow title="Floor Materials" icon="layer-group">
        <FormFields fields={condoTowerFloorFields} />
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
