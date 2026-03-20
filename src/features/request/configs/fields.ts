import type { FieldArrayField, FormField } from '@/shared/components/form';

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

export const requestFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Appraisal Purpose',
    name: 'purpose',
    group: 'AppraisalPurpose',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Customer bring the appraisal book',
    name: 'detail.hasAppraisalBook',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'string-toggle',
    label: 'Priority',
    name: 'priority',
    options: [
      { name: 'normal', label: 'Normal' },
      { name: 'high', label: 'High' },
    ],
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'appraisal-selector',
    label: 'Previous Appraisal Report No',
    name: 'detail.prevAppraisalReportNo',
    idField: 'detail.prevAppraisalId',
    valueField: 'detail.prevAppraisalValue',
    dateField: 'detail.prevAppraisalDate',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Previous Appraisal Value',
    name: 'detail.prevAppraisalValue',
    disabled: true,
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'date-input',
    label: 'Previous Appraisal Date',
    name: 'detail.prevAppraisalDate',
    disabled: true,
    wrapperClassName: 'col-span-1',
    disableFutureDates: true,
    disableToday: true,
  },
  {
    type: 'dropdown',
    label: 'Channel',
    name: 'channel',
    group: 'Channel',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Banking Segment',
    name: 'detail.loanDetail.bankingSegment',
    group: 'BankingSegment',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Loan Application No',
    name: 'detail.loanDetail.loanApplicationNumber',
    wrapperClassName: 'col-span-1',
    requiredWhen: { field: 'channel', is: ['LOS', 'CLS'], operator: 'in' },
    maxLength: 20,
  },
  {
    type: 'number-input',
    label: 'Apply/Limit Amount',
    name: 'detail.loanDetail.facilityLimit',
    wrapperClassName: 'col-span-1',
    maxIntegerDigits: 15,
    required: true,
  },
  {
    type: 'number-input',
    label: 'Increase Limit Amount',
    name: 'detail.loanDetail.additionalFacilityLimit',
    wrapperClassName: 'col-span-1',
    maxIntegerDigits: 15,
    requiredWhen: { field: 'purpose', is: '02' },
  },
  {
    type: 'number-input',
    label: 'Old Limit Amount',
    name: 'detail.loanDetail.previousFacilityLimit',
    wrapperClassName: 'col-span-1',
    maxIntegerDigits: 15,
    requiredWhen: { field: 'purpose', is: '02' },
  },
];

// =============================================================================
// Address fields (from AddressForm.tsx)
// Short names — rendered with namePrefix="detail.address".
// =============================================================================

export const addressFields: FormField[] = [
  {
    type: 'text-input',
    label: 'House No',
    name: 'houseNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
    required: true,
  },
  {
    type: 'text-input',
    label: 'Village/Building',
    name: 'projectName',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Moo',
    name: 'moo',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'soi',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Road',
    name: 'road',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'detail.address.district',
    districtNameField: 'detail.address.districtName',
    provinceField: 'detail.address.province',
    provinceNameField: 'detail.address.provinceName',
    postcodeField: 'detail.address.postcode',
    subDistrictNameField: 'detail.address.subDistrictName',
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
];

// =============================================================================
// Contact fields (from AddressForm.tsx)
// Short names — rendered with namePrefix="detail.contact".
// =============================================================================

export const contactFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Contact Person Name',
    name: 'contactPersonName',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Contact Person Phone No',
    name: 'contactPersonPhone',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 40,
  },
  {
    type: 'dropdown',
    label: 'Dealer Code',
    name: 'dealerCode',
    wrapperClassName: 'col-span-6',
    group: 'Dealer',
  },
];

// =============================================================================
// Appointment and Fee fields (from AppointmentAndFeeForm.tsx)
// Uses full dotted paths — no namePrefix at render time.
// =============================================================================

export const appointmentAndFeeFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Fee Payment Type',
    name: 'detail.fee.feePaymentType',
    group: 'FeePaymentMethod',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Fee Remark',
    name: 'detail.fee.feeNotes',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Bank Absorb Amount',
    name: 'detail.fee.absorbedAmount',
    wrapperClassName: 'col-span-1',
    maxIntegerDigits: 15,
  },
  {
    type: 'datetime-input',
    label: 'Appointment Date/Time',
    name: 'detail.appointment.appointmentDateTime',
    wrapperClassName: 'col-span-2',
    required: true,
    disablePastDates: true,
    disableToday: true,
  },
  {
    type: 'textarea',
    label: 'Location Detail',
    name: 'detail.appointment.appointmentLocation',
    wrapperClassName: 'col-span-2',
    required: true,
    maxLength: 200,
    showCharCount: true,
  },
];

// =============================================================================
// Schema-only field-array configs
// CustomersForm/PropertiesForm use FormTable for rendering, but we need
// field-array configs for schema generation.
// =============================================================================

export const customersFieldConfig: FieldArrayField = {
  type: 'field-array',
  name: 'customers',
  required: true,
  minItems: 1,
  fields: [
    { type: 'text-input', name: 'name', label: 'Customer Name', required: true, maxLength: 200 },
    {
      type: 'text-input',
      name: 'contactNumber',
      label: 'Contact Number',
      required: true,
      maxLength: 20,
    },
  ],
};

