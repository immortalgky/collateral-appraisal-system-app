import { useTranslation } from 'react-i18next';
import FormTable from '../components/tables/FormTable';
import { SectionHeader } from '@shared/components';

const CustomersForm = () => {
  const { t } = useTranslation('request');

  const customersColumns = [
    { label: t('seqNo'), rowNumberColumn: true as const },
    { name: 'name', label: t('fields.customerName'), maxLength: 260 },
    { name: 'contactNumber', label: t('fields.contactNumber'), maxLength: 20 },
  ];

  return (
    <div>
      <SectionHeader title={t('forms.customers')} required={true} />
      <FormTable columns={customersColumns} name={'customers'} />
    </div>
  );
};

export default CustomersForm;
