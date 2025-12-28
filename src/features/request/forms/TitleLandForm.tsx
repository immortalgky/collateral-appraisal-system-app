import { FormFields, type FormField } from '@/shared/components/form';

interface TitleLandFormProps {
  index: number;
  variant?: 'land' | 'landAndBuilding';
}

const TitleLandForm = ({ index, variant = 'land' }: TitleLandFormProps) => {
  const fields = variant === 'land' ? landLandVariantFields : landFields;
  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

const landFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Title No',
    name: 'titleNo',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Rai',
    name: 'areaRai',
    wrapperClassName: 'col-span-1',
    required: true,
    decimalPlaces: 0,
  },
  {
    type: 'number-input',
    label: 'Ngan',
    name: 'areaNgan',
    wrapperClassName: 'col-span-1',
    required: true,
    decimalPlaces: 0,
  },
  {
    type: 'number-input',
    label: 'Wa',
    name: 'areaSquareWa',
    wrapperClassName: 'col-span-1',
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

const landLandVariantFields = landFields.slice(0, 4).concat(landFields.slice(5));

export default TitleLandForm;
