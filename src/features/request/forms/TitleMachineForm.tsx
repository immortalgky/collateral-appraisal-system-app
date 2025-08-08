import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface TitleMachineFormProps {
  index: number;
}

const TitleMachineForm = ({ index }: TitleMachineFormProps) => {
  return <FormSection fields={machineFields} namePrefix={'titles'} index={index} />;
};

const machineFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Machine Status',
    name: 'machine.machineStatus',
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
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Machine Type',
    name: 'machine.machineType',
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
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Registration Status',
    name: 'machine.machineRegistrationStatus',
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
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Registration No',
    name: 'machine.machineRegistrationNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Invoice No',
    name: 'machine.machineInvoiceNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'No of Machine(s)',
    name: 'machine.noOfMachine',
    wrapperClassName: 'col-span-3',
    required: true,
  },
];

export default TitleMachineForm;
