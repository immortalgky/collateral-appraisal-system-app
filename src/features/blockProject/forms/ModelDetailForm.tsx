import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { FormFields } from '@/shared/components/form';
import Dropdown, { type ListBoxItem } from '@/shared/components/inputs/Dropdown';
import type { ProjectTower, ProjectType } from '../types';
import SectionRow from '../components/SectionRow';
import CondoAreaDetailForm from '@/features/appraisal/forms/CondoAreaDetailForm';
import { condoModelInfoFields, lbModelBuildingDetailFields, lbModelInfoFields, } from '../configs/fields';
import {
  bathroomFloorFields,
  buildingMaterialField,
  buildingStyleField,
  buildingTypeField,
  ceilingField,
  condoRoomLayoutFormFields,
  constructionStyleField,
  constTypeFeild,
  decorationField,
  encroachmentField,
  exteriorWallFields,
  fenceField,
  generalStructureField,
  groundFloorFields,
  interiorWallFields,
  isResidentialField,
  roofField,
  roofFrameField,
  upperFloorFields,
  utilizationFeild,
} from '@/features/appraisal/configs/fields';
import SurfaceTable from '@/features/appraisal/components/tables/SurfaceTable';
import { BuildingDetail } from '@/features/appraisal/components/tables/BuildingDetail';

interface ModelDetailFormProps {
  projectType: ProjectType;
  /** Condo only: list of towers for the projectTowerId selector. */
  towers?: ProjectTower[];
}

// ── TowerSelector ─────────────────────────────────────────────────────────────
// Condo models must belong to a tower. Uses Controller so the field stays
// registered even if it becomes hidden — guards against the RHF shouldUnregister
// drop-values issue documented in project memory feedback_rhf_should_unregister.md.

interface TowerSelectorProps {
  towers: ProjectTower[];
}

const TowerSelector = ({ towers }: TowerSelectorProps) => {
  const { control } = useFormContext();
  const options = useMemo<ListBoxItem[]>(
    () => towers.map(t => ({ value: t.id, label: t.towerName ?? t.id, id: t.id })),
    [towers],
  );
  return (
    <div className="col-span-6">
      <Controller
        control={control}
        name="projectTowerId"
        render={({ field, fieldState }) => (
          <>
            <Dropdown
              label="Tower"
              required
              options={options}
              value={field.value ?? null}
              onChange={value => field.onChange(value ?? null)}
              error={fieldState.error?.message}
              showValuePrefix={false}
              placeholder="Select tower..."
            />
            {towers.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">No towers yet — add a tower first.</p>
            )}
          </>
        )}
      />
    </div>
  );
};

/** Gray-50 card wrapper used to group sub-fields inside a SectionRow.
 *  Mirrors the appraisal BuildingDetailForm Card pattern. */
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="col-span-12 bg-gray-50 rounded-lg p-3">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Merged model-detail form for both Condo and LandAndBuilding.
 *
 * Condo sections: Model Information (condo fields), Floor Materials, Area Detail.
 * LandAndBuilding sections: Model Information (LB fields), Floor Materials, Land Area,
 *   Building Detail, Structure & Materials, Floor Surfaces, Area Detail, Depreciation.
 *
 * projectType cannot change after creation so we don't need hidden inputs for
 * inapplicable fields (no runtime toggle).
 */
