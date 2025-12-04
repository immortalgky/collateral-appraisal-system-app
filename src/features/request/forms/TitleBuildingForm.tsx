import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface TitleBuildingFormProps {
  index: number;
  variant?: 2 | 3;
}

const TitleBuildingForm = ({ index, variant = 3 }: TitleBuildingFormProps) => {
  const fields = variant == 3 ? buildingFields : buildingFieldsAlt;
  return <FormSection fields={fields} namePrefix={'titles'} index={index} />;
};

const buildingFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Building Type',
    name: 'building.buildingType',
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
    type: 'number-input',
    label: 'Usage Area',
    name: 'area.usageArea',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Number of Building',
    name: 'noOfBuilding',
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
