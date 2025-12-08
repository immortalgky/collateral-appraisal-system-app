import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface CondoRoomLayoutFormProps {
  index: number;
}

const condoRoomOptions = [
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 Bedroom' },
  { value: '2', label: '2 Bedroom' },
  { value: '3', label: 'Duplex' },
  { value: '4', label: 'Penhouse' },
  { value: '5', label: 'Other' },
];

function CondoRoomLayoutForm({ index }: CondoRoomLayoutFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Room Layout</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={condoRoomLayoutFormFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const condoRoomLayoutFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condo.roomLayout',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoRoomOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condo.roomLayout.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default CondoRoomLayoutForm;
