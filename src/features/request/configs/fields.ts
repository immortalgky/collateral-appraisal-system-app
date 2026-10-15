import type { TFunction } from 'i18next';
import type {
  FieldArrayField,
  FieldConditions,
  FormField,
  NumberInputField,
} from '@/shared/components/form';
import type { ListBoxItem } from '@/shared/components';
import { inScreenOrder } from '@/features/appraisal/components/titleScreenOrder';
import { isBlankRow } from '../components/tables/formTableUtils';
import { CUSTOMER_COLUMNS, PROPERTY_COLUMNS } from './tableColumns';
import {
  LAND_CODES,
  LEASE_LAND_CODE,
  mapCollateral,
  NO_BUILDING_PROPERTY_TYPES,
} from '@features/request/data/mapCollateral.ts';
import {
  AERIAL_TITLE_TYPES,
  LAND_PARCEL_TITLE_TYPES,
  RAWANG_TITLE_TYPES,
  SURVEY_TITLE_TYPES,
} from '@/shared/constants/titleTypes';

// =============================================================================
// Utility
// =============================================================================

/** Prefix all field names for schema building (short → full dotted path). */
export function prefixFields(fields: FormField[], prefix: string): FormField[] {
  return fields.map(f => ({ ...f, name: `${prefix}.${f.name}` }));
}

// =============================================================================
// Request fields (from RequestForm.tsx)
// Uses full dotted paths — no namePrefix at render time.
// =============================================================================

// Purpose codes that make this request a Construction Inspection
export const CI_PURPOSES = ['06', '11'];
const FACILITIE_LIMIT_AMOUNT_REQUIRED = ['01', '02', '03', '04', '12', '13', '14'];

export const PREV_APP_NO_REQUIRED = ['02', '03', '04', '05', '06', '08', '09', '11', '12', '13'];

/**
 * When the prior appraisal is asked for: a purpose that uses one, on a request not yet submitted. A
 * submitted request (a route-back included) has it locked, so it cannot be asked for what it cannot be
 * given. `meta.isSubmitted` is a value of the form that is never sent (the page sets it on load).
 */
export const PRIOR_REQUIRED_WHEN: FieldConditions = {
  conditions: [
    { field: 'purpose', is: PREV_APP_NO_REQUIRED, operator: 'in' },
    { field: 'meta.isSubmitted', is: true, operator: 'notEquals' },
  ],
  match: 'all',
};

/** The facility limit is the sum of the additional and the previous limit. */
export const FACILITY_SUM_PURPOSE = '02';
/** Purposes that carry no facility limit at all. */
export const NO_FACILITY_PURPOSES = ['07', '08'];

/** Purpose, priority and "customer brings the appraisal book". */
export function makePurposeFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.appraisalPurpose'),
      name: 'purpose',
      group: 'AppraisalPurpose',
      wrapperClassName: 'col-span-6',
      required: true,
      filterOptions: { type: 'isActive', values: true },
    },
    {
      type: 'string-toggle',
      label: t('fields.priority'),
      name: 'priority',
      options: [
        { name: 'Normal', label: t('fields.priorityNormal') },
        { name: 'High', label: t('fields.priorityHigh') },
      ],
      wrapperClassName: 'col-span-3',
    },
    {
      type: 'boolean-toggle',
      label: t('fields.hasAppraisalBook'),
      name: 'detail.hasAppraisalBook',
      // Toggle labels: the stored value is a boolean.
      options: [t('requestForm.no'), t('requestForm.yes')],
      wrapperClassName: 'col-span-3',
    },
  ];
}

/** Channel, banking segment and loan application number: shown for every purpose. */
export function makeChannelFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.channel'),
      name: 'channel',
      group: 'Channel',
      wrapperClassName: 'col-span-3',
      required: true,
    },
    {
      type: 'dropdown',
      label: t('fields.bankingSegment'),
      name: 'detail.loanDetail.bankingSegment',
      group: 'BankingSegment',
      wrapperClassName: 'col-span-3',
      required: true,
    },
    {
      type: 'text-input',
      label: t('fields.loanApplicationNo'),
      name: 'detail.loanDetail.loanApplicationNumber',
      wrapperClassName: 'col-span-3',
      requiredWhen: { field: 'channel', is: ['LOS', 'CLS'], operator: 'in' },
      maxLength: 20,
    },
  ];
}

/**
 * The three limit inputs. RequestForm renders only the ones the purpose uses; a limit it leaves out
 * keeps its value (the disableWhen rules still describe which are inactive, for the schema).
 */
export function makeLimitFields(t: TFunction<'request'>): {
  facility: NumberInputField;
  additional: NumberInputField;
  previous: NumberInputField;
} {
  return {
    facility: {
      type: 'number-input',
      label: t('fields.facilityLimit'),
      name: 'detail.loanDetail.facilityLimit',
      wrapperClassName: 'col-span-3',
      maxIntegerDigits: 15,
      required: true,
      disableWhen: {
        field: 'purpose',
        is: [FACILITY_SUM_PURPOSE, ...NO_FACILITY_PURPOSES],
        operator: 'in',
      },
      requiredWhen: { field: 'purpose', is: FACILITIE_LIMIT_AMOUNT_REQUIRED, operator: 'in' },
    },
    additional: {
      type: 'number-input',
      label: t('fields.additionalFacilityLimit'),
      name: 'detail.loanDetail.additionalFacilityLimit',
      wrapperClassName: 'col-span-3',
      maxIntegerDigits: 15,
      requiredWhen: { field: 'purpose', is: FACILITY_SUM_PURPOSE },
      disableWhen: { field: 'purpose', is: NO_FACILITY_PURPOSES, operator: 'in' },
    },
    previous: {
      type: 'number-input',
      label: t('fields.previousFacilityLimit'),
      name: 'detail.loanDetail.previousFacilityLimit',
      wrapperClassName: 'col-span-3',
      maxIntegerDigits: 15,
      requiredWhen: { field: 'purpose', is: FACILITY_SUM_PURPOSE },
      disableWhen: { field: 'purpose', is: NO_FACILITY_PURPOSES, operator: 'in' },
    },
  };
}

/**
 * Every field of the request section, for its labels and rules (the missing-fields list reads them
 * by name). RequestForm renders the pieces itself: the prior appraisal is PriorAppraisalBlock, and
 * the limits depend on the purpose. Full dotted paths, no namePrefix at render time.
 */
export function makeRequestFields(t: TFunction<'request'>): FormField[] {
  const { facility, additional, previous } = makeLimitFields(t);
  return [
    ...makePurposeFields(t),
    {
      type: 'appraisal-selector',
      label: t('fields.prevAppraisalReportNo'),
      name: 'detail.prevAppraisalReportNo',
      idField: 'detail.prevAppraisalId',
      valueField: 'detail.prevAppraisalValue',
      dateField: 'detail.prevAppraisalDate',
      requiredWhen: PRIOR_REQUIRED_WHEN,
      disableWhen: { field: 'purpose', is: '07' },
    },
    ...makeChannelFields(t),
    facility,
    additional,
    previous,
  ];
}

