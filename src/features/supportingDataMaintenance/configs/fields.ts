import { type FormField } from '@/shared/components/form';
import { companies } from '../constants/parameters';

export const supportingDataFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Import Channel',
    name: 'importChannel',
    group: 'ImportChannel',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'date-input',
    label: 'Import Date',
    name: 'importDate',
    wrapperClassName: 'col-span-2',
    required: true,
    disableFutureDates: true,
    disableToday: false,
  },
  {
    type: 'dropdown',
    label: 'Source of Data',
    name: 'sourceOfData',
    group: 'SourceofData',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Appraisal Company',
    name: 'appraisalCompany',
    group: '',
    wrapperClassName: 'col-span-2',
    required: true,
    options: companies, // remove when group is ready
  },
  {
    type: 'text-input',
    label: 'Description',
    name: 'description',
    wrapperClassName: 'col-span-4',
  },
];

export const propertyInformationFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'dropdown',
    label: 'Collateral Type',
    name: 'collateralType',
    group: 'CollateralType',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Building Type',
    name: 'buildingType',
    group: 'BuildingType',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Developer',
    name: 'developer',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Model',
    name: 'modelName',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    label: 'Land Area (Sq.Wa)',
    name: 'landArea',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 2,
    maxIntegerDigits: 2,
  },
  {
    type: 'number-input',
    label: 'Usage Area (Sq.M)',
    name: 'usableArea',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 2,
    maxIntegerDigits: 3,
  },
];

export const locationDetailFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Project Name/ Village Name',
    name: 'projectName',
    wrapperClassName: 'col-span-3',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Room Floor',
    name: 'roomFloor',
    wrapperClassName: 'col-span-3',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'House Number',
    name: 'houseNo',
    wrapperClassName: 'col-span-3',
    maxLength: 100,
  },
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
    addressSource: 'title',
    wrapperClassName: 'col-span-3',
    required: true,
  },
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
    type: 'text-input',
    label: 'Postcode',
    name: 'postcode',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    wrapperClassName: 'col-span-3',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    allowZero: true,
    min: -90,
    max: 90,
  },
  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-3',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    allowZero: true,
    min: -180,
    max: 180,
  },
  {
    type: 'checkbox-group',
    label: 'Plot Location',
    name: 'plotLocationType',
    orientation: 'horizontal',
    group: 'PlotLocation',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: 'Other',
    name: 'plotLocationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'plotLocationType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'plotLocationType', is: '99', operator: 'contains' },
    maxLength: 100,
  },
];

export const financialDetailsFields: FormField[] = [
  {
    type: 'number-input',
    name: 'offeringPrice',
    label: 'Offering Price',
    maxIntegerDigits: 15,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    name: 'sellingPrice',
    label: 'Selling Price',
    maxIntegerDigits: 15,
    wrapperClassName: 'col-span-3',
  },
];

export const contactInformationFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Phone No',
    name: 'phoneNo',
    wrapperClassName: 'col-span-3',
    maxLength: 40,
  },
];

export const sourceAndReferenceFields: FormField[] = [
  {
    type: 'datetime-input',
    label: 'Information Date',
    name: 'informationDate',
    wrapperClassName: 'col-span-3',
    required: true,
    disableFutureDates: true,
    disableToday: false,
  },
  {
    type: 'text-input',
    label: 'Website',
    name: 'website',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Source URL',
    name: 'sourceUrl',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
  },
];

export const supportingDataDetailFields: FormField[] = [
  // Property information
  ...propertyInformationFields,
  // Location detail
  ...locationDetailFields,
  // Financial details
  ...financialDetailsFields,
  // Contact information
  ...contactInformationFields,
  // Source & reference
  ...sourceAndReferenceFields,
];
