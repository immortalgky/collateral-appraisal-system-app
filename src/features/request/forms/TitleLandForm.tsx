import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface TitleLandFormProps {
  index: number;
  variant?: 'land' | 'landAndBuilding';
}

const TitleLandForm = ({ index, variant = 'land' }: TitleLandFormProps) => {
  const fields = variant === 'land' ? landLandVariantFields : landFields;
  return <FormSection fields={fields} namePrefix={'titles'} index={index} />;
};

const landFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Title No',
    name: 'collateral.titleNo',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Rai',
    name: 'area.rai',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Ngan',
    name: 'area.ngan',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Wa',
    name: 'area.wa',
    wrapperClassName: 'col-span-1',
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

const landLandVariantFields = landFields.slice(0, 4).concat(landFields.slice(5));

export default TitleLandForm;
