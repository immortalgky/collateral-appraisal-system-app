import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface BuildlingFormFormProps {
  index: number;
}

function BuildlingFormForm({ index }: BuildlingFormFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Age/ Height of the Condominium Building</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={buildingFormFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const buildingFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Building Form',
    name: 'condo.buildingForm',
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

export default BuildlingFormForm;
