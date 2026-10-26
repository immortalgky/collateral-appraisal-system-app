import { useTranslation } from 'react-i18next';
import { FormFields, FormSection, FormSheet, FormSubheading } from '@/shared/components/form';
import { pmaField, condoPmaDetailFields, condoPmaAddressFields } from '../configs/fields';
import { FieldLabels } from '../components/FieldLabels';
import { useForcedSalePriceDefault } from '../hooks/useForcedSalePriceDefault';

const CondoPMAForm = () => {
  const { t } = useTranslation('appraisal');

  useForcedSalePriceDefault();

  return (
    <FieldLabels scope="condoPma">
      <div className="w-full max-w-full">
        <FormSheet>
          <FormSection title={t('forms.pma.groups.condoInfo')} icon="building">
            <FormFields fields={condoPmaDetailFields} />
            <FormSubheading>{t('forms.pma.groups.titleAddress')}</FormSubheading>
            <FormFields fields={condoPmaAddressFields} />
          </FormSection>

          <FormSection title={t('forms.pma.groups.value')} icon="money-bill">
            <FormFields fields={pmaField} />
          </FormSection>
        </FormSheet>
      </div>
    </FieldLabels>
  );
};

export default CondoPMAForm;
