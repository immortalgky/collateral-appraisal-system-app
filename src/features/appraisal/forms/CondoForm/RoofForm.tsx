import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface RoofFormProps {
  index: number;
}

const roofOptions = [
  { value: '0', label: 'Reinforced Concrete' },
  { value: '1', label: 'Tiles' },
  { value: '2', label: 'Corrugated Tiles' },
  { value: '3', label: 'Duplex' },
  { value: '4', label: 'Metal sheet' },
  { value: '5', label: 'Vinyl' },
  { value: '6', label: 'Terracotta Tiles' },
  { value: '7', label: 'Zinc' },
  { value: '8', label: 'Unable to verify' },
  { value: '9', label: 'Other' },
];

function RoofForm({ index }: RoofFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Roof</p>
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
    name: 'condo.roof',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: roofOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condo.roof.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default RoofForm;
