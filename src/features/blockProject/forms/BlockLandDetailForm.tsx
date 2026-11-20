import { FormFields, FormSection, FormSheet } from '@/shared/components/form';
import { FieldLabels } from '@/features/appraisal/components/FieldLabels';
import BoundaryFields from '@/features/appraisal/components/BoundaryFields';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useTranslation } from 'react-i18next';
import {
  allocationField,
  anticipationProsperityField,
  electricityField,
  environmentFields,
  encroachedField,
  evictionField,
  expropriateField,
  landBoundaryField,
  landEntranceField,
  landFillField,
  landLocationField,
  landUseField,
  otherInformationField,
  plotLocationField,
  publicUtilityField,
  remarkLandField,
  roadField,
  roadSurfaceField,
  transpotationField,
} from '@/features/appraisal/configs/fields';
import UrbanPlanningColorField from '@/features/appraisal/components/UrbanPlanningColorField';
import { projectLandInfoFields } from '../configs/fields';

/**
 * Block-project copy of the appraisal `LandDetailForm`.
 *
 * The Land Information section uses a block-owned `projectLandInfoFields`
 * config (in `blockProject/configs/fields.ts`) — that section intentionally
 * drops latitude / longitude / land-office because they live on Project Info
 * at the project level. All other sections still re-use the appraisal configs
 * unchanged; copy them into `blockProject/configs/fields.ts` when they need
 * to diverge.
 */

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="col-span-12">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

// The planning type is part of the location fields; its colour cards follow it directly.
const planningAt = landLocationField.findIndex(f => f.name === 'urbanPlanningType') + 1;
const landLocationToPlanning = landLocationField.slice(0, planningAt);
const landLocationRest = landLocationField.slice(planningAt);

// "Has a building" is not asked any more; its fields stay in the schema so stored values round-trip.
// The rented-out switch has no field behind it on a block project land.
const HIDDEN = new Set(['hasBuilding', 'hasBuildingOther', 'isRentedOut']);
const projectOtherInformation = otherInformationField.filter(f => !HIDDEN.has(f.name));

// "Located in an expropriation map sheet" and its remark are no longer asked; the schema still carries them.
const NOT_ASKED = new Set(['isExpropriated', 'expropriationRemark']);
const projectExpropriateField = expropriateField.filter(f => !NOT_ASKED.has(f.name));

const BlockLandDetailForm = () => {
  const { t } = useTranslation('blockProject');
  const readOnly = usePageReadOnly();
  // Two scopes: the reused appraisal configs take the property editor's wording, then the
  // block-owned Land Information section refines it, see FieldLabels.
  return (
    <FieldLabels scope="land">
      <FieldLabels ns="blockProject" scope="projectLand">
        <FormSheet>
          <FormSection title={t('landDetail.sections.landInformation')} icon="circle-info">
            <FormFields fields={projectLandInfoFields} />
          </FormSection>

          <FormSection title={t('landDetail.sections.landLocation')} icon="map-location-dot">
            <FormFields fields={landLocationToPlanning} />
            <UrbanPlanningColorField />
            <FormFields fields={landLocationRest} />
            {/* The surroundings follow the land zone, as on the appraisal land form. */}
            <FormFields fields={environmentFields} />
          </FormSection>

          <FormSection title={t('landDetail.sections.plotLocation')} icon="location-dot">
            <FormFields fields={plotLocationField} />
          </FormSection>

          <FormSection title={t('landDetail.sections.landfill')} icon="mountain">
            <FormFields fields={landFillField} />
          </FormSection>

          <FormSection title={t('landDetail.sections.roadSurface')} icon="road">
            <Card>
              <FormFields fields={roadField} />
            </Card>
            <Card>
              <FormFields fields={roadSurfaceField} />
            </Card>
          </FormSection>

          <FormSection title={t('landDetail.sections.landAccessUtilities')} icon="bolt">
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
          </FormSection>

          <FormSection title={t('landDetail.sections.limitation')} icon="triangle-exclamation">
            <Card>
              <FormFields fields={projectExpropriateField} />
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
          </FormSection>

          <FormSection title={t('landDetail.sections.assessment')} icon="chart-line">
            <Card>
              <FormFields fields={anticipationProsperityField} />
            </Card>
            <Card>
              <FormFields fields={evictionField} />
            </Card>
            <Card>
              <FormFields fields={allocationField} />
            </Card>
          </FormSection>

          <FormSection title={t('landDetail.sections.sizeAndBoundary')} icon="ruler-combined">
            <BoundaryFields readOnly={readOnly} showTitle={false} />
          </FormSection>

          <FormSection title={t('landDetail.sections.otherInformation')} icon="circle-info">
            <FormFields fields={projectOtherInformation} />
          </FormSection>

          <FormSection title={t('landDetail.sections.remark')} icon="comment">
            <FormFields fields={remarkLandField} />
          </FormSection>
        </FormSheet>
      </FieldLabels>
    </FieldLabels>
  );
};

export default BlockLandDetailForm;
