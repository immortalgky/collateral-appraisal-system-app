import { z } from 'zod';
import { buildFormSchema } from '@/shared/components/form';
import { allRequestFields, titlesFieldConfig } from '../configs/fields';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

// =============================================================================
// Static schema (used at module level — no i18n, labels are for schema builder)
// =============================================================================

const UserDto = z.object({
  userId: z.string(),
  username: z.string(),
});

/**
 * Requestor snapshot stored in the form.
 * employeeId (bank code e.g. "P5229") is sent as `requestorEmployeeId` at submit.
 * All other fields are display-only — never sent to the backend.
 * No GUID is stored: the backend persists employeeId, not the auth Guid.
 */
const RequestorDto = z.object({
  employeeId: z.string(),
  name: z.string().nullish(),
  email: z.string().nullish(),
  contactNo: z.string().nullish(),
  aoCode: z.string().nullish(),
  costCenterCode: z.string().nullish(),
  costCenterDescription: z.string().nullish(),
  department: z.string().nullish(),
});

function makeRequestDetailDto(t: TFunction<'request'>) {
  return z.object({
    hasAppraisalBook: z.boolean(),
    loanDetail: z.object({
      bankingSegment: z.string().min(1, t('validation.bankingSegmentRequired')),
      loanApplicationNumber: z.string().max(10).nullable(),
      facilityLimit: z.coerce.number().min(1, t('validation.facilityLimitRequired')),
      additionalFacilityLimit: z.number().nullable(),
      previousFacilityLimit: z.number().nullable(),
      totalSellingPrice: z.number().nullable(),
    }),
    prevAppraisalId: z.string().nullable(),
    prevAppraisalValue: z.number().nullable(),
    prevAppraisalDate: z.string().nullable(),
    address: z.object({
      houseNumber: z.string().max(10).min(1, t('validation.houseNumberRequired')),
      projectName: z.string().max(100).nullable(),
      moo: z.string().max(10).nullable(),
      soi: z.string().max(100).nullable(),
      road: z.string().max(100).nullable(),
      subDistrict: z.string().min(1, t('validation.subDistrictRequired')),
      subDistrictName: z.string().nullable(),
      district: z.string().min(1, t('validation.districtRequired')),
      districtName: z.string().nullable(),
      province: z.string().min(1, t('validation.provinceRequired')),
      provinceName: z.string().nullable(),
      postcode: z.string().nullable(),
    }),
    contact: z.object({
      contactPersonName: z.string().max(100).min(1, t('validation.contactPersonNameRequired')),
      contactPersonPhone: z.string().max(40).min(1, t('validation.contactPersonPhoneRequired')),
      dealerCode: z.string().nullable(),
    }),
    appointment: z.object({
      appointmentDateTime: z.string().datetime({ local: true, offset: true }),
      appointmentLocation: z.string().min(1, t('validation.appointmentLocationRequired')),
    }),
    fee: z.object({
      feePaymentType: z.string().min(1, t('validation.feePaymentTypeRequired')),
      feeNotes: z.string().nullable(),
      absorbedAmount: z.number().nullable(),
    }),
  });
}

function makeRequestCustomerDto(t: TFunction<'request'>) {
  return z.object({
    name: z.string().max(260).min(1, t('validation.customerNameRequired')),
    contactNumber: z.string().max(20).min(1, t('validation.contactNumberRequired')),
  });
}

function makeRequestPropertyDto(t: TFunction<'request'>) {
  return z.object({
    propertyType: z.string().min(1, t('validation.propertyTypeRequired')),
    buildingType: z.string().nullable(),
    sellingPrice: z.number().nullable(),
  });
}

const AddressDto = z
  .object({
    houseNumber: z.string().max(10),
    projectName: z.string().nullable(),
    moo: z.string().nullable(),
    soi: z.string().nullable(),
    road: z.string().nullable(),
    subDistrict: z.string().min(1, 'Sub district is required.'),
    subDistrictName: z.string().nullable(),
    district: z.string().min(1, 'District is required.'),
    districtName: z.string().nullable(),
    province: z.string().min(1, 'Province is required.'),
    provinceName: z.string().nullable(),
    postcode: z.string().nullable(),
  })
  .partial();
const RequestTitleDocumentDto = z
  .object({
    id: z.string().uuid().nullable(),
    titleId: z.string().uuid().nullable(),
    documentId: z.string().uuid().nullable(),
    documentType: z.string().nullable(),
    fileName: z.string().nullable(),
    prefix: z.string().nullable(),
    set: z.number().int(),
    documentDescription: z.string().nullable(),
    filePath: z.string().nullable(),
    createdWorkstation: z.string().nullable(),
    isRequired: z.boolean(),
    uploadedBy: z.string().nullable(),
    uploadedByName: z.string().nullable(),
    uploadedAt: z.string(),
  })
  .partial();

// Base for fields not expressible as FormField (UUIDs, documents, address sub-schemas)
const TitleElementBase = z.object({
  id: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  documents: z.array(RequestTitleDocumentDto).optional(),
  titleAddress: AddressDto.optional(),
  dopaAddress: AddressDto.optional(),
});

// Element schema from field configs + base (deep merge preserves AddressDto sub-fields)
const RequestTitleDto = buildFormSchema(titlesFieldConfig.fields, TitleElementBase);
const RequestDocumentDto = z
  .object({
    id: z.string().uuid().nullable().optional(),
    requestId: z.string().uuid().nullable().optional(), // Optional when creating a new request
    documentId: z.string().uuid().nullable().optional(),
    documentType: z.string().nullable().optional(),
    fileName: z.string().nullable().optional(),
    prefix: z.string().nullable().optional(),
    set: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
    filePath: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    isRequired: z.boolean().optional(),
    uploadedBy: z.string().nullable().optional(),
    uploadedByName: z.string().nullable().optional(),
    uploadedAt: z.string().nullable().optional(),
  })
  .partial();

