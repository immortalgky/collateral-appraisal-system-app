import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import { makeRequestFields } from '../configs/fields';

const RequestForm = () => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeRequestFields(t), [t]);

  return (
    <div>
      <SectionHeader title={t('forms.request')} />
      <div className="grid grid-cols-3 gap-4">
        <FormFields fields={fields} />
      </div>
    </div>
  );
};

export default RequestForm;
