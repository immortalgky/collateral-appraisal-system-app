import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface ExpropriationFormProps {
  index: number;
}

const expropriationOptions = [
  { value: '0', label: 'Is Expropriated' },
  { value: '1', label: 'In Line Expropriated' },
];

function ExpropriationForm({ index }: ExpropriationFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Expropriation</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection fields={roofFormFields} namePrefix={'collaterals'} index={index}></FormSection>
      </div>
    </div>
  );
}

const roofFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condo.expropriation',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: expropriationOptions,
  },
  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'condo.royalDecree',
    wrapperClassName: 'col-span-2',
    required: false,
  },
];

export default ExpropriationForm;