// =============================================================================
// Address fields (from AddressForm.tsx)
// Short names — rendered with namePrefix="detail.address".
// =============================================================================

// Below ~640px of the card's own width every field takes a full row (the form is a `@container`).
const STACK = '@max-[45.7143rem]:col-span-12';

export function makeAddressFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'text-input',
      label: t('fields.houseNo'),
      name: 'houseNumber',
      wrapperClassName: `col-span-2 ${STACK}`,
      maxLength: 10,
      required: true,
    },
    {
      type: 'text-input',
      label: t('fields.villageBuildingName'),
      name: 'projectName',
      wrapperClassName: `col-span-4 ${STACK}`,
      maxLength: 100,
    },
    {
      type: 'text-input',
      label: t('fields.moo'),
      name: 'moo',
      wrapperClassName: `col-span-2 ${STACK}`,
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.soi'),
      name: 'soi',
      wrapperClassName: `col-span-2 ${STACK}`,
      maxLength: 100,
    },
    {
      type: 'text-input',
      label: t('fields.road'),
      name: 'road',
      wrapperClassName: `col-span-2 ${STACK}`,
      maxLength: 100,
    },
    {
      type: 'location-selector',
      label: t('fields.subDistrict'),
      name: 'subDistrict',
      districtField: 'detail.address.district',
      districtNameField: 'detail.address.districtName',
      provinceField: 'detail.address.province',
      provinceNameField: 'detail.address.provinceName',
      postcodeField: 'detail.address.postcode',
      subDistrictNameField: 'detail.address.subDistrictName',
      // Administrative address -> DOPA master (กรมการปกครอง), not the Title (deed) master.
      addressSource: 'dopa',
      wrapperClassName: `col-span-5 ${STACK}`,
      required: true,
    },
    // District, province and postcode are not fields here: LocationSelector sets them and AddressForm
    // shows them as one read-only line.
  ];
}

// =============================================================================
// Contact fields (from AddressForm.tsx)
// Short names — rendered with namePrefix="detail.contact". The contact person sits with the
// appointment; the dealer code stays under the property location.
// =============================================================================

export function makeContactPersonFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'text-input',
      label: t('fields.contactPersonName'),
      name: 'contactPersonName',
      wrapperClassName: 'col-span-3',
      required: true,
      maxLength: 100,
    },
    {
      type: 'text-input',
      label: t('fields.contactPersonPhone'),
      name: 'contactPersonPhone',
      wrapperClassName: 'col-span-3',
      required: true,
      maxLength: 40,
    },
  ];
}

export function makeDealerFields(
  t: TFunction<'request'>,
  dealerOptions: ListBoxItem[] = [],
): FormField[] {
  return [
    {
      type: 'parameter-search',
      label: t('fields.dealerCode'),
      name: 'dealerCode',
      options: dealerOptions,
    },
  ];
}

export function makeContactFields(
  t: TFunction<'request'>,
  dealerOptions: ListBoxItem[] = [],
): FormField[] {
  return [...makeContactPersonFields(t), ...makeDealerFields(t, dealerOptions)];
}

// =============================================================================
// Appointment and Fee fields (from AppointmentAndFeeForm.tsx)
// Uses full dotted paths — no namePrefix at render time. Each group sits in a 6-column grid.
// =============================================================================

const BANK_ABSORB = ['04'];

export function makeAppointmentFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'datetime-input',
      label: t('fields.appointmentDateTime'),
      name: 'detail.appointment.appointmentDateTime',
      wrapperClassName: 'col-span-6',
      required: true,
      disablePastDates: true,
      disableToday: true,
    },
    {
      type: 'textarea',
      label: t('fields.appointmentLocation'),
      name: 'detail.appointment.appointmentLocation',
      wrapperClassName: 'col-span-6',
      maxLength: 4000,
      showCharCount: true,
    },
  ];
}

export function makeFeeFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.feePaymentType'),
      name: 'detail.fee.feePaymentType',
      group: 'FeePaymentMethod',
      wrapperClassName: 'col-span-6',
      required: true,
    },
    {
      type: 'number-input',
      label: t('fields.bankAbsorbAmount'),
      name: 'detail.fee.absorbedAmount',
      wrapperClassName: 'col-span-6',
      maxIntegerDigits: 15,
      requiredWhen: { field: 'detail.fee.feePaymentType', is: BANK_ABSORB, operator: 'in' },
      showWhen: { field: 'detail.fee.feePaymentType', is: [...BANK_ABSORB, '99'], operator: 'in' },
    },
    {
      type: 'textarea',
      label: t('fields.feeRemark'),
      name: 'detail.fee.feeNotes',
      wrapperClassName: 'col-span-6',
      requiredWhen: { field: 'detail.fee.feePaymentType', is: '99' },
    },
  ];
}

export function makeAppointmentAndFeeFields(t: TFunction<'request'>): FormField[] {
  return [...makeFeeFields(t), ...makeAppointmentFields(t)];
}

// =============================================================================
// Schema-only field-array configs
// CustomersForm/PropertiesForm use FormTable for rendering, but we need
// field-array configs for schema generation.
// =============================================================================

// A table starts with one empty row that is never sent: it is not validated and does not count
const blankCustomer = (row: unknown) => isBlankRow(row, CUSTOMER_COLUMNS);
const blankProperty = (row: unknown) => isBlankRow(row, PROPERTY_COLUMNS);

export function makeCustomersFieldConfig(t: TFunction<'request'>): FieldArrayField {
  return {
    type: 'field-array',
    name: 'customers',
    required: true,
    minItems: 1,
    skipRow: blankCustomer,
    fields: [
      {
        type: 'text-input',
        name: 'name',
        label: t('fields.customerName'),
        required: true,
        maxLength: 260,
      },
      {
        type: 'text-input',
        name: 'contactNumber',
        label: t('fields.contactNumber'),
        maxLength: 20,
      },
    ],
  };
}

export function makePropertiesFieldConfig(t: TFunction<'request'>): FieldArrayField {
  return {
    type: 'field-array',
    name: 'properties',
    required: true,
    minItems: 1,
    skipRow: blankProperty,
    fields: [
      {
        type: 'dropdown',
        name: 'propertyType',
        label: t('fields.propertyType'),
        group: 'PropertyType',
        required: true,
      },
      {
        type: 'dropdown',
        name: 'buildingType',
        label: t('fields.buildingType'),
        group: 'BuildingType',
        requiredWhen: {
          field: 'propertyType',
          is: NO_BUILDING_PROPERTY_TYPES,
          operator: 'notIn',
        },
      },
      {
        type: 'number-input',
        name: 'sellingPrice',
        label: t('fields.sellingPrice'),
        maxIntegerDigits: 15,
      },
    ],
  };
}

// =============================================================================
// Title field configs
// =============================================================================

