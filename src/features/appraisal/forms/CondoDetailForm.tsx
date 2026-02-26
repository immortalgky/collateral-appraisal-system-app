import { type FormField, FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import type { ReactNode } from 'react';
import CondoAreaDetailForm from './CondoAreaDetailForm';

// SectionRow component for consistent section styling with icons
interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-5" />}
  </>
);

function CondoDetailForm() {
  return (
    <div className="grid grid-cols-5 gap-6">
      <SectionRow title="Condominium Information" icon="building">
        <FormFields fields={condoFields} />
      </SectionRow>

      <SectionRow title="Condominium Location" icon="map-location-dot">
        <FormFields fields={condoLocationFields} />
      </SectionRow>

      <SectionRow title="Decoration" icon="paint-roller">
        <FormFields fields={condoDecorationFields} />
      </SectionRow>

      <SectionRow title="Age/Height of the Building" icon="calendar-days">
        <FormFields fields={ageHeightCondoFields} />
      </SectionRow>

      <SectionRow title="Building Form" icon="building-columns">
        <FormFields fields={buildingFormFields} />
      </SectionRow>

      <SectionRow title="Construction Materials" icon="cubes">
        <FormFields fields={constructionMaterialsFormFields} />
      </SectionRow>

      <SectionRow title="Room Layout" icon="bed">
        <FormFields fields={condoRoomLayoutFormFields} />
      </SectionRow>

      <SectionRow title="Location View" icon="eye">
        <FormFields fields={locationViewFormFields} />
      </SectionRow>

      <SectionRow title="Floor" icon="layer-group">
        <FormFields fields={floorFormFields} />
      </SectionRow>

      <SectionRow title="Roof" icon="tent">
        <FormFields fields={roofFormFields} />
      </SectionRow>

      <SectionRow title="Area Details" icon="chart-area">
        <div className="col-span-12">
          <CondoAreaDetailForm name={'areaDetails'} />
        </div>
      </SectionRow>

      <SectionRow title="Expropriation" icon="file-invoice">
        <FormFields fields={expropriationFields} />
      </SectionRow>

      <SectionRow title="Condominium Facility" icon="dumbbell">
        <FormFields fields={condoFacilityFields} />
      </SectionRow>

      <SectionRow title="Environment" icon="tree">
        <FormFields fields={environmentFields} />
      </SectionRow>

      <SectionRow title="In Forest Boundary" icon="tree-city">
        <FormFields fields={inForestBoundaryFormFields} />
      </SectionRow>

      <SectionRow title="Remarks" icon="comment" isLast>
        <FormFields fields={remarkFormFields} />
      </SectionRow>
    </div>
  );
}

const condoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
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
    name: 'roomNumber',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Floor No',
    name: 'floorNumber',
    wrapperClassName: 'col-span-2',
    required: true,
    decimalPlaces: 0,
  },
  {
    type: 'text-input',
    label: 'Building No',
    name: 'buildingNumber',
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
    name: 'builtOnTitleNumber',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condominium Registration No',
    name: 'condoRegistrationNumber',
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
  // Location selector (sub-district autocomplete that populates district, province, postcode)
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    wrapperClassName: 'col-span-3',
    required: true,
  },

  // Display fields (autopopulated by location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    wrapperClassName: 'col-span-4',
    required: true,
    decimalPlaces: 6,
  },
  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-4',
    required: true,
    decimalPlaces: 6,
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
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerified',
    required: true,
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-4',
    requiredWhen: { field: 'isOwnerVerified', is: true },
    disableWhen: { field: 'isOwnerVerified', is: false },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
  },
  {
    type: 'radio-group',
    label: 'Condominium Conditions',
    name: 'buildingConditionType',
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
    type: 'boolean-toggle',
    label: 'Is Obligation',
    name: 'hasObligation',
    wrapperClassName: 'col-span-12',
    required: false,
    options: ['No obligations', 'Mortgage as security'],
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    required: false,
    showWhen: { field: 'hasObligation', is: true },
  },
  {
    type: 'boolean-toggle',
    label: 'Document Validation',
    name: 'isDocumentValidated',
    wrapperClassName: 'col-span-12',
    required: true,
    options: ['Not Consistent', 'Correctly Matched'],
  },
];

const condoLocationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'locationType',
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
    name: 'distanceFromMainRoad',
    wrapperClassName: 'col-span-3',
    required: false,
  },
  {
    type: 'number-input',
    label: 'Road Width',
    name: 'accessRoadWidth',
    wrapperClassName: 'col-span-3',
    required: false,
  },
  {
    type: 'number-input',
    label: 'Right of Way',
    name: 'rightOfWay',
    wrapperClassName: 'col-span-3',
    required: false,
    decimalPlaces: 0,
  },
  {
    type: 'radio-group',
    label: 'Road Surface',
    name: 'roadSurfaceType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'Concrete' },
      { value: '0', label: 'Soil' },
    ],
  },
  {
    type: 'checkbox-group',
    label: 'Public Utility',
    name: 'publicUtilityType',
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
    name: 'publicUtilityTypeOther',
    wrapperClassName: 'col-span-12',
    required: false,
    showWhen: { field: 'publicUtility', is: '99', operator: 'in' },
  },
];

const condoDecorationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'decorationType',
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
    name: 'decorationTypeOther',
    wrapperClassName: 'col-span-12',
    required: false,
    showWhen: { field: 'decoration', is: '99' },
  },
];

const ageHeightCondoFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Building Age (Years)',
    name: 'buildingAge',
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Total Number of Floors',
    name: 'numberOfFloors',
    wrapperClassName: 'col-span-4',
    required: true,
  },
];

const buildingFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'buildingFormType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: [
      { value: '0', label: 'Normal' },
      { value: '1', label: 'Good' },
      { value: '2', label: 'VeryGood' },
    ],
  },
];

const constructionMaterialsFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'constructionMaterialType',
    wrapperClassName: 'col-span-12',
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
    name: 'roomLayoutType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoRoomOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'roomLayoutTypeOther',
    wrapperClassName: 'col-span-12',
    required: false,
    showWhen: { field: 'roomLayoutType', is: '99' },
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
    name: 'locationViewType',
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
    name: 'groundFloorMaterialType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: groundFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'groundFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'groundFloorMaterial', is: '99' },
  },
  {
    type: 'radio-group',
    label: 'Upper Flooring Materials',
    name: 'upperFloorMaterialType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: upperFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'upperFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'upperFloorMaterial', is: '99' },
  },
  {
    type: 'radio-group',
    label: 'Bathroom Flooring Materials',
    name: 'bathroomFloorMaterialType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: bathroomFlooringMaterialsOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'bathroomFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'bathroomFloorMaterial', is: '99' },
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
    name: 'roofType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: roofOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'roofTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roomType', is: '99' },
  },
];

const expropriationFields: FormField[] = [
  {
    type: 'checkbox',
    label: 'Is Expropriated',
    name: 'isExpropriated',
    wrapperClassName: 'col-span-2',
    required: false,
  },
  {
    type: 'checkbox',
    label: 'In Line Expropriated',
    name: 'isInExpropriationLine',
    wrapperClassName: 'col-span-7',
    required: false,
  },
  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-3',
    required: false,
  },
  {
    type: 'textarea',
    label: 'Is Expropriated',
    name: 'expropriationRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isExpropriated', is: true },
  },
  {
    type: 'textarea',
    label: 'Is In Line Expropriated',
    name: 'expropriationLineRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isInExpropriationLine', is: true },
  },
];

const condoFacilityOptions = [
  { value: '0', label: 'Passenger Elevator' },
  { value: '1', label: 'Hallway' },
  { value: '2', label: 'Parking' },
  { value: '3', label: 'Fire Escape' },
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
    name: 'facilityType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: condoFacilityOptions,
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'facilityTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'facilityType', is: '99', operator: 'in' },
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

const environmentFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: '',
    name: 'environmentType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    options: environmentOptions,
  },
];

const inForestBoundaryFormFields: FormField[] = [
  {
    type: 'checkbox',
    label: 'Is In Forest Boundary',
    name: 'isForestBoundary',
    required: false,
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: 'Is In Forest Boundary',
    name: 'forestBoundaryRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isForestBoundary', is: true },
  },
];

const remarkFormFields: FormField[] = [
  {
    type: 'textarea',
    label: '',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default CondoDetailForm;
