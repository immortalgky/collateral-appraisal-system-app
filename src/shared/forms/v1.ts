import { z } from 'zod';

export const ReferenceDto = z
  .object({
    prevAppraisalNo: z.string().nullable(),
    prevAppraisalValue: z.coerce.number().nullable(),
    prevAppraisalDate: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
export const LoanDetailDto = z
  .object({
    loanApplicationNo: z.string().nullable(),
    limitAmt: z.coerce.number().nullable(),
    totalSellingPrice: z.coerce.number().nullable(),
  })
  .passthrough();
export const AddressDto = z
  .object({
    houseNo: z.string().nullable(),
    roomNo: z.string().nullable(),
    floorNo: z.string().nullable(),
    locationIdentifier: z.string().nullable(),
    moo: z.string().nullable(),
    soi: z.string().nullable(),
    road: z.string().nullable(),
    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    postcode: z.string().nullable(),
  })
  .passthrough();
export const ContactDto = z
  .object({
    contactPersonName: z.string(),
    contactPersonContactNo: z.string(),
    projectCode: z.string().nullable(),
  })
  .passthrough();
export const FeeDto = z
  .object({ feeType: z.string(), feeRemark: z.string().nullable() })
  .passthrough();
export const RequestorDto = z
  .object({
    requestorEmpId: z.string(),
    requestorName: z.string(),
    requestorEmail: z.string(),
    requestorContactNo: z.string(),
    requestorAo: z.string(),
    requestorBranch: z.string(),
    requestorBusinessUnit: z.string(),
    requestorDepartment: z.string(),
    requestorSection: z.string(),
    requestorCostCenter: z.string(),
  })
  .passthrough();
export const RequestCustomerDto = z
  .object({ name: z.string().min(1), contactNumber: z.string() })
  .passthrough();
export const RequestPropertyDto = z
  .object({
    propertyType: z.string(),
    buildingType: z.string(),
    sellingPrice: z.coerce.number(),
  })
  .passthrough();
export const RequestCommentDto = z.object({ comment: z.string() }).passthrough();
export const UpdateRequestRequest = z
  .object({
    purpose: z.string(),
    hasAppraisalBook: z.boolean(),
    priority: z.string(),
    reference: ReferenceDto,
    channel: z.string(),
    occurConstInspec: z.coerce.number().int().nullable(),
    loanDetail: LoanDetailDto,
    address: AddressDto,
    contact: ContactDto,
    fee: FeeDto,
    requestor: RequestorDto,
    customers: z.array(RequestCustomerDto),
    properties: z.array(RequestPropertyDto),
    comments: z.array(RequestCommentDto),
  })
  .passthrough();
export const UpdateRequestResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const RequestDetailDto = z
  .object({
    purpose: z.string(),
    hasAppraisalBook: z.boolean(),
    priority: z.string(),
    reference: ReferenceDto,
    channel: z.string(),
    occurConstInspec: z.coerce.number().int().nullable(),
    loanDetail: LoanDetailDto,
    address: AddressDto,
    contact: ContactDto,
    fee: FeeDto,
    requestor: RequestorDto,
  })
  .passthrough();
export const GetRequestByIdResponse = z
  .object({
    id: z.coerce.number().int(),
    appraisalNo: z.string(),
    status: z.string(),
    detail: RequestDetailDto,
  })
  .passthrough();
export const DeleteRequestResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const UpdateRequestCommentRequest = z.object({ comment: z.string() }).passthrough();
export const RequestDto = z
  .object({
    id: z.coerce.number().int(),
    appraisalNo: z.string(),
    status: z.string(),
    detail: RequestDetailDto,
  })
  .passthrough();
export const GetRequestResult = z.object({ requests: z.array(RequestDto) }).passthrough();
export const TitleDocument = z
  .object({
    docType: z.string().nullable(),
    fileName: z.string().nullable(),
    uploadDate: z.string().datetime({ offset: true }),
    prefix: z.string().nullable(),
    set: z.coerce.number().int(),
    comment: z.string().nullable(),
    filePath: z.string().nullable(),
  })
  .partial()
  .passthrough();
export const Collateral = z
  .object({
    collateralType: z.string(),
    collateralStatus: z.string().nullable(),
    titleNo: z.string().nullable(),
    owner: z.string().nullable(),
    noOfBuilding: z.coerce.number().int().nullable(),
    titleDetail: z.string().nullable(),
  })
  .partial()
  .passthrough();
export const Area = z
  .object({
    rai: z.coerce.number().nullable(),
    ngan: z.coerce.number().nullable(),
    wa: z.coerce.number().nullable(),
    usageArea: z.coerce.number().nullable(),
  })
  .partial()
  .passthrough();
export const Condo = z
  .object({
    condoName: z.string().nullable(),
    condoBuildingNo: z.string().nullable(),
    condoRoomNo: z.string().nullable(),
    condoFloorNo: z.string().nullable(),
  })
  .partial()
  .passthrough();
export const TitleAddress = z
  .object({
    houseNo: z.string().nullable(),
    roomNo: z.string().nullable(),
    floorNo: z.string().nullable(),
    buildingNo: z.string().nullable(),
    moo: z.string().nullable(),
    soi: z.string().nullable(),
    road: z.string().nullable(),
    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    postcode: z.string().nullable(),
  })
  .partial()
  .passthrough();
export const DopaAddress = z
  .object({
    dopaHouseNo: z.string().nullable(),
    dopaRoomNo: z.string().nullable(),
    dopaFloorNo: z.string().nullable(),
    dopaBuildingNo: z.string().nullable(),
    dopaMoo: z.string().nullable(),
    dopaSoi: z.string().nullable(),
    dopaRoad: z.string().nullable(),
    dopaSubDistrict: z.string().nullable(),
    dopaDistrict: z.string().nullable(),
    dopaProvince: z.string().nullable(),
    dopaPostcode: z.string().nullable(),
  })
  .partial()
  .passthrough();
export const Building = z.object({ buildingType: z.string().nullable() }).passthrough();
export const Vehicle = z
  .object({
    vehicleType: z.string().nullable(),
    vehicleRegistrationNo: z.string().nullable(),
    vehAppointmentLocation: z.string().nullable(),
  })
  .partial()
  .passthrough();
export const Machine = z
  .object({
    machineStatus: z.string().nullable(),
    machineType: z.string().nullable(),
    machineRegistrationStatus: z.string().nullable(),
    machineRegistrationNo: z.string().nullable(),
    machineInvoiceNo: z.string().nullable(),
    noOfMachine: z.coerce.number().nullable(),
  })
  .partial()
  .passthrough();
export const RequestTitleDto = z
  .object({
    titleDocuments: z.array(TitleDocument).nullable(),
    collateral: Collateral,
    area: Area.nullable(),
    condo: Condo.nullable(),
    titleAddress: TitleAddress.nullable(),
    dopaAddress: DopaAddress.nullable(),
    building: Building.nullable(),
    vehicle: Vehicle.nullable(),
    machine: Machine.nullable(),
  })
  .partial()
  .passthrough();
export const CreateRequestRequest = z
  .object({
    purpose: z.string(),
    hasAppraisalBook: z.boolean(),
    priority: z.string(),
    reference: ReferenceDto,
    channel: z.string(),
    occurConstInspec: z.coerce.number().int().nullable(),
    loanDetail: LoanDetailDto,
    address: AddressDto,
    contact: ContactDto,
    fee: FeeDto,
    requestor: RequestorDto,
    customers: z.array(RequestCustomerDto),
    properties: z.array(RequestPropertyDto),
    comments: z.array(RequestCommentDto),
    titles: z.array(RequestTitleDto),
  })
  .passthrough();
export const CreateRequestResponse = z.object({ id: z.coerce.number().int() }).passthrough();
export const AddCommentToRequestRequest = z.object({ comment: z.string() }).passthrough();
export const TokenRequest = z
  .object({
    grantType: z.string(),
    clientId: z.string(),
    code: z.string(),
    codeVerifier: z.string(),
    redirectUri: z.string(),
  })
  .passthrough();
export const DecisionRequest = z
  .object({ correlationId: z.string(), activityName: z.string(), actionTaken: z.string() })
  .partial()
  .passthrough();

export const schemas = {
  ReferenceDto,
  LoanDetailDto,
  AddressDto,
  ContactDto,
  FeeDto,
  RequestorDto,
  RequestCustomerDto,
  RequestPropertyDto,
  RequestCommentDto,
  UpdateRequestRequest,
  UpdateRequestResponse,
  RequestDetailDto,
  GetRequestByIdResponse,
  DeleteRequestResponse,
  UpdateRequestCommentRequest,
  RequestDto,
  GetRequestResult,
  TitleDocument,
  Collateral,
  Area,
  Condo,
  TitleAddress,
  DopaAddress,
  Building,
  Vehicle,
  Machine,
  RequestTitleDto,
  CreateRequestRequest,
  CreateRequestResponse,
  AddCommentToRequestRequest,
  TokenRequest,
  DecisionRequest,
};

export type CreateRequestRequestType = z.infer<typeof CreateRequestRequest>;
export type CreateRequestResponseType = z.infer<typeof CreateRequestResponse>;
export type AddressDtoType = z.infer<typeof AddressDto>;
export type TitleAddressType = z.infer<typeof TitleAddress>;
export type RequestPropertyDtoType = z.infer<typeof RequestPropertyDto>;
export type RequestTitleDtoType = z.infer<typeof RequestTitleDto>;
