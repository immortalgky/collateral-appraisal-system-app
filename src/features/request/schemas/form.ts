import { z } from 'zod';
import { buildFormSchema } from '@/shared/components/form';
import { allRequestFields, titlesFieldConfig } from '../configs/fields';

const UserDto = z.object({
  userId: z.string(),
  username: z.string(),
});

const RequestDetailDto = z.object({
  hasAppraisalBook: z.boolean(),
  loanDetail: z.object({
    bankingSegment: z.string().min(1, 'Banking segment is required.'),
    loanApplicationNumber: z.string().nullable(),
    facilityLimit: z.coerce.number().min(1, 'Facility limit must be greater than 0.'),
    additionalFacilityLimit: z.number().nullable(),
    previousFacilityLimit: z.number().nullable(),
    totalSellingPrice: z.number().nullable(),
  }),
  prevAppraisalId: z.string().nullable(),
  prevAppraisalValue: z.number().nullable(),
  prevAppraisalDate: z.string().nullable(),
  address: z.object({
    houseNumber: z.string().nullable(),
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
  }),
  contact: z.object({
    contactPersonName: z.string().min(1, 'Contact person name is required.'),
    contactPersonPhone: z.string().min(1, 'Contact person phone number is required.'),
    dealerCode: z.string().nullable(),
  }),
  appointment: z.object({
    appointmentDateTime: z.string().datetime({ local: true, offset: true }),
    appointmentLocation: z.string().min(1, 'Appointment location is required.'),
  }),
  fee: z.object({
    feePaymentType: z.string().min(1, 'Fee payment type is required.'),
    feeNotes: z.string().nullable(),
    absorbedAmount: z.number().nullable(),
  }),
});
const RequestCustomerDto = z.object({
  name: z.string().min(1, 'Customer name is required.'),
  contactNumber: z.string().min(1, 'Contact number is required.'),
});
const RequestPropertyDto = z.object({
  propertyType: z.string().min(1, 'Property type is required.'),
  buildingType: z.string().nullable(),
  sellingPrice: z.number().nullable(),
});
const AddressDto = z
  .object({
    houseNumber: z.string().nullable(),
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
const RequestCommentDto = z.object({
  id: z.string().uuid().optional(), // undefined for new local comments
  tempId: z.string().optional(), // local tracking ID before API call
  requestId: z.string().uuid().optional(), // undefined when no requestId yet
  comment: z.string().min(1, 'Comment is required'),
  commentedBy: z.string(),
  commentedByName: z.string(),
  commentedAt: z.string(),
  lastModifiedAt: z.string().nullable(),
  isLocal: z.boolean().optional(), // true = not yet saved to API
});

// Base schema without manual superRefine — conditional validation handled by field configs.
const createRequestFormBase = z.object({
  purpose: z.string(),
  channel: z.string(),
  priority: z.string(),
  isPma: z.boolean(),
  creator: UserDto,
  requestor: UserDto,
  detail: RequestDetailDto,
  customers: z.array(RequestCustomerDto),
  properties: z.array(RequestPropertyDto),
  titles: z.array(RequestTitleDto),
  documents: z.array(RequestDocumentDto),
  comments: z.array(RequestCommentDto),
});

// Conditional refinement from field configs replaces hand-written superRefine.
// Field configs are the source of truth for validation (field-wins by default).
// Base schema provides fields not expressible as FormField (titles, documents, etc.).
export const createRequestForm = buildFormSchema(
  allRequestFields,
  createRequestFormBase,
) as z.ZodEffects<typeof createRequestFormBase>;

export type UserDtoType = z.infer<typeof UserDto>;
export type RequestCommentDtoType = z.infer<typeof RequestCommentDto>;
export type createRequestFormType = z.infer<typeof createRequestFormBase>;
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
  priority: 'NORMAL',
  isPma: false,
  // TODO: Replace with actual logged-in user when login is implemented
  creator: {
    userId: 'P000000001',
    username: 'System User',
  },
  requestor: {
    userId: 'P000000001',
    username: 'System User',
  },
  detail: {
    hasAppraisalBook: false,
    loanDetail: {
      bankingSegment: '',
      loanApplicationNumber: '',
      facilityLimit: 0,
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
      appointmentDateTime: '',
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
  collateralStatus: '',
  titleNumber: '',
  titleType: '',
  titleDetail: '',
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
  registrationStatus: '',
  registrationNo: '',
  machineType: '',
  installationStatus: '',
  invoiceNumber: '',
  numberOfMachine: 0,
  buildingType: '',
  usableArea: 0,
  numberOfBuilding: 0,
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
  notes: '',
  documents: [],
};
