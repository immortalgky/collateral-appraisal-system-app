import AreaDetailForm from './AreaDetailForm';
import { FormCard, FormSection } from '../../../../shared/components';
import SectionDivider from '../../../../shared/components/sections/SectionDivider';
import type { FormField } from '@/shared/components';

function AppraisalCondoForm() {
  return (
    <FormCard title="Appraisal Information">
      {/* Condominum Information */}
      <div className="grid grid-cols-4 gap-6 p-b">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Condominum Information</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} lineClassName="border-gray-100" />

      {/* Condominium Location */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Condominium Location</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoLocationFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Decoration */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Decoration</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoDecorationFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Age/ Height Condominium */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Age/ Height of the Condominium Building</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={ageHeightCondoFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Construction Materials */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Construction Materials</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={constructionMaterialsFormFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Room Layout */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Room Layout</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoRoomLayoutFormFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Location View */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Location View</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={locationViewFormFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Floor */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Floor</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={floorFormFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Roof */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Roof</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={roofFormFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Area Details */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Area Details</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <AreaDetailForm />
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Expropriation */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Expropriation</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={expropriationFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Condominuim Facility */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Condominuim Facility</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoFacilityFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Environment */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Environment</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={enviromentFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* In Forest Boundary */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">In Forrest Boundary</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={inForestBoundaryFormFields} namePrefix={''}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Remarks */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Remarks</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={remarkFormFields} namePrefix={''}></FormSection>
        </div>
      </div>
    </FormCard>
  );
}

const condoFields: FormField[] = [
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
    required: true,
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
    type: 'radio-group-input',
    label: 'Is Obligation',
    name: 'isObligation',
    wrapperClassName: 'col-span-12',
    required: false,
    options: [
      { value: '0', label: 'No obligations' },
      { value: '1', label: 'Mortgage as security', isInput: true },
    ],
    orientation: 'horizontal',
    inputName: 'obligation',
    inputLabel: 'Obligation',
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

const condoLocationFields: FormField[] = [
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

const condoDecorationFields: FormField[] = [
  {
    type: 'radio-group-input',
    label: '',
    name: 'decoration',
    wrapperClassName: 'col-span-12',
    required: true,
    orientation: 'horizontal',
    options: [
      { value: '0', label: 'Ready to move in' },
      { value: '1', label: 'Partially' },
      { value: '2', label: 'None' },
      { value: '3', label: 'Other', isInput: true },
    ],
    inputName: 'other',
    inputLabel: 'Other',
  },
];

const ageHeightCondoFields: FormField[] = [
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

const constructionMaterialsFormFields: FormField[] = [
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

const condoRoomOptions = [
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 Bedroom' },
  { value: '2', label: '2 Bedroom' },
  { value: '3', label: 'Duplex' },
  { value: '4', label: 'Penhouse' },
  { value: '5', label: 'Other', isInput: true },
];

const condoRoomLayoutFormFields: FormField[] = [
  {
    type: 'radio-group-input',
    label: '',
    name: 'roomLayout',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoRoomOptions,
    inputName: 'other',
    inputLabel: 'Other',
  },
];

const locationViewOptions = [
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

const locationViewFormFields: FormField[] = [
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

const groundFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Parquet' },
  { value: '3', label: 'Marble' },
  { value: '4', label: 'Granite' },
  { value: '5', label: 'Laminate' },
  { value: '6', label: 'Rubber tiles' },
  { value: '7', label: 'Other', isInput: true },
];

const upperFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Parquet' },
  { value: '3', label: 'Marble' },
  { value: '4', label: 'Granite' },
  { value: '5', label: 'Laminate' },
  { value: '6', label: 'Rubber tiles' },
  { value: '7', label: 'Other', isInput: true },
];

const bathroomFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Marble' },
  { value: '3', label: 'Other', isInput: true },
];

const floorFormFields: FormField[] = [
  {
    type: 'radio-group-input',
    label: 'Ground Flooring Materials',
    name: 'groundFlooringMaterials',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: groundFlooringMaterialsOptions,
    inputName: 'other',
    inputLabel: 'Other',
  },
  {
    type: 'radio-group-input',
    label: 'Upper Flooring Materials',
    name: 'upperFlooringMaterials',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: upperFlooringMaterialsOptions,
    inputName: 'other',
    inputLabel: 'Other',
  },
  {
    type: 'radio-group-input',
    label: 'Bathroom Flooring Materials',
    name: 'bathroomFlooringMaterials',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: bathroomFlooringMaterialsOptions,
    inputName: 'other',
    inputLabel: 'Other',
  },
];

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
  { value: '9', label: 'Other', isInput: true },
];

const roofFormFields: FormField[] = [
  {
    type: 'radio-group-input',
    label: '',
    name: 'roof',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: roofOptions,
    inputName: 'other',
    inputLabel: 'Other',
  },
];

const expropriationOptions = [
  { value: '0', label: 'Is Expropriated' },
  { value: '1', label: 'In Line Expropriated' },
];

const expropriationFields: FormField[] = [
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

const condoFacilityOptions = [
  { value: '0', label: 'Passenger Elevator' },
  { value: '1', label: 'Hallway' },
  { value: '2', label: 'Parking' },
  { value: '3', label: 'File Escape' },
  { value: '4', label: 'Fire Extinguishing System' },
  { value: '5', label: 'Swimming Pool' },
  { value: '6', label: 'Fitness Room' },
  { value: '7', label: 'Garden' },
  { value: '8', label: 'Outdoor' },
  { value: '9', label: 'Club' },
  { value: '10', label: 'Steam Room' },
  { value: '11', label: 'Security System' },
  { value: '12', label: 'Key card System' },
  { value: '13', label: 'Legal Entity' },
  { value: '14', label: 'Garbage Disposal Point' },
  { value: '15', label: 'Waste Disposal and System' },
  { value: '16', label: 'Kindergarten' },
  { value: '17', label: 'Other', isInput: true },
];

const condoFacilityFields: FormField[] = [
  {
    type: 'radio-group-input',
    label: '',
    name: 'condoFacility',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoFacilityOptions,
    inputName: 'other',
    inputLabel: 'Other',
  },
];

const environmentOptions = [
  { value: '0', label: 'Highly Densely Populated Residential Area' },
  { value: '1', label: 'Moderately Densely Populated Residential Area' },
  { value: '2', label: 'Low-Density Residential Area' },
  { value: '3', label: 'Sparsely Populated Residential Area, Rural' },
  { value: '4', label: 'Vacant Land, Far from Community' },
  { value: '5', label: 'Commercial Area' },
  { value: '6', label: 'Industrial Area' },
  { value: '7', label: 'Agricultural Area' },
];

const enviromentFields: FormField[] = [
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

const InForestBoundaryOptions = [
  { value: '0', label: 'Not in Forest Boundary' },
  { value: '1', label: 'In Forest Boundary', isInput: true },
];

const inForestBoundaryFormFields: FormField[] = [
  {
    type: 'radio-group-input',
    label: '',
    name: 'inForestBoundary.type',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: InForestBoundaryOptions,
    inputName: 'remarks',
    inputLabel: 'Remarks',
  },
];

const remarkFormFields: FormField[] = [
  {
    type: 'textarea',
    label: '',
    name: 'remarks',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default AppraisalCondoForm;
