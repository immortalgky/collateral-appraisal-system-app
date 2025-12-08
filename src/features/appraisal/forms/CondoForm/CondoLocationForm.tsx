import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface CondoLocationFormProps {
  index: number; // what is index used for?
}

const CondoLocation = ({ index }: CondoLocationFormProps) => {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Condominium Location</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={condoLocationFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
};

const condoLocationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condo.condoPropertyName',
    wrapperClassName: 'col-span-12',
    required: true,
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'Correct' },
      { value: '0', label: 'Incorrect' },
    ],
  },
  {
    type: 'text-input',
    label: 'Street',
    name: 'condo.street',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'condo.soi',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Distance',
    name: 'condo.distance',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Road Width',
    name: 'condo.width',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Right of Way',
    name: 'condo.rightOfWay',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'radio-group',
    label: 'Road Surface',
    name: 'condo.roadSurface',
    wrapperClassName: 'col-span-12',
    required: true,
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'Correct' },
      { value: '0', label: 'Incorrect' },
    ],
  },
  {
    type: 'checkbox',
    label: 'Permanent Electricity',
    name: 'condo.permanentElectricity',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'checkbox',
    label: 'Tap water / ground water',
    name: 'condo.waterSupply',
    wrapperClassName: 'col-span-2',
    required: true,
  },
];

export default CondoLocation;