// Collateral type groups for conditional validation (new 33-code parameter table)
// Land family: codes that capture land area / title deed info
const LAND_TYPES = [
  '01',
  '02',
  '03',
  '04',
  '09',
  '13',
  '14',
  '17',
  '19',
  '21',
  '23',
  '24',
  '25',
  '26',
  '27',
  '29',
  '30',
  '31',
  '32',
];
// Codes that require a TitleNumber (land + lease types)
const TITLE_NUMBER_TYPES = [
  '01',
  '02',
  '03',
  '04',
  '09',
  '13',
  '14',
  '17',
  '19',
  '21',
  '23',
  '24',
  '25',
  '26',
  '27',
  '29',
  '30',
  '31',
  '32',
];
// Codes that capture owner name (all non-movable types)
const OWNER_NAME_TYPES = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '33',
];
// Codes that capture building type / usable area / number of buildings
const BUILDING_REQUIRED_TYPES = [
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '09',
  '15',
  '16',
  '18',
  '20',
  '22',
  '23',
  '24',
  '25',
  '30',
  '31',
  '32',
];
// Condo-specific codes (room/floor/building number, condo name)
export const CONDO_TYPES = ['08', '28', '33'];

/** A land title's number: the appraisal's LandTitles.TitleNumber column. A condominium's list gets 500. */
export const LAND_TITLE_NUMBER_MAX = 200;
export const CONDO_TITLE_NUMBER_MAX = 500;

const BUILDING_TYPE = ['05', '06', '07', '15', '16', '18', '20', '22'];

// --- Rendering configs (used by sub-form components for <FormFields>) ---

export function makeTitleInfoFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.collateralType'),
      name: 'collateralType',
      group: 'CollateralType',
      wrapperClassName: 'col-span-3',
      required: true,
      filterOptions: {
        type: 'dynamic-array',
        field: 'properties',
        itemField: 'propertyType',
        map: mapCollateral,
      },
    },
    {
      type: 'boolean-toggle',
      label: t('fields.prevAppraisalCasStatus'),
      name: 'collateralStatus',
      options: ['New', 'Existing'],
      wrapperClassName: 'col-span-3',
      disabled: true,
    },
  ];
}

export function makeTitleLandFields(t: TFunction<'request'>): FormField[] {
  // Laid out in the land page's on-screen order (appraisal/components/titleScreenOrder).
  return inScreenOrder([
    {
      type: 'dropdown',
      label: t('fields.titleType'),
      name: 'titleType',
      group: 'DeedType',
      wrapperClassName: 'col-span-2',
      requiredWhen: {
        field: 'collateralType',
        is: [...LAND_TYPES, ...CONDO_TYPES],
        operator: 'in',
      },
    },
    {
      type: 'text-input',
      label: t('fields.titleNumber'),
      name: 'titleNumber',
      wrapperClassName: 'col-span-2',
      maxLength: LAND_TITLE_NUMBER_MAX,
      requiredWhen: {
        field: 'collateralType',
        is: [...TITLE_NUMBER_TYPES, ...CONDO_TYPES],
        operator: 'in',
      },
    },
    {
      type: 'text-input',
      label: t('fields.bookNumber'),
      name: 'bookNumber',
      wrapperClassName: 'col-span-1',
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.pageNumber'),
      name: 'pageNumber',
      wrapperClassName: 'col-span-1',
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.rawang'),
      name: 'rawang',
      wrapperClassName: 'col-span-2',
      maxLength: 30,
      showWhen: { field: 'titleType', is: RAWANG_TITLE_TYPES, operator: 'in' },
    },
    {
      type: 'text-input',
      label: t('fields.landParcelNumber'),
      name: 'landParcelNumber',
      wrapperClassName: 'col-span-2',
      maxLength: 10,
      showWhen: { field: 'titleType', is: LAND_PARCEL_TITLE_TYPES, operator: 'in' },
    },
    {
      type: 'text-input',
      label: t('fields.surveyNumber'),
      name: 'surveyNumber',
      wrapperClassName: 'col-span-2',
      maxLength: 10,
      showWhen: { field: 'titleType', is: SURVEY_TITLE_TYPES, operator: 'in' },
    },
    {
      type: 'text-input',
      label: t('fields.mapSheetNumber'),
      name: 'mapSheetNumber',
      wrapperClassName: 'col-span-2',
      maxLength: 10,
      showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
    },
    {
      type: 'text-input',
      label: t('fields.aerialMapName'),
      name: 'aerialMapName',
      wrapperClassName: 'col-span-2',
      maxLength: 100,
      showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
    },
    {
      type: 'text-input',
      label: t('fields.aerialMapNumber'),
      name: 'aerialMapNumber',
      wrapperClassName: 'col-span-2',
      maxLength: 50,
      showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
    },
    {
      type: 'number-input',
      label: t('fields.rai'),
      name: 'areaRai',
      wrapperClassName: 'col-span-2',
      decimalPlaces: 0,
      maxIntegerDigits: 5,
    },
    {
      type: 'number-input',
      label: t('fields.ngan'),
      name: 'areaNgan',
      wrapperClassName: 'col-span-2',
      decimalPlaces: 0,
      maxIntegerDigits: 1,
      max: 3,
    },
    {
      type: 'number-input',
      label: t('fields.sqWa'),
      name: 'areaSquareWa',
      wrapperClassName: 'col-span-2',
      requiredWhen: {
        conditions: [
          { field: 'areaRai', operator: 'isEmpty' },
          { field: 'areaNgan', operator: 'isEmpty' },
          { field: 'collateralType', is: LAND_TYPES, operator: 'in' },
        ],
        match: 'all',
      },
      decimalPlaces: 2,
      maxIntegerDigits: 2,
    },
    {
      type: 'text-input',
      label: t('fields.owner'),
      name: 'ownerName',
      wrapperClassName: 'col-span-6',
      maxLength: 100,
      requiredWhen: { field: 'collateralType', is: OWNER_NAME_TYPES, operator: 'in' },
    },
    {
      type: 'textarea',
      label: t('fields.titleDetail'),
      name: 'notes',
      wrapperClassName: 'col-span-6',
      maxLength: 200,
      requiredWhen: {
        field: 'collateralType',
        is: [...LAND_TYPES, ...CONDO_TYPES],
        operator: 'in',
      },
    },
  ]);
}

export function makeTitleBuildingFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.buildingType'),
      name: 'buildingType',
      group: 'BuildingType',
      wrapperClassName: 'col-span-3',
      requiredWhen: { field: 'collateralType', operator: 'in', is: BUILDING_REQUIRED_TYPES },
    },
    {
      type: 'number-input',
      label: t('fields.usageArea'),
      name: 'usableArea',
      wrapperClassName: 'col-span-3',
      requiredWhen: {
        field: 'collateralType',
        operator: 'in',
        is: [...CONDO_TYPES],
      },
      decimalPlaces: 2,
      maxIntegerDigits: 3,
    },
    {
      type: 'text-input',
      label: t('fields.owner'),
      name: 'ownerName',
      wrapperClassName: 'col-span-3',
      maxLength: 100,
      requiredWhen: { field: 'collateralType', is: OWNER_NAME_TYPES, operator: 'in' },
      showWhen: {
        field: 'collateralType',
        is: BUILDING_TYPE,
        operator: 'in',
      },
    },
    {
      type: 'number-input',
      label: t('fields.numberOfBuilding'),
      name: 'numberOfBuilding',
      wrapperClassName: 'col-span-3',
      decimalPlaces: 0,
      maxIntegerDigits: 5,
    },
  ];
}

