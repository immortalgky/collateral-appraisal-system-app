import { FormFields } from '@/shared/components/form';
import CheckboxGroup from '@/shared/components/inputs/CheckboxGroup';
import { useParameterAsCheckboxOptions } from '@/shared/utils/parameterUtils';
import { useTranslation } from 'react-i18next';
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
const TowerDetailForm = () => {
  const { t } = useTranslation('blockProject');
  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('towerDetail.title')}</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title={t('towerDetail.sections.towerInformation')} icon="building">
          <FormFields fields={condoTowerInfoFields} />
        </SectionRow>

        <SectionRow title={t('towerDetail.sections.condominiumCondition')} icon="star">
          <FormFields fields={condoTowerConditionFields} />
        </SectionRow>

        <SectionRow title={t('towerDetail.sections.location')} icon="map-location-dot">
          <FormFields fields={condoTowerLocationFields} />
        </SectionRow>

        <SectionRow title={t('towerDetail.sections.structureDecoration')} icon="building-columns">
          <FormFields fields={condoTowerStructureFields} />
        </SectionRow>

        <SectionRow title={t('towerDetail.sections.roof')} icon="tent">
          <RoofTypeSelector />
          <FormFields fields={condoTowerRoofFields} />
        </SectionRow>

        <SectionRow title={t('towerDetail.sections.legal')} icon="gavel" isLast>
          <FormFields fields={condoTowerLegalFields} />
        </SectionRow>
      </div>
    </div>
  );
};

export default TowerDetailForm;
