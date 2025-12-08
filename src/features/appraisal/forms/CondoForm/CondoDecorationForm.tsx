import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface CondoDecorationFormProps {
  index: number;
}

function CondoDecorationForm({ index }: CondoDecorationFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Decoration</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={condoDecorationFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const condoDecorationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condo.decoration',
    wrapperClassName: 'col-span-12',
    required: true,
    orientation: 'horizontal',
    options: [
      { value: '0', label: 'Ready to move in' },
      { value: '1', label: 'Partially' },
      { value: '2', label: 'None' },
      { value: '3', label: 'Other' },
    ],
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condo.decoration.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default CondoDecorationForm;
