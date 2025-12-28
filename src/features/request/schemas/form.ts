import { z } from 'zod';

const UserDto = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  avatar: z.string().nullable(),
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
    appointmentDateTime: z.string().datetime(),
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
const AddressDto = z.object({
  houseNumber: z.string().nullable(),
  projectName: z.string().nullable(),
  moo: z.string().nullable(),
  soi: z.string().nullable(),
  road: z.string().nullable(),
  subDistrict: z.string().nullable(),
  subDistrictName: z.string().nullable(),
  district: z.string().nullable(),
  districtName: z.string().nullable(),
  province: z.string().nullable(),
  provinceName: z.string().nullable(),
  postcode: z.string().nullable(),
});
const RequestTitleDocumentDto = z.object({
  id: z.string().uuid().nullable(),
  titleId: z.string().uuid().nullable(),
  documentId: z.string().uuid().nullable(),
  documentType: z.string().nullable(),
  filename: z.string().nullable(),
  prefix: z.string().nullable(),
  set: z.number().int(),
  documentDescription: z.string().nullable(),
  filePath: z.string().nullable(),
  createdWorkstation: z.string().nullable(),
  isRequired: z.boolean(),
  uploadedBy: z.string().nullable(),
  uploadedByName: z.string().nullable(),
  uploadedAt: z.string().datetime(),
});
const RequestTitleDto = z.object({
  id: z.string().uuid().nullable(),
  requestId: z.string().uuid(),
  collateralType: z.string(),
  collateralStatus: z.boolean(),
  titleNo: z.string().nullable(),
  deedType: z.string().nullable(),
  titleDetail: z.string().nullable(),
  rawang: z.string().nullable(),
  landNo: z.string().nullable(),
  surveyNo: z.string().nullable(),
  areaRai: z.number().int().nullable(),
  areaNgan: z.number().int().nullable(),
  areaSquareWa: z.number().nullable(),
  ownerName: z.string().nullable(),
  vehicleType: z.string().nullable(),
  vehicleAppointmentLocation: z.string().nullable(),
  vin: z.string().nullable(),
  licensePlateNumber: z.string().nullable(),
  vesselType: z.string().nullable(),
  vesselAppointmentLocation: z.string().nullable(),
  hullIdentificationNumber: z.string().nullable(),
  vesselRegistrationNumber: z.string().nullable(),
  registrationStatus: z.boolean(),
  registrationNo: z.string().nullable(),
  machineType: z.string().nullable(),
  installationStatus: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  numberOfMachine: z.number().int().nullable(),
  buildingType: z.string().nullable(),
  usableArea: z.number().nullable(),
  numberOfBuilding: z.number().int().nullable(),
  condoName: z.string().nullable(),
  buildingNo: z.string().nullable(),
  roomNo: z.string().nullable(),
  floorNo: z.string().nullable(),
  titleAddress: AddressDto,
  dopaAddress: AddressDto,
  notes: z.string().nullable(),
  documents: z.array(RequestTitleDocumentDto),
});
const RequestDocumentDto = z.object({
  id: z.string().uuid().nullable(),
  requestId: z.string().uuid(),
  documentId: z.string().uuid().nullable(),
  documentType: z.string(),
  fileName: z.string().nullable(),
  prefix: z.string().nullable(),
  set: z.number().int().nullable(),
  notes: z.string().nullable(),
  filePath: z.string().nullable(),
  source: z.string().nullable(),
  isRequired: z.boolean(),
  uploadedBy: z.string().nullable(),
  uploadedByName: z.string().nullable(),
  uploadedAt: z.string().datetime().nullable(),
});
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

export const createRequestForm = z.object({
  purpose: z.string().min(1, 'Appraisal purpose is required.'),
  channel: z.string().min(1, 'Channel is required.'),
  priority: z.string(),
  isPma: z.boolean(),
  creator: UserDto.nullable(),
  requestor: UserDto.nullable(),
  detail: RequestDetailDto,
  customers: z.array(RequestCustomerDto).min(1, 'At least one customer is required.'),
  properties: z.array(RequestPropertyDto).min(1, 'At least one property is required.'),
  titles: z.array(RequestTitleDto).min(1, 'At least one title is required.'),
  documents: z.array(RequestDocumentDto),
  comments: z.array(RequestCommentDto),
});

export type UserDtoType = z.infer<typeof UserDto>;
export type RequestCommentDtoType = z.infer<typeof RequestCommentDto>;

export type createRequestFormType = z.infer<typeof createRequestForm>;
