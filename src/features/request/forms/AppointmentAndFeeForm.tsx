import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';
import { makeAppointmentFields, makeContactPersonFields, makeFeeFields } from '../configs/fields';

const AppointmentAndFeeForm = () => {
  const { t } = useTranslation('request');
  const appointmentFields = useMemo(() => makeAppointmentFields(t), [t]);
  const contactFields = useMemo(() => makeContactPersonFields(t), [t]);
  const feeFields = useMemo(() => makeFeeFields(t), [t]);

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 xl:grid-cols-2">
      <div>
        <SectionHeader title={t('requestForm.sections.appointmentAndContact')} />
        <div className="grid grid-cols-6 gap-x-3.5 gap-y-3">
          <FormFields fields={appointmentFields} />
          <FormFields fields={contactFields} namePrefix="detail.contact" />
        </div>
      </div>
      <div>
        <SectionHeader title={t('requestForm.sections.fee')} />
        <div className="grid grid-cols-6 gap-x-3.5 gap-y-3">
          <FormFields fields={feeFields} />
        </div>
      </div>
    </div>
  );
};

export default AppointmentAndFeeForm;
