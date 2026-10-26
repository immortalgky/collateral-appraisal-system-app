import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormFieldShell,
  FormFields,
  FormReadValue,
  FormSection,
  FormSheet,
  useFormReadOnly,
  type FormField,
} from '@/shared/components/form';
import Dropdown, { type ListBoxItem } from '@/shared/components/inputs/Dropdown';
import { useFireInsuranceOptions } from '@/shared/api/pricingParameters';
import { isCondo } from '../types';
import type { ProjectTower, ProjectType } from '../types';
import { FieldLabels } from '@/features/appraisal/components/FieldLabels';
import CondoAreaDetailForm from '@/features/appraisal/forms/CondoAreaDetailForm';
import { condoModelInfoFields, lbModelInfoFields } from '../configs/fields';
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
  /** The pricing action, at the right end of the "Model information" head. */
  pricingAction?: React.ReactNode;
  /** Land and Building: quiet text in that head, before the action (units, standard price). */
  facts?: React.ReactNode;
}

// ── TowerSelector ─────────────────────────────────────────────────────────────
// Condo models must belong to a tower. Uses Controller so the field stays
// registered even if it becomes hidden — guards against the RHF shouldUnregister
// drop-values issue documented in project memory feedback_rhf_should_unregister.md.

interface TowerSelectorProps {
  towers: ProjectTower[];
}

const TowerSelector = ({ towers }: TowerSelectorProps) => {
  const { t } = useTranslation('blockProject');
  const { control } = useFormContext();
  const options = useMemo<ListBoxItem[]>(
    () => towers.map(t => ({ value: t.id, label: t.towerName ?? t.id, id: t.id })),
    [towers],
  );
  const readOnly = useFormReadOnly();
  const tower = useWatch({ control, name: 'projectTowerId' });
  const towerLabel = t('modelDetail.fields.tower');
  if (readOnly)
    // A read page shows the tower's name, not a dropdown (DESIGN.md 17.3).
    return (
      <FormFieldShell name="projectTowerId" label={towerLabel} wrapperClassName="col-span-6" read>
        <FormReadValue
          field={{ type: 'dropdown', name: 'projectTowerId', label: towerLabel, options }}
          name="projectTowerId"
          value={tower}
          required
        />
      </FormFieldShell>
    );
  return (
    // data-field names this hand-built control the way FormFields do, so a form error scrolls to it.
    <div className="col-span-6" data-field="projectTowerId">
      <Controller
        control={control}
        name="projectTowerId"
        render={({ field, fieldState }) => (
          <>
            <Dropdown
              label={t('modelDetail.fields.tower')}
              required
              options={options}
              value={field.value ?? null}
              onChange={value => field.onChange(value ?? null)}
              error={fieldState.error?.message}
              showValuePrefix={false}
              placeholder={t('modelDetail.fields.selectTower')}
            />
            {towers.length === 0 && (
              <p className="mt-1 text-xs text-(--palette-gray-400)">
                {t('modelDetail.fields.noTowers')}
              </p>
            )}
          </>
        )}
      />
    </div>
  );
};

/** Groups sub-fields inside a FormSection. No fill: a grey panel behind a label + pills read as a
 *  box the other fields on the page do not have. */
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="col-span-12">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

/** Injects API-sourced fire-insurance condition options into the dropdown field
 *  config, which ships with an empty `options: []` placeholder. */
