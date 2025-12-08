import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface InForestBoundaryFormProps {
  index: number;
}

const InForestBoundaryOptions = [
  { value: '0', label: 'Not in Forest Boundary' },
  { value: '1', label: 'In Forest Boundary' },
];

function InForestBoundaryForm({ index }: InForestBoundaryFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">In Forrest Boundary</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={inForestBoundaryFormFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const inForestBoundaryFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condo.inForestBoundary',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: InForestBoundaryOptions,
  },
  {
    type: 'text-input',
    label: 'remarks',
    name: 'condo.inForestBoundary.remarks',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default InForestBoundaryForm;
