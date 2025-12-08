import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface LocationViewFormProps {
  index: number;
}

const options = [
  { value: '0', label: 'Pool View' },
  { value: '1', label: 'River View' },
  { value: '2', label: 'Clubhouse View' },
  { value: '3', label: 'Near/Adjacent to Elevator' },
  { value: '4', label: 'Near/Adjacent to Trash Room' },
  { value: '5', label: 'Corner Room' },
  { value: '6', label: 'Garden View' },
  { value: '7', label: 'City View' },
  { value: '8', label: 'Sea View' },
  { value: '9', label: 'Mountain View' },
  { value: '10', label: 'Central Floor (or Central Area)' },
];

function LocationViewForm({ index }: LocationViewFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Location View</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={locationViewFormFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const locationViewFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condo.locationView',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: options,
  },
];

export default LocationViewForm;