export function makeTitleBuildingFieldsAlt(t: TFunction<'request'>): FormField[] {
  return makeTitleBuildingFields(t).map(field => ({
    ...field,
    wrapperClassName: 'col-span-2',
  }));
}

export function makeTitleCondoFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.titleType'),
      name: 'titleType',
      group: 'DeedType',
      wrapperClassName: 'col-span-2',
      requiredWhen: {
        field: 'collateralType',
        is: [...LAND_TYPES, ...CONDO_TYPES],
        operator: 'in',
      },
    },
    {
      type: 'text-input',
      label: t('fields.titleNumber'),
      name: 'titleNumber',
      wrapperClassName: 'col-span-4',
      maxLength: CONDO_TITLE_NUMBER_MAX,
      requiredWhen: {
        field: 'collateralType',
        is: [...TITLE_NUMBER_TYPES, ...CONDO_TYPES],
        operator: 'in',
      },
    },
    {
      type: 'text-input',
      label: t('fields.roomNumber'),
      name: 'roomNumber',
      wrapperClassName: 'col-span-1',
      requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.floorNumber'),
      name: 'floorNumber',
      wrapperClassName: 'col-span-1',
      requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.buildingNumber'),
      name: 'buildingNumber',
      wrapperClassName: 'col-span-2',
      requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
      maxLength: 30,
    },
    {
      type: 'text-input',
      label: t('fields.condoRegistrationNumber'),
      name: 'condoRegistrationNumber',
      wrapperClassName: 'col-span-2',
      requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.condoName'),
      name: 'condoName',
      wrapperClassName: 'col-span-4',
      required: true,
      requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
      maxLength: 100,
    },
    {
      type: 'number-input',
      label: t('fields.usageAreaSqM'),
      name: 'usableArea',
      wrapperClassName: 'col-span-2',
      requiredWhen: {
        field: 'collateralType',
        operator: 'in',
        is: [...CONDO_TYPES],
      },
      decimalPlaces: 2,
      maxIntegerDigits: 3,
    },
    {
      type: 'text-input',
      label: t('fields.owner'),
      name: 'ownerName',
      wrapperClassName: 'col-span-6',
      maxLength: 100,
      requiredWhen: { field: 'collateralType', is: OWNER_NAME_TYPES, operator: 'in' },
    },
    {
      type: 'textarea',
      label: t('fields.titleDetail'),
      name: 'notes',
      wrapperClassName: 'col-span-6',
      maxLength: 200,
      requiredWhen: {
        field: 'collateralType',
        is: [...LAND_TYPES, ...CONDO_TYPES],
        operator: 'in',
      },
    },
  ];
}

export function makeTitleVehicleFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.vehicleType'),
      name: 'vehicleType',
      group: 'VehicleType',
      wrapperClassName: 'col-span-3',
      required: true,
      requiredWhen: { field: 'collateralType', is: '10' },
    },
    {
      type: 'text-input',
      label: t('fields.vehicleRegistrationNumber'),
      name: 'vehicleRegistrationNumber',
      wrapperClassName: 'col-span-3',
      requiredWhen: { field: 'collateralType', is: '10' },
      maxLength: 50,
    },
    {
      type: 'text-input',
      label: t('fields.chassisNumber'),
      name: 'vin',
      wrapperClassName: 'col-span-3',
      required: true,
      requiredWhen: { field: 'collateralType', is: '10' },
      maxLength: 50,
    },
    {
      type: 'text-input',
      label: t('fields.licensePlateNumber'),
      name: 'licensePlateNumber',
      wrapperClassName: 'col-span-3',
      maxLength: 50,
    },
    {
      type: 'textarea',
      label: t('fields.appointmentLocationVehicle'),
      name: 'vehicleLocation',
      wrapperClassName: 'col-span-6',
      maxLength: 200,
    },
  ];
}

export function makeTitleVesselFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.vesselType'),
      name: 'vesselType',
      group: 'VesselType',
      wrapperClassName: 'col-span-3',
    },
    {
      type: 'text-input',
      label: t('fields.hullNumber'),
      name: 'hin',
      wrapperClassName: 'col-span-3',
      required: true,
      requiredWhen: { field: 'collateralType', is: '12' },
      maxLength: 50,
    },
    {
      type: 'text-input',
      label: t('fields.vesselRegistrationNumber'),
      name: 'vesselRegistrationNumber',
      wrapperClassName: 'col-span-3',
      maxLength: 50,
    },
    {
      type: 'textarea',
      label: t('fields.appointmentLocationVessel'),
      name: 'vesselLocation',
      wrapperClassName: 'col-span-6',
      maxLength: 200,
    },
  ];
}

export function makeTitleMachineFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'dropdown',
      label: t('fields.machineStatus'),
      name: 'installationStatus',
      group: 'MachineStatus',
      wrapperClassName: 'col-span-3',
      required: true,
      requiredWhen: { field: 'collateralType', is: '11' },
    },
    {
      type: 'dropdown',
      label: t('fields.machineType'),
      name: 'machineType',
      group: 'MachineType',
      wrapperClassName: 'col-span-3',
      required: true,
      requiredWhen: { field: 'collateralType', is: '11' },
    },
    {
      type: 'boolean-toggle',
      label: t('fields.registrationStatus'),
      name: 'registrationStatus',
      options: [
        t('fields.registrationStatusUnregistered'),
        t('fields.registrationStatusRegistered'),
      ],
      wrapperClassName: 'col-span-3',
      required: true,
      requiredWhen: { field: 'collateralType', is: '11' },
    },
    {
      type: 'text-input',
      label: t('fields.registrationNo'),
      name: 'registrationNumber',
      wrapperClassName: 'col-span-3',
      requiredWhen: {
        conditions: [
          { field: 'installationStatus', is: '1' },
          { field: 'registrationStatus', is: true },
        ],
        match: 'all',
      },
      maxLength: 50,
    },
    {
      type: 'text-input',
      label: t('fields.invoiceNo'),
      name: 'invoiceNumber',
      wrapperClassName: 'col-span-3',
      required: true,
      requiredWhen: { field: 'installationStatus', is: '2' },
      maxLength: 20,
    },
    {
      type: 'number-input',
      label: t('fields.noOfMachines'),
      name: 'numberOfMachine',
      wrapperClassName: 'col-span-3',
      required: true,
      requiredWhen: { field: 'collateralType', is: '11' },
      decimalPlaces: 0,
      maxIntegerDigits: 5,
    },
  ];
}