function makeRequestCommentDto(t: TFunction<'request'>) {
  return z.object({
    id: z.string().uuid().optional(),
    tempId: z.string().optional(),
    requestId: z.string().uuid().optional(),
    comment: z.string().min(1, t('validation.commentRequired')),
    commentedBy: z.string(),
    commentedByName: z.string(),
    commentedAt: z.string(),
    lastModifiedAt: z.string().nullable(),
    isLocal: z.boolean().optional(),
  });
}

// Factory: produce the full form schema with translated validation messages.
export function makeCreateRequestForm(t: TFunction<'request'>) {
  const createRequestFormBase = z.object({
    purpose: z.string(),
    channel: z.string(),
    priority: z.string(),
    isPma: z.boolean(),
    creator: UserDto,
    requestor: RequestorDto,
    detail: makeRequestDetailDto(t),
    customers: z.array(makeRequestCustomerDto(t)),
    properties: z.array(makeRequestPropertyDto(t)),
    titles: z.array(RequestTitleDto).min(1, t('validation.titleMinItems')),
    documents: z.array(RequestDocumentDto),
    comments: z.array(makeRequestCommentDto(t)),
  });

  return buildFormSchema(allRequestFields, createRequestFormBase);
}

// Hook: resolve the form schema per render (re-built when language changes).
export function useCreateRequestForm() {
  const { t } = useTranslation('request');
  return makeCreateRequestForm(t);
}

// Static fallback for components that need a non-reactive schema reference
// (e.g. RequestTitleDto used in isTitleComplete).
// The static version uses English error messages — acceptable since it's only
// used for boolean pass/fail validation, not shown to the user.

const _tStatic = ((key: string) => key) as TFunction<'request'>;
export const createRequestForm = makeCreateRequestForm(_tStatic);

export type UserDtoType = z.infer<typeof UserDto>;
export type RequestorDtoType = z.infer<typeof RequestorDto>;
export type RequestCommentDtoType = z.infer<ReturnType<typeof makeRequestCommentDto>>;
export type createRequestFormType = z.infer<typeof createRequestForm>;
export type RequestTitleDtoType = z.infer<typeof RequestTitleDto>;
export type RequestDocumentDtoType = z.infer<typeof RequestDocumentDto>;
export type CollateralType = string;

// Export schema for validation
export { RequestTitleDto };

//**
// Default values
//
export const createRequestFormDefault: createRequestFormType = {
  purpose: '',
  channel: 'MANUAL',
  priority: 'Normal',
  isPma: false,
  // TODO: Replace with actual logged-in user when login is implemented
  creator: {
    userId: '',
    username: '',
  },
  requestor: {
    employeeId: '',
    name: null,
    email: null,
    contactNo: null,
    aoCode: null,
    costCenterCode: null,
    costCenterDescription: null,
    department: null,
  },
  detail: {
    hasAppraisalBook: false,
    loanDetail: {
      bankingSegment: '',
      loanApplicationNumber: '',
      facilityLimit: null,
      additionalFacilityLimit: null,
      previousFacilityLimit: null,
      totalSellingPrice: 0,
    },
    prevAppraisalId: null,
    prevAppraisalValue: null,
    prevAppraisalDate: null,
    address: {
      houseNumber: '',
      projectName: '',
      moo: '',
      soi: '',
      road: '',
      subDistrict: '',
      subDistrictName: '',
      district: '',
      districtName: '',
      province: '',
      provinceName: '',
      postcode: '',
    },
    contact: {
      contactPersonName: '',
      contactPersonPhone: '',
      dealerCode: '',
    },
    appointment: {
      appointmentDateTime: null,
      appointmentLocation: '',
    },
    fee: {
      feePaymentType: '',
      feeNotes: '',
      absorbedAmount: 0,
    },
  },
  customers: [],
  properties: [],
  titles: [],
  documents: [],
  comments: [],
};
export const requestTitleDefault: RequestTitleDtoType = {
  collateralType: '',
  collateralStatus: false,
  titleNumber: '',
  titleType: '',
  notes: '',
  bookNumber: '',
  pageNumber: '',
  rawang: '',
  landParcelNumber: '',
  surveyNumber: '',
  aerialMapName: '',
  aerialMapNumber: '',
  areaRai: null,
  areaNgan: null,
  areaSquareWa: null,
  ownerName: '',
  vehicleType: '',
  vehicleAppointmentLocation: '',
  vin: '',
  licensePlateNumber: '',
  registrationStatus: false,
  registrationNumber: '',
  machineType: '',
  installationStatus: '',
  invoiceNumber: '',
  numberOfMachine: 0,
  buildingType: '',
  usableArea: null,
  numberOfBuilding: null,
  condoName: '',
  buildingNumber: '',
  roomNumber: '',
  floorNumber: '',
  titleAddress: {
    houseNumber: '',
    projectName: '',
    moo: '',
    soi: '',
    road: '',
    subDistrict: '',
    subDistrictName: '',
    district: '',
    districtName: '',
    province: '',
    provinceName: '',
    postcode: '',
  },
  dopaAddress: {
    houseNumber: '',
    projectName: '',
    moo: '',
    soi: '',
    road: '',
    subDistrict: '',
    subDistrictName: '',
    district: '',
    districtName: '',
    province: '',
    provinceName: '',
    postcode: '',
  },
  documents: [],
};
