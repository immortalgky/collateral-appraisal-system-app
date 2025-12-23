import { FormCard, FormSection, type FormField } from '@/shared/components';
import CondoAreaDetailForm from './CondoAreaDetailForm';
import SectionDivider from '@/shared/components/sections/SectionDevider';

function CondoDetailForm() {
  return (
    <FormCard title="Appraisal Information">
      {/* Condominum Information */}
      <div className="grid grid-cols-4 gap-6 p-b">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Condominum Information</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} lineClassName="border-gray-100" />

      {/* Condominium Location */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Condominium Location</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoLocationFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Decoration */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Decoration</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoDecorationFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Age/ Height Condominium */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Age/ Height of the Condominium Building</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={ageHeightCondoFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Construction Materials */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Construction Materials</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={constructionMaterialsFormFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Room Layout */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Room Layout</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoRoomLayoutFormFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Location View */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Location View</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={locationViewFormFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Floor */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Floor</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={floorFormFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Roof */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Roof</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={roofFormFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Area Details */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Area Details</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <CondoAreaDetailForm />
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Expropriation */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Expropriation</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={expropriationFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Condominuim Facility */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Condominuim Facility</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={condoFacilityFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Environment */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Environment</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={enviromentFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* In Forest Boundary */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">In Forrest Boundary</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={inForestBoundaryFormFields}></FormSection>
        </div>
      </div>
      <SectionDivider label={''} />

      {/* Remarks */}
      <div className="grid grid-cols-4 gap-6">
        <div className="font-medium col-span-1">
          <p className="col-span-1">Remarks</p>
        </div>
        <div className="grid grid-cols-12 gap-4 col-span-3">
          <FormSection fields={remarkFormFields}></FormSection>
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
    type: 'radio-group',
    label: 'Check Owner',
    name: 'verifiableOwner',
    wrapperClassName: 'col-span-12',
    required: true,
    options: [
      { value: '1', label: 'Can' },
      { value: '0', label: 'Cannot' },
    ],
    orientation: 'horizontal',
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'owner',
    wrapperClassName: 'col-span-12',
    required: false,
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
    required: false,
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
    type: 'checkbox-group',
    label: 'Public Utility',
    name: 'publicUtility',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: [
      { value: '0', label: 'Permanent Electricity' },
      { value: '1', label: 'Tap water / ground water' },
      { value: '2', label: 'Street Electricity' },
      { value: '3', label: 'Manhole / Drainage pipe' },
      { value: '99', label: 'Other' },
    ],
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'publicUtilityOther',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

const condoDecorationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'decoration',
    wrapperClassName: 'col-span-12',
    required: true,
    orientation: 'horizontal',
    options: [
      { value: '0', label: 'Ready to move in' },
      { value: '1', label: 'Partially' },
      { value: '2', label: 'None' },
      { value: '99', label: 'Other' },
    ],
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'decorationOther',
    wrapperClassName: 'col-span-12',
    required: false,
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
  { value: '99', label: 'Other' },
];

const condoRoomLayoutFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'roomLayout',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoRoomOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'roomLayoutOther',
    wrapperClassName: 'col-span-12',
    required: false,
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
    type: 'checkbox-group',
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
  { value: '99', label: 'Other' },
];

const upperFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Parquet' },
  { value: '3', label: 'Marble' },
  { value: '4', label: 'Granite' },
  { value: '5', label: 'Laminate' },
  { value: '6', label: 'Rubber tiles' },
  { value: '99', label: 'Other' },
];

const bathroomFlooringMaterialsOptions = [
  { value: '0', label: 'Polished concrete' },
  { value: '1', label: 'Glazed tiles' },
  { value: '2', label: 'Marble' },
  { value: '99', label: 'Other' },
];

const floorFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Ground Flooring Materials',
    name: 'groundFlooringMaterial',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: groundFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'groundFlooringMaterialOther',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Upper Flooring Materials',
    name: 'upperFlooringMaterial',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: upperFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'upperFlooringMaterialOther',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Bathroom Flooring Materials',
    name: 'bathroomFlooringMaterial',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: bathroomFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'bathroomFlooringMaterialOther',
    wrapperClassName: 'col-span-12',
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
  { value: '99', label: 'Other' },
];

const roofFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'roof',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: roofOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'roofOther',
    wrapperClassName: 'col-span-12',
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
  { value: '99', label: 'Other' },
];

const condoFacilityFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: '',
    name: 'condoFacility',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoFacilityOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'condoFacilityOther',
    wrapperClassName: 'col-span-12',
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
    type: 'checkbox-group',
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
    type: 'radio-group',
    label: '',
    name: 'inForestBoundary',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: InForestBoundaryOptions,
  },
  {
    type: 'text-input',
    label: 'Remark',
    name: 'inForestBoundaryRemark',
    wrapperClassName: 'col-span-12',
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

export default CondoDetailForm;
