import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface EnviromentFormProps {
  index: number;
}

const environmentOptions = [
  { value: '0', label: 'Highly Densely Populated Residential Area' },
  { value: '1', label: 'Moderately Densely Populated Residential Area' },
];

function EnviromentForm({ index }: EnviromentFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Environment</p>
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
    name: 'condo.condoEnvironment',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: environmentOptions,
  },
];

export default EnviromentForm;