export function makeTitleAddressFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'text-input',
      label: t('fields.houseNumber'),
      name: 'titleAddress.houseNumber',
      wrapperClassName: 'col-span-2',
      requiredWhen: {
        field: 'collateralType',
        is: [...LAND_CODES, ...LEASE_LAND_CODE],
        operator: 'notIn',
      },
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.villageBuildingNameFull'),
      name: 'titleAddress.projectName',
      wrapperClassName: 'col-span-4',
      maxLength: 100,
    },
    {
      type: 'text-input',
      label: t('fields.moo'),
      name: 'titleAddress.moo',
      wrapperClassName: 'col-span-2',
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.soi'),
      name: 'titleAddress.soi',
      wrapperClassName: 'col-span-2',
      maxLength: 100,
    },
    {
      type: 'text-input',
      label: t('fields.road'),
      name: 'titleAddress.road',
      wrapperClassName: 'col-span-2',
      maxLength: 100,
    },
    {
      type: 'location-selector',
      label: t('fields.subDistrict'),
      name: 'titleAddress.subDistrict',
      districtField: 'titleAddress.district',
      districtNameField: 'titleAddress.districtName',
      provinceField: 'titleAddress.province',
      provinceNameField: 'titleAddress.provinceName',
      postcodeField: 'titleAddress.postcode',
      subDistrictNameField: 'titleAddress.subDistrictName',
      addressSource: 'title',
      wrapperClassName: 'col-span-2',
      required: true,
    },
    {
      type: 'text-input',
      label: t('fields.district'),
      name: 'titleAddress.district',
      wrapperClassName: 'col-span-3',
      hide: true,
    },
    {
      type: 'text-input',
      label: t('fields.district'),
      name: 'titleAddress.districtName',
      disabled: true,
      wrapperClassName: 'col-span-2',
    },
    {
      type: 'text-input',
      label: t('fields.province'),
      name: 'titleAddress.province',
      wrapperClassName: 'col-span-3',
      hide: true,
    },
    {
      type: 'text-input',
      label: t('fields.province'),
      name: 'titleAddress.provinceName',
      disabled: true,
      wrapperClassName: 'col-span-2',
    },
    {
      type: 'text-input',
      label: t('fields.postcode'),
      name: 'titleAddress.postcode',
      disabled: true,
      wrapperClassName: 'col-span-2',
      hide: true,
    },
  ];
}

export function makeDopaAddressFields(t: TFunction<'request'>): FormField[] {
  return [
    {
      type: 'text-input',
      label: t('fields.houseNumber'),
      name: 'dopaAddress.houseNumber',
      wrapperClassName: 'col-span-2',
      maxLength: 10,
      requiredWhen: {
        field: 'collateralType',
        is: [...LAND_CODES, ...LEASE_LAND_CODE],
        operator: 'notIn',
      },
    },
    {
      type: 'text-input',
      label: t('fields.villageBuildingNameFull'),
      name: 'dopaAddress.projectName',
      wrapperClassName: 'col-span-4',
      maxLength: 100,
    },
    {
      type: 'text-input',
      label: t('fields.moo'),
      name: 'dopaAddress.moo',
      wrapperClassName: 'col-span-2',
      maxLength: 10,
    },
    {
      type: 'text-input',
      label: t('fields.soi'),
      name: 'dopaAddress.soi',
      wrapperClassName: 'col-span-2',
      maxLength: 100,
    },
    {
      type: 'text-input',
      label: t('fields.road'),
      name: 'dopaAddress.road',
      wrapperClassName: 'col-span-2',
      maxLength: 100,
    },
    {
      type: 'location-selector',
      label: t('fields.subDistrict'),
      name: 'dopaAddress.subDistrict',
      districtField: 'dopaAddress.district',
      districtNameField: 'dopaAddress.districtName',
      provinceField: 'dopaAddress.province',
      provinceNameField: 'dopaAddress.provinceName',
      postcodeField: 'dopaAddress.postcode',
      subDistrictNameField: 'dopaAddress.subDistrictName',
      addressSource: 'dopa',
      wrapperClassName: 'col-span-2',
      required: true,
    },
    {
      type: 'text-input',
      label: t('fields.district'),
      name: 'dopaAddress.district',
      wrapperClassName: 'col-span-2',
      hide: true,
    },
    {
      type: 'text-input',
      label: t('fields.district'),
      name: 'dopaAddress.districtName',
      disabled: true,
      wrapperClassName: 'col-span-2',
    },
    {
      type: 'text-input',
      label: t('fields.district'),
      name: 'dopaAddress.province',
      wrapperClassName: 'col-span-2',
      hide: true,
    },
    {
      type: 'text-input',
      label: t('fields.province'),
      name: 'dopaAddress.provinceName',
      disabled: true,
      wrapperClassName: 'col-span-2',
    },
    {
      type: 'text-input',
      label: t('fields.postcode'),
      name: 'dopaAddress.postcode',
      disabled: true,
      wrapperClassName: 'col-span-2',
      hide: true,
    },
  ];
}

// --- Schema-only config (drives validation via buildFormSchema in form.ts) ---
// NOT added to allRequestFields — used directly by form.ts for title element schema.
// Rendering configs above now includes requiredWhen directly, so no stripping needed.
// wrapperClassName is harmless in the schema (ignored by buildZodTypeForField).
// When requiredWhen is present, buildZodTypeForField ignores `required`.

/** Keep only the first occurrence of each field name (handles cross-config overlaps). */
function deduplicateByName(fields: FormField[]): FormField[] {
  const seen = new Set<string>();
  return fields.filter(f => {
    if (seen.has(f.name)) return false;
    seen.add(f.name);
    return true;
  });
}

// Static fallback arrays for schema building (schema doesn't need translated labels)
// These are used in schemas/form.ts where no t() is available at module level.
// Labels are irrelevant for schema validation — only `name`, `required`, `requiredWhen` matter.

/** Produce a static (untranslated) field array suitable for schema building only. */
function staticLabel(label: string): string {
  return label;
}
const _st = staticLabel;

export const titleInfoFields: FormField[] = [
  {
    type: 'dropdown',
    label: _st('Collateral Type'),
    name: 'collateralType',
    group: 'CollateralType',
    wrapperClassName: 'col-span-3',
    required: true,
    filterOptions: {
      type: 'dynamic-array',
      field: 'properties',
      itemField: 'propertyType',
      map: mapCollateral,
    },
  },
  {
    type: 'boolean-toggle',
    label: _st('Previous Appraisal Report No / CAS Status'),
    name: 'collateralStatus',
    options: ['New', 'Existing'],
    wrapperClassName: 'col-span-3',
    disabled: true,
  },
];

