import type { FormField } from '@/shared/components';

export const condoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condominium Name',
    name: 'condoName',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Room No',
    name: 'roomNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Floor No',
    name: 'floorNo',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Building No',
    name: 'buildingNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Model Name',
    name: 'modelName',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Construction on Title Deed No',
    name: 'constructionOnTitleDeedNo',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condominium Registration No',
    name: 'condominiumRegistrationNo',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Usable Area (Sqm)',
    name: 'usableArea',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Sub-District',
    name: 'subDistrict',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'district',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'province',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Land Office',
    name: 'landOffice',
    wrapperClassName: 'col-span-4',
    required: false,
    options: [
      { value: '0', label: 'Office 01' },
      { value: '1', label: 'Office 02' },
    ],
  },
  {
    type: 'radio-group-input',
    label: 'Check Owner',
    name: 'checkOwner',
    wrapperClassName: 'col-span-12',
    required: true,
    options: [
      { value: '1', label: 'Can', isInput: true },
      { value: '0', label: 'Cannot' },
    ],
    orientation: 'horizontal',
    inputName: 'ownerName',
    inputLabel: 'Owner Name',
  },
  {
    type: 'radio-group',
    label: 'Condominium Conditions',
    name: 'condoConditions',
    wrapperClassName: 'col-span-12',
    required: false,
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
    name: 'isObligation',
    wrapperClassName: 'col-span-12',
    required: false,
    options: [
      { value: '0', label: 'No obligations' },
      { value: '1', label: 'Mortgage as security' },
    ],
    orientation: 'horizontal',
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligation',
    wrapperClassName: 'col-span-12',
    required: true,
  },
  {
    type: 'radio-group',
    label: 'Document Validation',
    name: 'documentValidation',
    wrapperClassName: 'col-span-12',
    required: true,
    options: [
      { value: '0', label: 'Correctly Matched' },
      { value: '1', label: 'Not Consistent' },
    ],
    orientation: 'horizontal',
  },
];

export const condoLocationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'isCondoLocationCorrect',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'Correct' },
      { value: '0', label: 'Incorrect' },
    ],
  },
  {
    type: 'text-input',
    label: 'Street',
    name: 'street',
    wrapperClassName: 'col-span-6',
    required: false,
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'soi',
    wrapperClassName: 'col-span-6',
    required: false,
  },
  {
    type: 'number-input',
    label: 'Distance',
    name: 'distance',
    wrapperClassName: 'col-span-3',
    required: false,
  },
  {
    type: 'number-input',
    label: 'Road Width',
    name: 'width',
    wrapperClassName: 'col-span-3',
    required: false,
  },
  {
    type: 'number-input',
    label: 'Right of Way',
    name: 'rightOfWay',
    wrapperClassName: 'col-span-3',
    required: false,
  },
  {
    type: 'radio-group',
    label: 'Road Surface',
    name: 'roadSurface',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'Correct' },
      { value: '0', label: 'Incorrect' },
    ],
  },
  {
    type: 'checkbox',
    label: 'Permanent Electricity',
    name: 'permanentElectricity',
    wrapperClassName: 'col-span-2',
    required: false,
  },
  {
    type: 'checkbox',
    label: 'Tap water / ground water',
    name: 'waterSupply',
    wrapperClassName: 'col-span-2',
    required: false,
  },
];

export const condoDecorationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'decoration.type',
    wrapperClassName: 'col-span-12',
    required: true,
    orientation: 'horizontal',
    options: [
      { value: '0', label: 'Ready to move in' },
      { value: '1', label: 'Partially' },
      { value: '2', label: 'None' },
      { value: '3', label: 'Other' },
    ],
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'decoration.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export const ageHeightCondoFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Building Age (Years)',
    name: 'buildingYear',
    wrapperClassName: 'col-span-4',
    required: false,
  },
  {
    type: 'number-input',
    label: 'Total Number of Floors',
    name: 'totalFloor',
    wrapperClassName: 'col-span-4',
    required: false,
  },
];

export const constructionMaterialsFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'constructionMaterials',
    wrapperClassName: 'col-span-4',
    required: false,
    orientation: 'horizontal',
    options: [
      { value: '0', label: 'Normal' },
      { value: '1', label: 'Good' },
      { value: '2', label: 'VeryGood' },
    ],
  },
];

export const condoRoomOptions = [
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 Bedroom' },
  { value: '2', label: '2 Bedroom' },
  { value: '3', label: 'Duplex' },
  { value: '4', label: 'Penhouse' },
  { value: '5', label: 'Other' },
];

export const condoRoomLayoutFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'roomLayout.type',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoRoomOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'roomLayout.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export const locationViewOptions = [
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

export const locationViewFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'locationView',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: locationViewOptions,
  },
];

export const groundFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Parquet' },
  { value: '3', label: 'Marble' },
  { value: '4', label: 'Granite' },
  { value: '5', label: 'Laminate' },
  { value: '6', label: 'Rubber tiles' },
  { value: '7', label: 'Other' },
];

export const upperFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Parquet' },
  { value: '3', label: 'Marble' },
  { value: '4', label: 'Granite' },
  { value: '5', label: 'Laminate' },
  { value: '6', label: 'Rubber tiles' },
  { value: '7', label: 'Other' },
];

export const bathroomFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Marble' },
  { value: '3', label: 'Other' },
];

export const floorFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Ground Flooring Materials',
    name: 'groundFlooringMaterials.type',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: groundFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'groundFlooringMaterials.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
  {
    type: 'radio-group',
    label: 'Upper Flooring Materials',
    name: 'upperFlooringMaterials.type',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: upperFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'upperFlooringMaterials.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
  {
    type: 'radio-group',
    label: 'Bathroom Flooring Materials',
    name: 'bathroomFlooringMaterials.type',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: bathroomFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'bathroomFlooringMaterials.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export const roofOptions = [
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

export const roofFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'roof.type',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: roofOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'roof.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export const expropriationOptions = [
  { value: '0', label: 'Is Expropriated' },
  { value: '1', label: 'In Line Expropriated' },
];

export const expropriationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'expropriation',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: expropriationOptions,
  },
  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-2',
    required: false,
  },
];

export const condoFacilityOptions = [
  { value: '0', label: 'Passenger Elevator' },
  { value: '1', label: 'Hallway' },
];

export const condoFacilityFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condoFacility.type',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoFacilityOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condoFacility.other',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export const environmentOptions = [
  { value: '0', label: 'Highly Densely Populated Residential Area' },
  { value: '1', label: 'Moderately Densely Populated Residential Area' },
];

export const enviromentFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'condoEnvironment',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: environmentOptions,
  },
];

export const InForestBoundaryOptions = [
  { value: '0', label: 'Not in Forest Boundary' },
  { value: '1', label: 'In Forest Boundary' },
];

export const inForestBoundaryFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'inForestBoundary.type',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: InForestBoundaryOptions,
  },
  {
    type: 'text-input',
    label: 'remarks',
    name: 'inForestBoundary.remarks',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export const remarkFormFields: FormField[] = [
  {
    type: 'textarea',
    label: '',
    name: 'remarks',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];
