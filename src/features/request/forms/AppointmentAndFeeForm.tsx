import FormSection, { type FormField } from '@/shared/components/sections/FormSection';
import SectionHeader from '@/shared/components/sections/SectionHeader';

const AppointmentAndFeeForm = () => {
  return (
    <>
      <SectionHeader title="Appointment and Fee" />
      <div className="grid grid-cols-2 gap-3">
        <FormSection fields={appointmentAndFeeFields} />
      </div>
    </>
  );
};

export const appointmentAndFeeFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Fee Type',
    name: 'fee.feeType',
    options: [
      {
        value: 'a',
        label: 'A',
      },
      {
        value: 'b',
        label: 'B',
      },
    ],
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Fee Remark',
    name: 'fee.feeRemark',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Bank Absorb Amount',
    name: '???3', // TODO
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'datetime-input',
    label: 'Appointment Date/Time',
    name: '???4', // TODO
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'textarea',
    label: 'Location Detail',
    name: '???5', // TODO
    wrapperClassName: 'col-span-2',
    required: true,
  },
];

export default AppointmentAndFeeForm;