// In the land page's on-screen order too: the save schema, and so the "still missing" list, follow it.
export const titleLandFields: FormField[] = inScreenOrder([
  {
    type: 'dropdown',
    label: _st('Title Type'),
    name: 'titleType',
    group: 'DeedType',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: [...LAND_TYPES, ...CONDO_TYPES], operator: 'in' },
  },
  {
    type: 'text-input',
    label: _st('Title Number'),
    name: 'titleNumber',
    wrapperClassName: 'col-span-2',
    // The schema takes the first title number config it meets, so this is the longest any type may
    // have (a condominium's list); schemas/form.ts holds every other type to the land limit.
    maxLength: CONDO_TITLE_NUMBER_MAX,
    requiredWhen: {
      field: 'collateralType',
      is: [...TITLE_NUMBER_TYPES, ...CONDO_TYPES],
      operator: 'in',
    },
  },
  {
    type: 'text-input',
    label: _st('Book Number'),
    name: 'bookNumber',
    wrapperClassName: 'col-span-1',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Page Number'),
    name: 'pageNumber',
    wrapperClassName: 'col-span-1',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Rawang'),
    name: 'rawang',
    wrapperClassName: 'col-span-2',
    maxLength: 30,
    showWhen: { field: 'titleType', is: RAWANG_TITLE_TYPES, operator: 'in' },
  },
  {
    type: 'text-input',
    label: _st('Land Parcel Number'),
    name: 'landParcelNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
    showWhen: { field: 'titleType', is: LAND_PARCEL_TITLE_TYPES, operator: 'in' },
  },
  {
    type: 'text-input',
    label: _st('Survey Number'),
    name: 'surveyNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
    showWhen: { field: 'titleType', is: SURVEY_TITLE_TYPES, operator: 'in' },
  },
  {
    type: 'text-input',
    label: _st('Sheet Number'),
    name: 'mapSheetNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
    showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
  },
  {
    type: 'text-input',
    label: _st('Aerial Photo Name'),
    name: 'aerialMapName',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
    showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
  },
  {
    type: 'text-input',
    label: _st('Aerial Photo Number'),
    name: 'aerialMapNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 50,
    showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
  },
  {
    type: 'number-input',
    label: _st('Rai'),
    name: 'areaRai',
    wrapperClassName: 'col-span-2',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },
  {
    type: 'number-input',
    label: _st('Ngan'),
    name: 'areaNgan',
    wrapperClassName: 'col-span-2',
    decimalPlaces: 0,
    maxIntegerDigits: 1,
    max: 3,
  },
  {
    type: 'number-input',
    label: _st('Sq.Wa'),
    name: 'areaSquareWa',
    wrapperClassName: 'col-span-2',
    requiredWhen: {
      conditions: [
        { field: 'areaRai', operator: 'isEmpty' },
        { field: 'areaNgan', operator: 'isEmpty' },
        { field: 'collateralType', is: LAND_TYPES, operator: 'in' },
      ],
      match: 'all',
    },
    decimalPlaces: 2,
    maxIntegerDigits: 2,
  },
  {
    type: 'text-input',
    label: _st('Owner'),
    name: 'ownerName',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
    requiredWhen: { field: 'collateralType', is: OWNER_NAME_TYPES, operator: 'in' },
  },
  {
    type: 'textarea',
    label: _st('Title Detail'),
    name: 'notes',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
    requiredWhen: { field: 'collateralType', is: [...LAND_TYPES, ...CONDO_TYPES], operator: 'in' },
  },
]);

export const titleBuildingFields: FormField[] = [
  {
    type: 'dropdown',
    label: _st('Building Type'),
    name: 'buildingType',
    group: 'BuildingType',
    wrapperClassName: 'col-span-3',
    requiredWhen: { field: 'collateralType', operator: 'in', is: BUILDING_REQUIRED_TYPES },
  },
  {
    type: 'number-input',
    label: _st('Usage Area'),
    name: 'usableArea',
    wrapperClassName: 'col-span-3',
    requiredWhen: {
      field: 'collateralType',
      operator: 'in',
      is: [...CONDO_TYPES],
    },
    decimalPlaces: 2,
    maxIntegerDigits: 3,
  },
  {
    type: 'text-input',
    label: _st('Owner'),
    name: 'ownerName',
    wrapperClassName: 'col-span-3',
    maxLength: 100,
    requiredWhen: { field: 'collateralType', is: OWNER_NAME_TYPES, operator: 'in' },
    showWhen: { field: 'collateralType', is: BUILDING_TYPE, operator: 'in' },
  },
  {
    type: 'number-input',
    label: _st('Number of Building'),
    name: 'numberOfBuilding',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },
];

export const titleBuildingFieldsAlt: FormField[] = titleBuildingFields.map(field => ({
  ...field,
  wrapperClassName: 'col-span-2',
}));

export const titleCondoFields: FormField[] = [
  {
    type: 'dropdown',
    label: _st('Title Type'),
    name: 'titleType',
    group: 'DeedType',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: [...LAND_TYPES, ...CONDO_TYPES], operator: 'in' },
  },
  {
    type: 'text-input',
    label: _st('Title Number'),
    name: 'titleNumber',
    wrapperClassName: 'col-span-4',
    maxLength: CONDO_TITLE_NUMBER_MAX,
    requiredWhen: {
      field: 'collateralType',
      is: [...TITLE_NUMBER_TYPES, ...CONDO_TYPES],
      operator: 'in',
    },
  },
  {
    type: 'text-input',
    label: _st('Room Number'),
    name: 'roomNumber',
    wrapperClassName: 'col-span-1',
    requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Floor Number'),
    name: 'floorNumber',
    wrapperClassName: 'col-span-1',
    requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Building Number'),
    name: 'buildingNumber',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
    maxLength: 30,
  },
  {
    type: 'text-input',
    label: _st('Condo Registration Number'),
    name: 'condoRegistrationNumber',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Condo Name'),
    name: 'condoName',
    wrapperClassName: 'col-span-4',
    required: true,
    requiredWhen: { field: 'collateralType', is: CONDO_TYPES, operator: 'in' },
    maxLength: 100,
  },
  {
    type: 'number-input',
    label: _st('Usage Area (Sq.M)'),
    name: 'usableArea',
    wrapperClassName: 'col-span-2',
    requiredWhen: {
      field: 'collateralType',
      operator: 'in',
      is: [...BUILDING_REQUIRED_TYPES, ...CONDO_TYPES],
    },
    decimalPlaces: 2,
    maxIntegerDigits: 3,
  },
  {
    type: 'text-input',
    label: _st('Owner'),
    name: 'ownerName',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
    requiredWhen: { field: 'collateralType', is: OWNER_NAME_TYPES, operator: 'in' },
  },
  {
    type: 'textarea',
    label: _st('Title Detail'),
    name: 'notes',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
    requiredWhen: { field: 'collateralType', is: [...LAND_TYPES, ...CONDO_TYPES], operator: 'in' },
  },
];

export const titleVehicleFields: FormField[] = [
  {
    type: 'dropdown',
    label: _st('Vehicle Type'),
    name: 'vehicleType',
    group: 'VehicleType',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: '10' },
  },
  {
    type: 'text-input',
    label: _st('Vehicle Registration Number'),
    name: 'vehicleRegistrationNumber',
    wrapperClassName: 'col-span-3',
    requiredWhen: { field: 'collateralType', is: '10' },
    maxLength: 50,
  },
  {
    type: 'text-input',
    label: _st('Chassis Number'),
    name: 'vin',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: '10' },
    maxLength: 50,
  },
  {
    type: 'text-input',
    label: _st('License Plate Number'),
    name: 'licensePlateNumber',
    wrapperClassName: 'col-span-3',
    maxLength: 50,
  },
  {
    type: 'textarea',
    label: _st('Appointment Location'),
    name: 'vehicleLocation',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },
];

