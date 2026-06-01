import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';
import { makeAddressFields, makeContactFields } from '../configs/fields';

const AddressForm = () => {
  const { t } = useTranslation('request');
  const addressFields = useMemo(() => makeAddressFields(t), [t]);
  const contactFields = useMemo(() => makeContactFields(t), [t]);

  return (
    <div>
      <SectionHeader title={t('forms.location')} />
      <div className="grid grid-cols-6 gap-4">
        <FormFields fields={addressFields} namePrefix="detail.address" />
        <FormFields fields={contactFields} namePrefix="detail.contact" />
      </div>
    </div>
  );
};

export default AddressForm;
