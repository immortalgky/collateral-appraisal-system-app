import { useFormContext, useWatch } from 'react-hook-form';
import { FormFields, FormSection, FormSheet } from '@/shared/components/form';
import { FieldLabels } from '@/features/appraisal/components/FieldLabels';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useTranslation } from 'react-i18next';
import { CondoDerivedHint } from '../components/condo';
import { useTowerModelFigures } from '../components/condo/towersModels/useTowerModelFigures';
import type { ProjectTower } from '../types';
import {
  condoTowerInfoFields,
  condoTowerConditionFields,
  condoTowerLocationFields,
  condoTowerStructureFields,
  condoTowerRoofFields,
  condoTowerLegalFields,
} from '../configs/fields';

// ─── RoofTypeSelector ─────────────────────────────────────────────────────────

// A field config, so a read page shows the chosen roofs only (the same as a property page).
const RoofTypeSelector = () => {
  const { t } = useTranslation('blockProject');
  return (
    <FormFields
      fields={[
        {
          type: 'checkbox-group',
          name: 'roofType',
          label: t('fieldLabels.tower.roofType'),
          group: 'Roof',
          wrapperClassName: 'col-span-12',
        },
      ]}
    />
  );
};

// ─── Units counted for this tower ─────────────────────────────────────────────

type SavedTower = Pick<ProjectTower, 'id' | 'towerName'>;

/**
 * What the unit list counts for this tower, and whether the entered number agrees. "Use this value"
 * only sets the form value (dirty); the field stays editable and nothing saves until Save. Nothing
 * for a tower that is not saved yet or while the list is empty, and no button on a read-only page.
 */
const UnitsHint = ({ savedTower }: { savedTower?: SavedTower }) => {
  const { control, setValue } = useFormContext();
  const isReadOnly = usePageReadOnly();
  const { hasUnits, unitsOfTower } = useTowerModelFigures();
  const entered = useWatch({ control, name: 'numberOfUnits' });
  if (!savedTower || !hasUnits) return null;
  const counted = unitsOfTower(savedTower).total;
  return (
    <CondoDerivedHint
      derived={counted}
      entered={typeof entered === 'number' ? entered : null}
      onUse={
        isReadOnly
          ? undefined
          : () => setValue('numberOfUnits', counted, { shouldDirty: true, shouldValidate: true })
      }
    />
  );
};

// ─── TowerDetailForm ──────────────────────────────────────────────────────────

interface TowerDetailFormProps {
  /** The tower as saved (absent while creating); the unit list is counted against it. */
  savedTower?: SavedTower;
}

/**
 * Condo-only tower detail form: the sections of one sheet.
 * The page shell above it names the tower, so there is no title here.
 */
const TowerDetailForm = ({ savedTower }: TowerDetailFormProps) => {
  const { t } = useTranslation('blockProject');
  return (
    <FieldLabels ns="blockProject" scope="tower">
      <FormSheet>
        <FormSection title={t('towerDetail.sections.towerInformation')} icon="building">
          <FormFields fields={condoTowerInfoFields} />
          <UnitsHint savedTower={savedTower} />
        </FormSection>

        <FormSection title={t('towerDetail.sections.condominiumCondition')} icon="star">
          <FormFields fields={condoTowerConditionFields} />
        </FormSection>

        <FormSection title={t('towerDetail.sections.location')} icon="map-location-dot">
          <FormFields fields={condoTowerLocationFields} />
        </FormSection>

        <FormSection title={t('towerDetail.sections.structureDecoration')} icon="building-columns">
          <FormFields fields={condoTowerStructureFields} />
        </FormSection>

        <FormSection title={t('towerDetail.sections.roof')} icon="tent">
          <RoofTypeSelector />
          <FormFields fields={condoTowerRoofFields} />
        </FormSection>

        <FormSection title={t('towerDetail.sections.legal')} icon="gavel">
          <FormFields fields={condoTowerLegalFields} />
        </FormSection>
      </FormSheet>
    </FieldLabels>
  );
};

export default TowerDetailForm;
