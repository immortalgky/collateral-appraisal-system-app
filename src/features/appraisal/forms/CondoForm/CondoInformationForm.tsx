import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface CollateralCondoFormProps {
  index: number;
}

const CondoInformationForm = ({ index }: CollateralCondoFormProps) => {
  return (
    <div className="grid grid-cols-4 gap-6 p-b">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Condominum Information</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection fields={condoFields} namePrefix={'collaterals'} index={index}></FormSection>
      </div>
    </div>
  );
};

const condoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'condo.propertyName',
    wrapperClassName: 'col-span-12',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condominium Name',
    name: 'condo.condoName',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Room No',
    name: 'condo.roomNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Floor No',
    name: 'condo.floorNo',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Building No',
    name: 'condo.buildingNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Model Name',
    name: 'condo.modelName',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Construction on Title Deed No',
    name: 'condo.constructionOnTitleDeedNo',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condominium Registration No',
    name: 'condo.condominiumRegistrationNo',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Usable Area (Sqm)',
    name: 'condo.usableArea',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Sub-District',
    name: 'condo.subDistrict',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'condo.district',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'condo.province',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'condo.latitude',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Longitude',
    name: 'condo.Longitude',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Land Office',
    name: 'condo.landOffice',
    wrapperClassName: 'col-span-4',
    required: true,
    options: [{ value: 'province1', label: 'Province 1' }],
  },
  {
    type: 'radio-group',
    label: 'Check Owner',
    name: 'condo.checkOwner',
    wrapperClassName: 'col-span-3',
    required: true,
    options: [
      { value: '1', label: 'Can' },
      { value: '0', label: 'Cannot' },
    ],
    orientation: 'horizontal',
  },
  {
    type: 'text-input',
    label: 'Owner Name',
    name: 'condo.OwnerName',
    wrapperClassName: 'col-span-9',
    required: true,
  },
  {
    type: 'radio-group',
    label: 'Condominium Conditions',
    name: 'condo.condoConditions',
    wrapperClassName: 'col-span-12',
    required: true,
    options: [
      { value: '0', label: 'New' },
      { value: '1', label: 'Moderate' },
      { value: '2', label: 'Old' },
      { value: '3', label: 'Construction' },
      { value: '4', label: 'Dilapidated' },
    ],
    orientation: 'horizontal',
  },
  {
    type: 'radio-group',
    label: 'Is Obligation',
    name: 'condo.isObligation',
    wrapperClassName: 'col-span-12',
    required: true,
    options: [
      { value: '0', label: 'No obligations' },
      { value: '1', label: 'Mortgage as security' },
    ],
    orientation: 'horizontal',
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'condo.obligation',
    wrapperClassName: 'col-span-12',
    required: true,
  },
  {
    type: 'radio-group',
    label: 'Document Validation',
    name: 'condo.documentValidation',
    wrapperClassName: 'col-span-12',
    required: true,
    options: [
      { value: '0', label: 'Correctly Matched' },
      { value: '1', label: 'Not Consistent' },
    ],
    orientation: 'horizontal',
  },
];

export default CondoInformationForm;
