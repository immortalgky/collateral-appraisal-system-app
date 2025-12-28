import { FormFields, type FormField } from '@/shared/components/form';

interface TitleMachineFormProps {
  index: number;
}

const TitleMachineForm = ({ index }: TitleMachineFormProps) => {
  return <FormFields fields={machineFields} namePrefix={'titles'} index={index} />;
};

const machineFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Installation Status',
    name: 'installationStatus',
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
    name: 'machineType',
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
    name: 'registrationStatus',
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
    name: 'registrationNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Invoice No',
    name: 'invoiceNumber',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'No of Machine(s)',
    name: 'numberOfMachine',
    wrapperClassName: 'col-span-3',
    required: true,
    decimalPlaces: 0,
  },
];

export default TitleMachineForm;
