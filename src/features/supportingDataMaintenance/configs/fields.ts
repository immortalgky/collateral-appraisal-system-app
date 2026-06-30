import { type FormField } from '@/shared/components/form';
import { APPRAISAL_COMPANY_PARAMS, DECISION_PARAMS } from '../constants/parameters';
import { REMARK_REQUIRED_DECISIONS } from '../constants/enums';
import type { TFunction } from 'i18next';

type T = TFunction<'supportingDataMaintenance'>;

export const getSupportingDataFields = (t: T): FormField[] => [
  {
    type: 'dropdown',
    label: t('fields.importChannel'),
    name: 'importChannel',
    group: 'ImportChannel',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'date-input',
    label: t('fields.importDate'),
    name: 'importDate',
    wrapperClassName: 'col-span-2',
    required: true,
    disableFutureDates: true,
    disableToday: false,
  },
  {
    type: 'dropdown',
    label: t('fields.sourceOfData'),
    name: 'sourceOfData',
    group: 'SourceofData',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: t('fields.description'),
    name: 'description',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
];

export const getDecisionFields = (t: T): FormField[] => [
  {
    type: 'dropdown',
    label: t('fields.decision'),
    name: 'decision',
    options: DECISION_PARAMS,
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'textarea',
    label: t('fields.remark'),
    name: 'remark',
    wrapperClassName: 'col-span-12',
    requiredWhen: {
      field: 'decision',
      is: [...REMARK_REQUIRED_DECISIONS],
      operator: 'in',
    },
    maxLength: 4000,
  },
];

export const getPropertyInformationFields = (t: T): FormField[] => [
  {
    type: 'text-input',
    label: t('fields.propertyName'),
    name: 'propertyName',
    wrapperClassName: 'col-span-3',
    maxLength: 100,
  },
  {
    type: 'dropdown',
    label: t('fields.collateralType'),
    name: 'collateralType',
    group: 'PropertyType',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'dropdown',
    label: t('fields.buildingType'),
    name: 'buildingType',
    group: 'BuildingType',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: t('fields.developer'),
    name: 'developer',
    wrapperClassName: 'col-span-3',
    maxLength: 50,
  },
  {
    type: 'text-input',
    label: t('fields.modelName'),
    name: 'modelName',
    wrapperClassName: 'col-span-3',
    maxLength: 50,
  },
  {
    type: 'number-input',
    label: t('fields.landArea'),
    name: 'landArea',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 2,
    maxIntegerDigits: 15,
  },
  {
    type: 'number-input',
    label: t('fields.usableArea'),
    name: 'usableArea',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 2,
    maxIntegerDigits: 15,
  },
];

export const getLocationDetailFields = (t: T): FormField[] => [
  {
    type: 'text-input',
    label: t('fields.projectName'),
    name: 'projectName',
    wrapperClassName: 'col-span-3',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: t('fields.roomFloor'),
    name: 'roomFloor',
    wrapperClassName: 'col-span-3',
    maxLength: 3,
  },
  {
    type: 'text-input',
    label: t('fields.houseNo'),
    name: 'houseNo',
    wrapperClassName: 'col-span-3',
    maxLength: 17,
  },
  {
    type: 'location-selector',
    label: t('fields.subDistrict'),
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    addressSource: 'title',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: t('fields.district'),
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: t('fields.province'),
    name: 'provinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: t('fields.postcode'),
    name: 'postcode',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    label: t('fields.latitude'),
    name: 'latitude',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    allowZero: true,
    min: -90,
    max: 90,
  },
  {
    type: 'number-input',
    label: t('fields.longitude'),
    name: 'longitude',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    allowZero: true,
    min: -180,
    max: 180,
  },
  {
    type: 'checkbox-group',
    label: t('fields.plotLocation'),
    name: 'plotLocationType',
    orientation: 'horizontal',
    group: 'PlotLocation',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: t('fields.other'),
    name: 'plotLocationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'plotLocationType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'plotLocationType', is: '99', operator: 'contains' },
    maxLength: 1000,
  },
];

export const getFinancialDetailsFields = (t: T): FormField[] => [
  {
    type: 'number-input',
    name: 'pricePerUnit',
    label: t('fields.pricePerUnit'),
    maxIntegerDigits: 15,
    decimalPlaces: 2,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    name: 'offeringPrice',
    label: t('fields.offeringPrice'),
    maxIntegerDigits: 15,
    decimalPlaces: 2,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    name: 'sellingPrice',
    label: t('fields.sellingPrice'),
    maxIntegerDigits: 15,
    decimalPlaces: 2,
    wrapperClassName: 'col-span-3',
  },
];

export const getContactInformationFields = (t: T): FormField[] => [
  {
    type: 'text-input',
    label: t('fields.phoneNo'),
    name: 'phoneNo',
    wrapperClassName: 'col-span-3',
    maxLength: 20,
  },
];

export const getSourceAndReferenceFields = (t: T): FormField[] => [
  {
    type: 'datetime-input',
    label: t('fields.informationDate'),
    name: 'informationDate',
    wrapperClassName: 'col-span-3',
    required: true,
    disableFutureDates: true,
    disableToday: false,
  },
  {
    type: 'text-input',
    label: t('fields.website'),
    name: 'website',
    wrapperClassName: 'col-span-3',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: t('fields.sourceUrl'),
    name: 'sourceUrl',
    wrapperClassName: 'col-span-3',
    maxLength: 1000,
  },
  {
    type: 'textarea',
    label: t('fields.remarkDetail'),
    name: 'remark',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
  },
];

export const getSupportingDataDetailFields = (t: T): FormField[] => [
  // Property information
  ...getPropertyInformationFields(t),
  // Location detail
  ...getLocationDetailFields(t),
  // Financial details
  ...getFinancialDetailsFields(t),
  // Contact information
  ...getContactInformationFields(t),
  // Source & reference
  ...getSourceAndReferenceFields(t),
];

// ── Legacy static exports kept for backward compat (labels in English) ──
// These are used by schemas/form.ts for buildFormSchema; labels are display-
// only in the form engine so they won't cause runtime errors if left in English.
// Components have been migrated to the get* factory functions above.
const identityT = ((key: string) => key.split('.').pop() ?? key) as unknown as T;

export const supportingDataFields = getSupportingDataFields(identityT);
export const decisionFields = getDecisionFields(identityT);
export const propertyInformationFields = getPropertyInformationFields(identityT);
export const locationDetailFields = getLocationDetailFields(identityT);
export const financialDetailsFields = getFinancialDetailsFields(identityT);
export const contactInformationFields = getContactInformationFields(identityT);
export const sourceAndReferenceFields = getSourceAndReferenceFields(identityT);
export const supportingDataDetailFields = getSupportingDataDetailFields(identityT);
