import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface CondoFacilityFormProps {
  index: number;
}

const condoFacilityOptions = [
  { value: '0', label: 'Passenger Elevator' },
  { value: '1', label: 'Hallway' },
];

function CondoFacilityForm({ index }: CondoFacilityFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Condominuim Facility</p>
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
    name: 'condo.condoFacility',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoFacilityOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condo.condoFacility.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default CondoFacilityForm;