export const propertiesFieldConfig: FieldArrayField = {
  type: 'field-array',
  name: 'properties',
  required: true,
  minItems: 1,
  fields: [
    {
      type: 'dropdown',
      name: 'propertyType',
      label: 'Property Type',
      group: 'PropertyType',
      required: true,
    },
    {
      type: 'dropdown',
      name: 'buildingType',
      label: 'Building Type',
      group: 'BuildingType',
    },
    {
      type: 'number-input',
      name: 'sellingPrice',
      label: 'Selling Price',
      maxIntegerDigits: 15,
      required: true,
    },
  ],
};

// =============================================================================
// Title field configs
// =============================================================================

// Collateral type groups for conditional validation
const LAND_TYPES = ['L', 'LB', 'LSL', 'LSB', 'LS'];
const TITLE_NUMBER_TYPES = ['L', 'LB', 'LSL', 'LS'];
const OWNER_NAME_TYPES = ['L', 'LB', 'LSL', 'LSB', 'LS', 'U'];
const BUILDING_REQUIRED_TYPES = ['B', 'LB', 'LSB', 'LS'];

// --- Rendering configs (used by sub-form components for <FormFields>) ---

export const titleInfoFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Collateral Type',
    name: 'collateralType',
    group: 'PropertyType',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Previous Appraisal Report No / CAS Status',
    name: 'collateralStatus',
    options: ['New', 'Existing'],
    wrapperClassName: 'col-span-3',
    disabled: true,
  },
];

export const titleLandFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Title Type',
    name: 'titleType',
    group: 'DeedType',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: [...LAND_TYPES, 'U'], operator: 'in' },
  },
  {
    type: 'text-input',
    label: 'Title Number',
    name: 'titleNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 40,
    requiredWhen: { field: 'collateralType', is: [...TITLE_NUMBER_TYPES, 'U'], operator: 'in' },
  },
  {
    type: 'text-input',
    label: 'Book Number',
    name: 'bookNumber',
    wrapperClassName: 'col-span-1',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Page Number',
    name: 'pageNumber',
    wrapperClassName: 'col-span-1',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Rawang',
    name: 'rawang',
    wrapperClassName: 'col-span-2',
    maxLength: 30,
  },
  {
    type: 'text-input',
    label: 'Land Parcel Number',
    name: 'landParcelNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Survey Number',
    name: 'surveyNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
  },
  {
    type: 'number-input',
    label: 'Rai',
    name: 'areaRai',
    wrapperClassName: 'col-span-2',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },
  {
    type: 'number-input',
    label: 'Ngan',
    name: 'areaNgan',
    wrapperClassName: 'col-span-2',
    decimalPlaces: 0,
    maxIntegerDigits: 1,
    max: 3,
  },
  {
    type: 'number-input',
    label: 'Sq.wa',
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
    maxIntegerDigits: 3,
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
    requiredWhen: { field: 'collateralType', is: OWNER_NAME_TYPES, operator: 'in' },
  },
  {
    type: 'textarea',
    label: 'Title Detail',
    name: 'notes',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
    requiredWhen: { field: 'collateralType', is: [...LAND_TYPES, 'U'], operator: 'in' },
  },
];

export const titleBuildingFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Building Type',
    name: 'buildingType',
    group: 'BuildingType',
    wrapperClassName: 'col-span-3',
    requiredWhen: { field: 'collateralType', operator: 'in', is: BUILDING_REQUIRED_TYPES },
  },
  {
    type: 'number-input',
    label: 'Usage Area',
    name: 'usableArea',
    wrapperClassName: 'col-span-3',
    requiredWhen: {
      field: 'collateralType',
      operator: 'in',
      is: [...BUILDING_REQUIRED_TYPES, 'U'],
    },
    decimalPlaces: 2,
    maxIntegerDigits: 3,
  },
  {
    type: 'number-input',
    label: 'Number of Building',
    name: 'numberOfBuilding',
    wrapperClassName: 'col-span-3',
    requiredWhen: { field: 'collateralType', operator: 'in', is: BUILDING_REQUIRED_TYPES },
    decimalPlaces: 0,
    maxIntegerDigits: 3,
  },
];

export const titleBuildingFieldsAlt: FormField[] = titleBuildingFields.map(field => ({
  ...field,
  wrapperClassName: 'col-span-2',
}));

