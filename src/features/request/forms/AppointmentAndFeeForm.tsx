import { type FormField, FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';

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

const appointmentAndFeeFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Fee Payment Type',
    name: 'detail.fee.feePaymentType',
    options: [
      {
        value: '01',
        label: 'Paid at the bank (before the appraisal date)',
      },
      {
        value: '02',
        label: 'Paid on the appraisal date',
      },
      {
        value: '03',
        label: 'Customer partially paid; remaining paid on the appraisal date',
      },
      {
        value: '04',
        label: 'Customer partially paid / bank absorbed part of the fee',
      },
      {
        value: '05',
        label: 'Exempted due to M/F',
      },
      {
        value: '06',
        label: 'Exempted due to retail customer under M/F',
      },
      {
        value: '07',
        label: 'Exempted due to other reasons',
      },
      {
        value: '99',
        label: 'Others',
      },
    ],
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Fee Remark',
    name: 'detail.fee.feeNotes',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Bank Absorb Amount',
    name: 'detail.fee.absorbedAmount',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'datetime-input',
    label: 'Appointment Date/Time',
    name: 'detail.appointment.appointmentDateTime',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'textarea',
    label: 'Location Detail',
    name: 'detail.appointment.appointmentLocation',
    wrapperClassName: 'col-span-2',
    required: true,
  },
];

export default AppointmentAndFeeForm;
