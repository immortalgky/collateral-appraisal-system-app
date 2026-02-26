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
    group: 'LandOffice',
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
    group: 'CondoCondition',
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
    group: 'CondoLocation',
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
    group: 'Condo_RoadSurface',
  },
  {
    type: 'checkbox-group',
    label: 'Public Utility',
    name: 'publicUtilityType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    group: 'Condo_PublicUtility',
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
    group: 'Decoration',
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
    group: 'BuildingForm',
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
    group: 'ConstructionMaterials',
  },
];

const condoRoomLayoutFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'roomLayoutType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    group: 'RoomLayout',
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

const locationViewFormFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: '',
    name: 'locationViewType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    group: 'LocationView',
  },
];

const floorFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Ground Flooring Materials',
    name: 'groundFloorMaterialType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    group: 'GroundFlooringMaterials',
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
    group: 'UpperFlooringMaterials',
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
    group: 'BathroomFlooringMaterials',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'bathroomFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'bathroomFloorMaterial', is: '99' },
  },
];

const roofFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'roofType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    group: 'Condo_Roof',
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

const condoFacilityFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: '',
    name: 'facilityType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    group: 'Facilities',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'facilityTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'facilityType', is: '99', operator: 'in' },
  },
];

const environmentFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: '',
    name: 'environmentType',
    wrapperClassName: 'col-span-12',
    required: false,
    orientation: 'horizontal',
    group: 'Environment',
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