function withFireInsuranceOptions(fields: FormField[], options: ListBoxItem[]): FormField[] {
  // Narrow on `type` as well as `name`: spreading into a bare FormField union widens
  // `options` across every variant (boolean-toggle requires exactly [string, string]),
  // which breaks the discriminated union.
  return fields.map(f =>
    f.type === 'dropdown' && f.name === 'fireInsuranceCode' ? { ...f, options } : f,
  );
}

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
const ModelDetailForm = ({
  projectType,
  towers = [],
  pricingAction,
  facts,
}: ModelDetailFormProps) => {
  const { t } = useTranslation('blockProject');
  // Called unconditionally (both project types) to satisfy rules-of-hooks — only
  // the relevant one is used below depending on isCondo(projectType).
  const condoFireInsuranceOptions = useFireInsuranceOptions('Condo');
  const lbFireInsuranceOptions = useFireInsuranceOptions('LandAndBuilding');

  if (isCondo(projectType)) {
    // BV-specific fields (not part of property condo screen) stay together in
    // Model Information. Room Layout + Floor sections reuse the parameter-store
    // driven configs from the appraisal CondoDetailForm.
    const condoModelIdentityFields = withFireInsuranceOptions(
      condoModelInfoFields.filter(
        f => !['roomLayoutType', 'roomLayoutTypeOther', 'remark'].includes(f.name),
      ),
      condoFireInsuranceOptions,
    );
    const [modelNameField, ...condoModelRestFields] = condoModelIdentityFields;
    const condoRemarkFields = condoModelInfoFields.filter(f => f.name === 'remark');

    // The page shell above names the model, so there is no title.
    // Two scopes: the reused appraisal configs (room layout, floors) take the property editor's
    // wording, then the block-owned ones refine it, see FieldLabels.
    return (
      <FieldLabels scope="condo">
        <FieldLabels ns="blockProject" scope="model">
          <FormSheet>
            <FormSection
              title={t('modelDetail.sections.modelInformation')}
              icon="layer-group"
              actions={pricingAction}
            >
              <FormFields fields={modelNameField ? [modelNameField] : []} />
              <TowerSelector towers={towers} />
              <FormFields fields={condoModelRestFields} />
            </FormSection>

            <FormSection title={t('modelDetail.sections.roomLayout')} icon="grip-lines-vertical">
              <FormFields fields={condoRoomLayoutFormFields} />
            </FormSection>

            <FormSection title={t('modelDetail.sections.floor')} icon="layer-group">
              <Card>
                <FormFields fields={groundFloorFields} />
              </Card>
              <Card>
                <FormFields fields={upperFloorFields} />
              </Card>
              <Card>
                <FormFields fields={bathroomFloorFields} />
              </Card>
            </FormSection>

            <FormSection title={t('modelDetail.sections.areaDetail')} icon="chart-area">
              <CondoAreaDetailForm name="areaDetails" showTitle={false} />
            </FormSection>

            <FormSection title={t('modelDetail.sections.remark')} icon="comment">
              <FormFields fields={condoRemarkFields} />
            </FormSection>
          </FormSheet>
        </FieldLabels>
      </FieldLabels>
    );
  }

  // LandAndBuilding — sections + parameter-driven inputs are reused directly from
  // the appraisal Building form configs (BuildingDetailForm), so dropdowns and
  // checkbox groups read from the same parameter store the property screens use.
  // BV-specific sections (Model Information, Land Area, Floor Materials,
  // Construction Year, Area Detail, Depreciation) sit alongside.

  // Split lbModelInfoFields by intent so each section reads cleanly.
  const modelIdentityFields = withFireInsuranceOptions(
    lbModelInfoFields.filter(f =>
      [
        'modelName',
        'modelDescription',
        'numberOfHouse',
        'startingPriceMin',
        'startingPriceMax',
        'fireInsuranceCode',
        'usableAreaMin',
        'usableAreaMax',
        'standardUsableArea',
      ].includes(f.name),
    ),
    lbFireInsuranceOptions,
  );
  const landAreaFields = lbModelInfoFields.filter(f =>
    ['landAreaMin', 'landAreaMax', 'standardLandArea'].includes(f.name),
  );
  const remarkFields = lbModelInfoFields.filter(f => f.name === 'remark');

  return (
    <FieldLabels scope="building">
      <FieldLabels ns="blockProject" scope="model">
        <FormSheet>
          <FormSection
            title={t('modelDetail.sections.modelInformation')}
            icon="house"
            hint={facts}
            actions={pricingAction}
          >
            <FormFields fields={modelIdentityFields} />
          </FormSection>

          <FormSection title={t('modelDetail.sections.landArea')} icon="ruler-combined">
            <FormFields fields={landAreaFields} />
          </FormSection>

          <FormSection title={t('modelDetail.sections.buildingType')} icon="list">
            <FormFields fields={buildingTypeField} />
          </FormSection>

          <FormSection title={t('modelDetail.sections.decoration')} icon="paint-roller">
            <FormFields fields={decorationField} />
          </FormSection>

          <FormSection title={t('modelDetail.sections.encroachment')} icon="arrows-left-right">
            <FormFields fields={encroachmentField} />
          </FormSection>

          <FormSection title={t('modelDetail.sections.materialStyle')} icon="cubes">
            <Card>
              <FormFields fields={buildingMaterialField} />
            </Card>
            <Card>
              <FormFields fields={buildingStyleField} />
            </Card>
            <Card>
              <FormFields fields={constructionStyleField} />
            </Card>
          </FormSection>

          <FormSection title={t('modelDetail.sections.isResidential')} icon="house">
            <FormFields fields={isResidentialField} />
          </FormSection>

          <FormSection title={t('modelDetail.sections.generalStructure')} icon="warehouse">
            <FormFields fields={generalStructureField} />
          </FormSection>

          <FormSection title={t('modelDetail.sections.roofCeiling')} icon="house-chimney">
            <Card>
              <FormFields fields={roofFrameField} />
            </Card>
            <Card>
              <FormFields fields={roofField} />
            </Card>
            <Card>
              <FormFields fields={ceilingField} />
            </Card>
          </FormSection>

          <FormSection title={t('modelDetail.sections.wall')} icon="square">
            <Card>
              <FormFields fields={interiorWallFields} />
            </Card>
            <Card>
              <FormFields fields={exteriorWallFields} />
            </Card>
          </FormSection>

          <FormSection title={t('modelDetail.sections.surface')} icon="layer-group">
            <SurfaceTable name="surfaces" showTitle={false} />
          </FormSection>

          <FormSection title={t('modelDetail.sections.constructionUse')} icon="gears">
            <Card>
              <FormFields fields={fenceField} />
            </Card>
            <Card>
              <FormFields fields={constTypeFeild} />
            </Card>
            <Card>
              <FormFields fields={utilizationFeild} />
            </Card>
          </FormSection>

          <FormSection title={t('modelDetail.sections.depreciation')} icon="chart-line">
            <div className="col-span-12 min-w-0">
              <BuildingDetail name="depreciationDetails" />
            </div>
          </FormSection>

          <FormSection title={t('modelDetail.sections.remark')} icon="comment">
            <FormFields fields={remarkFields} />
          </FormSection>
        </FormSheet>
      </FieldLabels>
    </FieldLabels>
  );
};

export default ModelDetailForm;
