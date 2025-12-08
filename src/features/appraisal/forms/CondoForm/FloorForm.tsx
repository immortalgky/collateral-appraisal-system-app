import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface FloorFormProps {
  index: number;
}

const groundFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Parquet' },
  { value: '3', label: 'Marble' },
  { value: '4', label: 'Granite' },
  { value: '5', label: 'Laminate' },
  { value: '6', label: 'Rubber tiles' },
  { value: '7', label: 'Other' },
];

const upperFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Parquet' },
  { value: '3', label: 'Marble' },
  { value: '4', label: 'Granite' },
  { value: '5', label: 'Laminate' },
  { value: '6', label: 'Rubber tiles' },
  { value: '7', label: 'Other' },
];

const bathroomFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Marble' },
  { value: '3', label: 'Other' },
];

function FloorForm({ index }: FloorFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Floor</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={floorFormFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const floorFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Ground Flooring Materials',
    name: 'condo.groundFlooringMaterials',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: groundFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condo.groundFlooringMaterials.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
  {
    type: 'radio-group',
    label: 'Upper Flooring Materials',
    name: 'condo.upperFlooringMaterials',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: upperFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condo.upperFlooringMaterials.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
  {
    type: 'radio-group',
    label: 'Bathroom Flooring Materials',
    name: 'condo.bathroomFlooringMaterials',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: bathroomFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condo.bathroomFlooringMaterials.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default FloorForm;