const ModelDetailForm = ({ projectType, towers = [] }: ModelDetailFormProps) => {
  if (projectType === 'Condo') {
    // BV-specific fields (not part of property condo screen) stay together in
    // Model Information. Room Layout + Floor sections reuse the parameter-store
    // driven configs from the appraisal CondoDetailForm.
    const condoModelIdentityFields = condoModelInfoFields.filter(
      f => !['roomLayoutType', 'roomLayoutTypeOther', 'remark'].includes(f.name),
    );
    const [modelNameField, ...condoModelRestFields] = condoModelIdentityFields;
    const condoRemarkFields = condoModelInfoFields.filter(f => f.name === 'remark');

    return (
      <div className="w-full max-w-full overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Model Detail</h2>
        <div className="grid grid-cols-5 gap-x-6 gap-y-4">
          <SectionRow title="Model Information" icon="layer-group">
            <FormFields fields={modelNameField ? [modelNameField] : []} />
            <TowerSelector towers={towers} />
            <FormFields fields={condoModelRestFields} />
          </SectionRow>

          <SectionRow title="Room Layout" icon="grip-lines-vertical">
            <FormFields fields={condoRoomLayoutFormFields} />
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

          <SectionRow title="Area Detail" icon="chart-area">
            <CondoAreaDetailForm name="areaDetails" />
          </SectionRow>

          <SectionRow title="Remark" icon="comment" isLast>
            <FormFields fields={condoRemarkFields} />
          </SectionRow>
        </div>
      </div>
    );
  }

  // LandAndBuilding — sections + parameter-driven inputs are reused directly from
  // the appraisal Building form configs (BuildingDetailForm), so dropdowns and
  // checkbox groups read from the same parameter store the property screens use.
  // BV-specific sections (Model Information, Land Area, Floor Materials,
  // Construction Year, Area Detail, Depreciation) sit alongside.

  // Split lbModelInfoFields by intent so each section reads cleanly.
  const modelIdentityFields = lbModelInfoFields.filter(f =>
    [
      'modelName',
      'modelDescription',
      'numberOfHouse',
      'startingPriceMin',
      'startingPriceMax',
      'fireInsuranceCondition',
      'usableAreaMin',
      'usableAreaMax',
      'standardUsableArea',
    ].includes(f.name),
  );
  const landAreaFields = lbModelInfoFields.filter(f =>
    ['landAreaMin', 'landAreaMax', 'standardLandArea'].includes(f.name),
  );
  const remarkFields = lbModelInfoFields.filter(f => f.name === 'remark');

  // BV-only: constructionYear has no appraisal counterpart.
  const constructionYearFields = lbModelBuildingDetailFields.filter(
    f => f.name === 'constructionYear',
  );

  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Model Detail</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title="Model Information" icon="layer-group">
          <FormFields fields={modelIdentityFields} />
        </SectionRow>

        <SectionRow title="Land Area" icon="ruler-combined">
          <FormFields fields={landAreaFields} />
        </SectionRow>

        <SectionRow title="Building Type" icon="list">
          <FormFields fields={buildingTypeField} />
        </SectionRow>

        <SectionRow title="Decoration" icon="paint-roller">
          <FormFields fields={decorationField} />
        </SectionRow>

        <SectionRow title="Encroachment" icon="arrows-left-right">
          <FormFields fields={encroachmentField} />
        </SectionRow>

        <SectionRow title="Material & Style" icon="cubes">
          <Card>
            <FormFields fields={buildingMaterialField} />
          </Card>
          <Card>
            <FormFields fields={buildingStyleField} />
          </Card>
          <Card>
            <FormFields fields={constructionStyleField} />
          </Card>
        </SectionRow>

        <SectionRow title="Is Residential" icon="house">
          <FormFields fields={isResidentialField} />
          <FormFields fields={constructionYearFields} />
        </SectionRow>

        <SectionRow title="General Structure" icon="warehouse">
          <FormFields fields={generalStructureField} />
        </SectionRow>

        <SectionRow title="Roof & Ceiling" icon="house-chimney">
          <Card>
            <FormFields fields={roofFrameField} />
          </Card>
          <Card>
            <FormFields fields={roofField} />
          </Card>
          <Card>
            <FormFields fields={ceilingField} />
          </Card>
        </SectionRow>

        <SectionRow title="Wall" icon="square">
          <Card>
            <FormFields fields={interiorWallFields} />
          </Card>
          <Card>
            <FormFields fields={exteriorWallFields} />
          </Card>
        </SectionRow>

        <SectionRow title="Surface" icon="layer-group">
          <SurfaceTable name="surfaces" />
        </SectionRow>

        <SectionRow title="Construction & Use" icon="gears">
          <Card>
            <FormFields fields={fenceField} />
          </Card>
          <Card>
            <FormFields fields={constTypeFeild} />
          </Card>
          <Card>
            <FormFields fields={utilizationFeild} />
          </Card>
        </SectionRow>

        <SectionRow title="Depreciation" icon="chart-line">
          <div className="col-span-12">
            <BuildingDetail name="depreciationDetails" />
          </div>
        </SectionRow>

        <SectionRow title="Remark" icon="comment" isLast>
          <FormFields fields={remarkFields} />
        </SectionRow>
      </div>
    </div>
  );
};

export default ModelDetailForm;
