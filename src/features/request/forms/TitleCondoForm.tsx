import { type FormField, FormFields } from '@/shared/components/form';

interface TitleCondoFormProps {
  index: number;
}

const TitleCondoForm = ({ index }: TitleCondoFormProps) => {
  return <FormFields fields={condoFields} namePrefix={'titles'} index={index} />;
};

const condoFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Title Type',
    name: 'titleType',
    group: 'DeedType',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Title Number',
    name: 'titleNumber',
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'text-input',
    label: 'Room Number',
    name: 'roomNumber',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Floor Number',
    name: 'floorNumber',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Building Number',
    name: 'buildingNumber',
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
    name: 'notes',
    wrapperClassName: 'col-span-6',
  },
];

export default TitleCondoForm;