export const titleVesselFields: FormField[] = [
  {
    type: 'dropdown',
    label: _st('Vessel Type'),
    name: 'vesselType',
    group: 'VesselType',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: _st('Hull Number'),
    name: 'hin',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: '12' },
    maxLength: 50,
  },
  {
    type: 'text-input',
    label: _st('Vessel Registration Number'),
    name: 'vesselRegistrationNumber',
    wrapperClassName: 'col-span-3',
    maxLength: 50,
  },
  {
    type: 'textarea',
    label: _st('Appointment Location'),
    name: 'vesselLocation',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },
];

export const titleMachineFields: FormField[] = [
  {
    type: 'dropdown',
    label: _st('Machine Status'),
    name: 'installationStatus',
    group: 'MachineStatus',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: '11' },
  },
  {
    type: 'dropdown',
    label: _st('Machine Type'),
    name: 'machineType',
    group: 'MachineType',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: '11' },
  },
  {
    type: 'boolean-toggle',
    label: _st('Registration Status'),
    name: 'registrationStatus',
    options: ['Unregistered', 'Registered'],
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: '11' },
  },
  {
    type: 'text-input',
    label: _st('Registration No'),
    name: 'registrationNumber',
    wrapperClassName: 'col-span-3',
    requiredWhen: {
      conditions: [
        { field: 'installationStatus', is: '1' },
        { field: 'registrationStatus', is: true },
      ],
      match: 'all',
    },
    maxLength: 50,
  },
  {
    type: 'text-input',
    label: _st('Invoice No'),
    name: 'invoiceNumber',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'installationStatus', is: '2' },
    maxLength: 20,
  },
  {
    type: 'number-input',
    label: _st('No of Machine(s)'),
    name: 'numberOfMachine',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: '11' },
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },
];

export const titleAddressFields: FormField[] = [
  {
    type: 'text-input',
    label: _st('House Number'),
    name: 'titleAddress.houseNumber',
    wrapperClassName: 'col-span-2',
    requiredWhen: {
      field: 'collateralType',
      is: [...LAND_CODES, ...LEASE_LAND_CODE],
      operator: 'notIn',
    },
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Village/Building Name'),
    name: 'titleAddress.projectName',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: _st('Moo'),
    name: 'titleAddress.moo',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Soi'),
    name: 'titleAddress.soi',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: _st('Road'),
    name: 'titleAddress.road',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'location-selector',
    label: _st('Sub District'),
    name: 'titleAddress.subDistrict',
    districtField: 'titleAddress.district',
    districtNameField: 'titleAddress.districtName',
    provinceField: 'titleAddress.province',
    provinceNameField: 'titleAddress.provinceName',
    postcodeField: 'titleAddress.postcode',
    subDistrictNameField: 'titleAddress.subDistrictName',
    addressSource: 'title',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: _st('District'),
    name: 'titleAddress.district',
    wrapperClassName: 'col-span-3',
    hide: true,
  },
  {
    type: 'text-input',
    label: _st('District'),
    name: 'titleAddress.districtName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: _st('Province'),
    name: 'titleAddress.province',
    wrapperClassName: 'col-span-3',
    hide: true,
  },
  {
    type: 'text-input',
    label: _st('Province'),
    name: 'titleAddress.provinceName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: _st('Postcode'),
    name: 'titleAddress.postcode',
    disabled: true,
    wrapperClassName: 'col-span-2',
    hide: true,
  },
];

export const dopaAddressFields: FormField[] = [
  {
    type: 'text-input',
    label: _st('House Number'),
    name: 'dopaAddress.houseNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
    requiredWhen: {
      field: 'collateralType',
      is: [...LAND_CODES, ...LEASE_LAND_CODE],
      operator: 'notIn',
    },
  },
  {
    type: 'text-input',
    label: _st('Village/Building Name'),
    name: 'dopaAddress.projectName',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: _st('Moo'),
    name: 'dopaAddress.moo',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Soi'),
    name: 'dopaAddress.soi',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: _st('Road'),
    name: 'dopaAddress.road',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'location-selector',
    label: _st('Sub District'),
    name: 'dopaAddress.subDistrict',
    districtField: 'dopaAddress.district',
    districtNameField: 'dopaAddress.districtName',
    provinceField: 'dopaAddress.province',
    provinceNameField: 'dopaAddress.provinceName',
    postcodeField: 'dopaAddress.postcode',
    subDistrictNameField: 'dopaAddress.subDistrictName',
    addressSource: 'dopa',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: _st('District'),
    name: 'dopaAddress.district',
    wrapperClassName: 'col-span-2',
    hide: true,
  },
  {
    type: 'text-input',
    label: _st('District'),
    name: 'dopaAddress.districtName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: _st('District'),
    name: 'dopaAddress.province',
    wrapperClassName: 'col-span-2',
    hide: true,
  },
  {
    type: 'text-input',
    label: _st('Province'),
    name: 'dopaAddress.provinceName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: _st('Postcode'),
    name: 'dopaAddress.postcode',
    disabled: true,
    wrapperClassName: 'col-span-2',
    hide: true,
  },
];

export const titlesFieldConfig: FieldArrayField = {
  type: 'field-array',
  name: 'titles',
  required: true,
  minItems: 1,
  fields: deduplicateByName([
    ...titleInfoFields,
    ...titleLandFields,
    ...titleBuildingFields,
    ...titleCondoFields,
    ...titleVehicleFields,
    ...titleVesselFields,
    ...titleMachineFields,
    ...titleAddressFields,
    ...dopaAddressFields,
    // Schema-only fields (not in any rendering config)
    { type: 'text-input', name: 'titleDetail', label: 'Title Detail' },
  ]),
};

