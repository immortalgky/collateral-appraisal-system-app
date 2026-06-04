import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';
import { makeAppointmentAndFeeFields } from '../configs/fields';

const AppointmentAndFeeForm = () => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeAppointmentAndFeeFields(t), [t]);

  return (
    <div>
      <SectionHeader title={t('forms.appointmentAndFee')} />
      <div className="grid grid-cols-2 gap-4">
        <FormFields fields={fields} />
      </div>
    </div>
  );
};

export default AppointmentAndFeeForm;