export const titleCondoFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Title Type',
    name: 'titleType',
    group: 'DeedType',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: [...LAND_TYPES, 'U'], operator: 'in' },
  },
  {
    type: 'text-input',
    label: 'Title Number',
    name: 'titleNumber',
    wrapperClassName: 'col-span-4',
    maxLength: 40,
    requiredWhen: { field: 'collateralType', is: [...TITLE_NUMBER_TYPES, 'U'], operator: 'in' },
  },
  {
    type: 'text-input',
    label: 'Room Number',
    name: 'roomNumber',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: 'U' },
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Floor Number',
    name: 'floorNumber',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: 'U' },
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Building Number',
    name: 'buildingNumber',
    wrapperClassName: 'col-span-2',
    requiredWhen: { field: 'collateralType', is: 'U' },
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Condo Name',
    name: 'condoName',
    wrapperClassName: 'col-span-4',
    required: true,
    requiredWhen: { field: 'collateralType', is: 'U' },
    maxLength: 100,
  },
  {
    type: 'number-input',
    label: 'Usage Area (Sq.M)',
    name: 'usableArea',
    wrapperClassName: 'col-span-2',
    requiredWhen: {
      field: 'collateralType',
      operator: 'in',
      is: [...BUILDING_REQUIRED_TYPES, 'U'],
    },
    decimalPlaces: 2,
    maxIntegerDigits: 3,
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
    requiredWhen: { field: 'collateralType', is: OWNER_NAME_TYPES, operator: 'in' },
  },
  {
    type: 'textarea',
    label: 'Title Detail',
    name: 'notes',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
    requiredWhen: { field: 'collateralType', is: [...LAND_TYPES, 'U'], operator: 'in' },
  },
];

export const titleVehicleFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Vehicle Type',
    name: 'vehicleType',
    group: 'VehicleType',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: 'VEH' },
  },
  {
    type: 'text-input',
    label: 'License Plate Number',
    name: 'licensePlateNumber',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: 'VEH' },
    maxLength: 50,
  },
  {
    type: 'textarea',
    label: 'Appointment Location',
    name: 'vehicleAppointmentLocation',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },
];

export const titleMachineFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Installation Status',
    name: 'installationStatus',
    group: 'MachineStatus',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: 'MAC' },
  },
  {
    type: 'dropdown',
    label: 'Machine Type',
    name: 'machineType',
    group: 'MachineType',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: 'MAC' },
  },
  {
    type: 'boolean-toggle',
    label: 'Registration Status',
    name: 'registrationStatus',
    options: ['Unregistered', 'Registered'],
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: 'MAC' },
  },
  {
    type: 'text-input',
    label: 'Registration No',
    name: 'registrationNo',
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
    label: 'Invoice No',
    name: 'invoiceNumber',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'installationStatus', is: '2' },
    maxLength: 20,
  },
  {
    type: 'number-input',
    label: 'No of Machine(s)',
    name: 'numberOfMachine',
    wrapperClassName: 'col-span-3',
    required: true,
    requiredWhen: { field: 'collateralType', is: 'MAC' },
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },
];

export const titleAddressFields: FormField[] = [
  {
    type: 'text-input',
    label: 'House Number',
    name: 'titleAddress.houseNumber',
    wrapperClassName: 'col-span-2',
    required: true,
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Village/Building Name',
    name: 'titleAddress.projectName',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Moo',
    name: 'titleAddress.moo',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'titleAddress.soi',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Road',
    name: 'titleAddress.road',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'location-selector',
    label: 'Sub District',
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
    label: 'District',
    name: 'titleAddress.district',
    wrapperClassName: 'col-span-3',
    hide: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'titleAddress.districtName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'titleAddress.province',
    wrapperClassName: 'col-span-3',
    hide: true,
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'titleAddress.provinceName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'titleAddress.postcode',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
];

export const dopaAddressFields: FormField[] = [
  {
    type: 'text-input',
    label: 'House Number',
    name: 'dopaAddress.houseNumber',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
    required: true,
  },
  {
    type: 'text-input',
    label: 'Village/Building Name',
    name: 'dopaAddress.projectName',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Moo',
    name: 'dopaAddress.moo',
    wrapperClassName: 'col-span-2',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'dopaAddress.soi',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Road',
    name: 'dopaAddress.road',
    wrapperClassName: 'col-span-2',
    maxLength: 100,
  },
  {
    type: 'location-selector',
    label: 'Sub District',
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
    label: 'District',
    name: 'dopaAddress.district',
    wrapperClassName: 'col-span-2',
    hide: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'dopaAddress.districtName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'dopaAddress.province',
    wrapperClassName: 'col-span-2',
    hide: true,
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'dopaAddress.provinceName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'dopaAddress.postcode',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
];

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
    ...titleMachineFields,
    ...titleAddressFields,
    ...dopaAddressFields,
    // Schema-only fields (not in any rendering config)
    { type: 'text-input', name: 'titleDetail', label: 'Title Detail' },
    { type: 'text-input', name: 'aerialMapName', label: 'Aerial Map Name' },
    { type: 'text-input', name: 'aerialMapNumber', label: 'Aerial Map Number' },
    { type: 'text-input', name: 'vin', label: 'VIN' },
  ]),
};

// =============================================================================
// All fields combined — used by buildFormSchema
// =============================================================================

export const allRequestFields: FormField[] = [
  ...requestFields,
  ...prefixFields(addressFields, 'detail.address'),
  ...prefixFields(contactFields, 'detail.contact'),
  ...appointmentAndFeeFields,
  customersFieldConfig,
  propertiesFieldConfig,
];
