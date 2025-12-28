import { FormFields, type FormField } from '@/shared/components/form';

interface TitleCondoFormProps {
  index: number;
}

const TitleCondoForm = ({ index }: TitleCondoFormProps) => {
  return <FormFields fields={condoFields} namePrefix={'titles'} index={index} />;
};

const condoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Room No',
    name: 'roomNo',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Floor No',
    name: 'floorNo',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Building No',
    name: 'buildingNo',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condo Name',
    name: 'condoName',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Usage Area (Sq.M)',
    name: 'usableArea',
    wrapperClassName: 'col-span-2',
    required: true,
    decimalPlaces: 2,
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'textarea',
    label: 'Title Detail',
    name: 'titleDetail',
    wrapperClassName: 'col-span-6',
  },
];

export default TitleCondoForm;
