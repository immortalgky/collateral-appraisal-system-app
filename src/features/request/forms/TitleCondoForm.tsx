import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface TitleCondoFormProps {
  index: number;
}

const TitleCondoForm = ({ index }: TitleCondoFormProps) => {
  return <FormSection fields={condoFields} namePrefix={'titles'} index={index} />;
};

const condoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Room No',
    name: 'condo.condoRoomNo',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Floor No',
    name: 'condo.condoFloorNo',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Building No',
    name: 'condo.condoBuildingNo',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condo Name',
    name: 'condo.condoName',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Usage Area (Sq.M)',
    name: 'area.usageArea',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'collateral.owner',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'textarea',
    label: 'Title Detail',
    name: 'collateral.titleDetail',
    wrapperClassName: 'col-span-6',
  },
];

export default TitleCondoForm;
