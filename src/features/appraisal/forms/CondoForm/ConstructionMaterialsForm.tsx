import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface ConstructionMaterialsFormProps {
  index: number;
}

function ConstructionMaterialsForm({ index }: ConstructionMaterialsFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Construction Materials</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={constructionMaterialsFormFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const constructionMaterialsFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condo.constructionMaterials',
    wrapperClassName: 'col-span-4',
    required: false,
    orientation: 'horizontal',
    options: [
      { value: '0', label: 'Normal' },
      { value: '1', label: 'Good' },
      { value: '2', label: 'VeryGood' },
    ],
  },
];

export default ConstructionMaterialsForm;