// Static address fields used for schema building
export const addressFields: FormField[] = [
  {
    type: 'text-input',
    label: _st('House No'),
    name: 'houseNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
    required: true,
  },
  {
    type: 'text-input',
    label: _st('Village/Building'),
    name: 'projectName',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: _st('Moo'),
    name: 'moo',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: _st('Soi'),
    name: 'soi',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: _st('Road'),
    name: 'road',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'location-selector',
    label: _st('Sub District'),
    name: 'subDistrict',
    districtField: 'detail.address.district',
    districtNameField: 'detail.address.districtName',
    provinceField: 'detail.address.province',
    provinceNameField: 'detail.address.provinceName',
    postcodeField: 'detail.address.postcode',
    subDistrictNameField: 'detail.address.subDistrictName',
    // Administrative address -> DOPA master (กรมการปกครอง), not the Title (deed) master.
    addressSource: 'dopa',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: _st('District'),
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: _st('Province'),
    name: 'provinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: _st('Postcode'),
    name: 'postcode',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
];

export const contactFields: FormField[] = [
  {
    type: 'text-input',
    label: _st('Contact Person Name'),
    name: 'contactPersonName',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: _st('Contact Person Phone No'),
    name: 'contactPersonPhone',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 40,
  },
  {
    type: 'dropdown',
    label: _st('Dealer Code'),
    name: 'dealerCode',
    wrapperClassName: 'col-span-6',
    group: 'Dealer',
  },
];

// =============================================================================
// Requestor fields
// =============================================================================

/**
 * Static fields for schema building (relative names — prefix with 'requestor' via prefixFields).
 * employeeId is the identifier (bank code e.g. "P5229") and must be non-empty after a
 * requestor is picked. Display-only fields remain nullish in the base schema and are not listed.
 */
export const requestorSchemaFields: FormField[] = [
  { type: 'text-input', label: _st('Employee ID'), name: 'employeeId', required: true },
];

export const requestFields: FormField[] = [
  {
    type: 'dropdown',
    label: _st('Appraisal Purpose'),
    name: 'purpose',
    group: 'AppraisalPurpose',
    wrapperClassName: 'col-span-3',
    required: true,
    filterOptions: { type: 'isActive', values: true },
  },
  {
    type: 'boolean-toggle',
    label: _st('Customer bring the appraisal book'),
    name: 'detail.hasAppraisalBook',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'string-toggle',
    label: _st('Priority'),
    name: 'priority',
    options: [
      { name: 'Normal', label: 'Normal' },
      { name: 'High', label: 'High' },
    ],
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'appraisal-selector',
    label: _st('Previous Appraisal Report No'),
    name: 'detail.prevAppraisalReportNo',
    idField: 'detail.prevAppraisalId',
    valueField: 'detail.prevAppraisalValue',
    dateField: 'detail.prevAppraisalDate',
    wrapperClassName: 'col-span-1',
    // The same purposes the field is shown with a star for (makeRequestFields reads the same list)
    requiredWhen: PRIOR_REQUIRED_WHEN,
  },
  {
    type: 'number-input',
    label: _st('Previous Appraisal Value'),
    name: 'detail.prevAppraisalValue',
    disabled: true,
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'date-input',
    label: _st('Previous Appraisal Date'),
    name: 'detail.prevAppraisalDate',
    disabled: true,
    wrapperClassName: 'col-span-1',
    disableFutureDates: true,
    disableToday: true,
  },
  {
    type: 'dropdown',
    label: _st('Channel'),
    name: 'channel',
    group: 'Channel',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'dropdown',
    label: _st('Banking Segment'),
    name: 'detail.loanDetail.bankingSegment',
    group: 'BankingSegment',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: _st('Loan Application No'),
    name: 'detail.loanDetail.loanApplicationNumber',
    wrapperClassName: 'col-span-1',
    requiredWhen: { field: 'channel', is: ['LOS', 'CLS'], operator: 'in' },
    maxLength: 20,
  },
  {
    type: 'number-input',
    label: _st('Apply/Limit Amount'),
    name: 'detail.loanDetail.facilityLimit',
    wrapperClassName: 'col-span-1',
    maxIntegerDigits: 15,
    disableWhen: { field: 'purpose', is: ['02', '07', '08'], operator: 'in' },
    requiredWhen: { field: 'purpose', is: FACILITIE_LIMIT_AMOUNT_REQUIRED, operator: 'in' },
  },
  {
    type: 'number-input',
    label: _st('Increase Limit Amount'),
    name: 'detail.loanDetail.additionalFacilityLimit',
    wrapperClassName: 'col-span-1',
    maxIntegerDigits: 15,
    requiredWhen: { field: 'purpose', is: '02' },
    disableWhen: { field: 'purpose', is: ['07', '08'], operator: 'in' },
  },
  {
    type: 'number-input',
    label: _st('Old Limit Amount'),
    name: 'detail.loanDetail.previousFacilityLimit',
    wrapperClassName: 'col-span-1',
    maxIntegerDigits: 15,
    requiredWhen: { field: 'purpose', is: '02' },
    disableWhen: { field: 'purpose', is: ['07', '08'], operator: 'in' },
  },
];

export const appointmentAndFeeFields: FormField[] = [
  {
    type: 'dropdown',
    label: _st('Fee Payment Type'),
    name: 'detail.fee.feePaymentType',
    group: 'FeePaymentMethod',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: _st('Bank Absorb Amount'),
    name: 'detail.fee.absorbedAmount',
    wrapperClassName: 'col-span-1',
    maxIntegerDigits: 15,
    requiredWhen: { field: 'detail.fee.feePaymentType', is: BANK_ABSORB, operator: 'in' },
    showWhen: { field: 'detail.fee.feePaymentType', is: [...BANK_ABSORB, '99'], operator: 'in' },
  },
  {
    type: 'textarea',
    label: _st('Fee Remark'),
    name: 'detail.fee.feeNotes',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'detail.fee.feePaymentType', is: '99' },
  },
  {
    type: 'datetime-input',
    label: _st('Appointment Date/Time'),
    name: 'detail.appointment.appointmentDateTime',
    wrapperClassName: 'col-span-2',
    required: true,
    disablePastDates: true,
    disableToday: true,
  },
  {
    type: 'textarea',
    label: _st('Location Detail'),
    name: 'detail.appointment.appointmentLocation',
    wrapperClassName: 'col-span-2',
    maxLength: 4000,
    showCharCount: true,
  },
];

export const customersFieldConfig: FieldArrayField = {
  type: 'field-array',
  name: 'customers',
  required: true,
  minItems: 1,
  skipRow: blankCustomer,
  fields: [
    {
      type: 'text-input',
      name: 'name',
      label: _st('Customer Name'),
      required: true,
      maxLength: 260,
    },
    {
      type: 'text-input',
      name: 'contactNumber',
      label: _st('Contact Number'),
      maxLength: 20,
    },
  ],
};

export const propertiesFieldConfig: FieldArrayField = {
  type: 'field-array',
  name: 'properties',
  required: true,
  minItems: 1,
  skipRow: blankProperty,
  fields: [
    {
      type: 'dropdown',
      name: 'propertyType',
      label: _st('Property Type'),
      group: 'PropertyType',
      required: true,
    },
    {
      type: 'dropdown',
      name: 'buildingType',
      label: _st('Building Type'),
      group: 'BuildingType',
      requiredWhen: {
        field: 'propertyType',
        is: NO_BUILDING_PROPERTY_TYPES,
        operator: 'notIn',
      },
    },
    {
      type: 'text-input',
      name: 'buildingTypeOther',
      label: _st('Building Type (Other)'),
      maxLength: 100,
      requiredWhen: { field: 'buildingType', is: '99' },
    },
    {
      type: 'number-input',
      name: 'sellingPrice',
      label: _st('Selling Price'),
      maxIntegerDigits: 15,
    },
  ],
};

// =============================================================================
// All fields combined — used by buildFormSchema
// =============================================================================

export const allRequestFields: FormField[] = [
  ...requestFields,
  ...prefixFields(requestorSchemaFields, 'requestor'),
  ...prefixFields(addressFields, 'detail.address'),
  ...prefixFields(contactFields, 'detail.contact'),
  ...appointmentAndFeeFields,
  customersFieldConfig,
  propertiesFieldConfig,
];
