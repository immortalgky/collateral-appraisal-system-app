import { FormFields, type FormField } from '@/shared/components/form';

interface TitleBuildingFormProps {
  index: number;
  variant?: 2 | 3;
}

const TitleBuildingForm = ({ index, variant = 3 }: TitleBuildingFormProps) => {
  const fields = variant == 3 ? buildingFields : buildingFieldsAlt;
  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

const buildingFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Building Type',
    name: 'buildingType',
    group: 'BuildingType',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Usage Area',
    name: 'usableArea',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Number of Building',
    name: 'numberOfBuilding',
    wrapperClassName: 'col-span-3',
    required: true,
  },
];

const buildingFieldsAlt = buildingFields.map(field => {
  return {
    ...field,
    wrapperClassName: 'col-span-2',
  };
});

export default TitleBuildingForm;
