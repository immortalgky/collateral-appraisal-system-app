import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { pmaField, condoPmaDetailFields, condoPmaAddressFields } from '../configs/fields';
import { FieldLabels } from '../components/FieldLabels';
import { useForcedSalePriceDefault } from '../hooks/useForcedSalePriceDefault';
import FieldGroupLabel from './FieldGroupLabel';
import SectionRow from '../components/SectionRow';

const CondoPMAForm = () => {
  const { t } = useTranslation('appraisal');

  useForcedSalePriceDefault();

  return (
    <FieldLabels scope="condoPma">
      <div className="w-full max-w-full overflow-hidden">
        <div className="cas-section-grid cas-sheet grid grid-cols-1 xl:grid-cols-5 gap-x-6 gap-y-4">
          <SectionRow spacedRule title={t('forms.pma.groups.condoInfo')} icon="building">
            <FormFields fields={condoPmaDetailFields} />
            <FieldGroupLabel label={t('forms.pma.groups.titleAddress')} />
            <FormFields fields={condoPmaAddressFields} />
          </SectionRow>

          <SectionRow spacedRule title={t('forms.pma.groups.value')} icon="money-bill" isLast>
            <FormFields fields={pmaField} />
          </SectionRow>
        </div>
      </div>
    </FieldLabels>
  );
};

export default CondoPMAForm;
