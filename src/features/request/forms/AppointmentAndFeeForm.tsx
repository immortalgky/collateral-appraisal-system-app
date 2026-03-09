import { FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';
import { appointmentAndFeeFields } from '../configs/fields';

const AppointmentAndFeeForm = () => {
  return (
    <div>
      <SectionHeader title="Appointment and Fee" />
      {/*<FormCard title="Appointment and Fee">*/}
      <div className="grid grid-cols-2 gap-4">
        <FormFields fields={appointmentAndFeeFields} />
      </div>
      {/*</FormCard>*/}
    </div>
  );
};

export default AppointmentAndFeeForm;
