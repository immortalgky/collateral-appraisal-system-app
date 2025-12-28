import { z } from 'zod';

const AddressDto = z
  .object({
    houseNumber: z.string().nullable(),
    projectName: z.string().nullable(),
    moo: z.string().nullable(),
    soi: z.string().nullable(),
    road: z.string().nullable(),
    subDistrict: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string().nullable(),
    postcode: z.string().nullable(),
  })
  .passthrough();
const RequestTitleDocumentDto = z
  .object({
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
    uploadedAt: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const RequestTitleDto = z
  .object({
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
  })
  .partial()
  .passthrough();
const GetRequestTitlesByRequestIdResponse = z
  .object({ requestTitles: z.array(RequestTitleDto) })
  .passthrough();
const GetRequestTitleByIdResponse = z
  .object({
    id: z.string().uuid(),
    requestId: z.string().uuid(),
    collateralType: z.string(),
    collateralStatus: z.boolean().nullable(),
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
    registrationNo: z.string().nullable(),
    vehicleType: z.string().nullable(),
    vehicleAppointmentLocation: z.string().nullable(),
    chassisNumber: z.string().nullable(),
    machineStatus: z.string().nullable(),
    machineType: z.string().nullable(),
    installationStatus: z.string().nullable(),
    invoiceNumber: z.string().nullable(),
    numberOfMachinery: z.number().int().nullable(),
    buildingType: z.string().nullable(),
    usableArea: z.number().nullable(),
    noOfBuilding: z.number().int().nullable(),
    titleAddress: AddressDto,
    dopaAddress: AddressDto,
  })
  .passthrough();
const UserInfoDto = z.object({ userId: z.string(), username: z.string() }).passthrough();
const LoanDetailDto = z
  .object({
    bankingSegment: z.string().nullable(),
    loanApplicationNumber: z.string().nullable(),
    facilityLimit: z.number().nullable(),
    additionalFacilityLimit: z.number().nullable(),
    previousFacilityLimit: z.number().nullable(),
    totalSellingPrice: z.number().nullable(),
  })
  .passthrough();
const AddressDto2 = z
  .object({
    houseNumber: z.string().nullable(),
    projectName: z.string().nullable(),
    moo: z.string().nullable(),
    soi: z.string().nullable(),
    road: z.string().nullable(),
    subDistrict: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string().nullable(),
    postcode: z.string().nullable(),
  })
  .passthrough();
const ContactDto = z
  .object({
    contactPersonName: z.string().nullable(),
    contactPersonPhone: z.string().nullable(),
    dealerCode: z.string().nullable(),
  })
  .passthrough();
const AppointmentDto = z
  .object({
    appointmentDateTime: z.string().datetime({ offset: true }).nullable(),
    appointmentLocation: z.string().nullable(),
  })
  .passthrough();
const FeeDto = z
  .object({
    feePaymentType: z.string().nullable(),
    feeNotes: z.string().nullable(),
    absorbedAmount: z.number().nullable(),
  })
  .passthrough();
const RequestDetailDto = z
  .object({
    hasAppraisalBook: z.boolean(),
    loanDetail: LoanDetailDto.nullable(),
    prevAppraisalId: z.string().uuid().nullable(),
    address: AddressDto2.nullable(),
    contact: ContactDto.nullable(),
    appointment: AppointmentDto.nullable(),
    fee: FeeDto.nullable(),
  })
  .passthrough();
const RequestCustomerDto = z
  .object({ name: z.string().nullable(), contactNumber: z.string().nullable() })
  .passthrough();
const RequestPropertyDto = z
  .object({
    propertyType: z.string().nullable(),
    buildingType: z.string().nullable(),
    sellingPrice: z.number().nullable(),
  })
  .passthrough();
const RequestDocumentDto = z
  .object({
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
    uploadedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const UpdateRequestRequest = z
  .object({
    purpose: z.string(),
    channel: z.string(),
    requestor: UserInfoDto,
    creator: UserInfoDto,
    priority: z.string(),
    isPma: z.boolean(),
    detail: RequestDetailDto.nullable(),
    customers: z.array(RequestCustomerDto).nullable(),
    properties: z.array(RequestPropertyDto).nullable(),
    titles: z.array(RequestTitleDto).nullable(),
    documents: z.array(RequestDocumentDto).nullable(),
  })
  .passthrough();
const UpdateRequestResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const RequestDetailDto2 = z
  .object({
    hasAppraisalBook: z.boolean(),
    loanDetail: LoanDetailDto.nullable(),
    prevAppraisalId: z.string().uuid().nullable(),
    address: AddressDto2.nullable(),
    contact: ContactDto.nullable(),
    appointment: AppointmentDto.nullable(),
    fee: FeeDto.nullable(),
  })
  .passthrough();
const GetRequestByIdResult = z
  .object({
    id: z.string().uuid(),
    requestNumber: z.string(),
    status: z.string(),
    purpose: z.string(),
    channel: z.string(),
    requestor: UserInfoDto,
    creator: UserInfoDto,
    priority: z.string(),
    isPma: z.boolean(),
    detail: RequestDetailDto2,
    customers: z.array(RequestCustomerDto),
    properties: z.array(RequestPropertyDto),
    titles: z.array(RequestTitleDto),
    documents: z.array(RequestDocumentDto),
  })
  .partial()
  .passthrough();
const DeleteRequestResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const SourceSystemDto = z
  .object({
    channel: z.string().nullable(),
    requestDate: z.string().datetime({ offset: true }).nullable(),
    requestBy: z.string().nullable(),
    requestByName: z.string().nullable(),
    createdDate: z.string().datetime({ offset: true }),
    creator: z.string().nullable(),
    creatorName: z.string().nullable(),
  })
  .passthrough();
const RequestCommentDto = z
  .object({
    id: z.string().uuid(),
    requestId: z.string().uuid(),
    comment: z.string(),
    commentedBy: z.string(),
    commentedByName: z.string(),
    commentedAt: z.string().datetime({ offset: true }),
    lastModifiedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const UpdateDraftRequestRequest = z
  .object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    detail: RequestDetailDto2,
    isPMA: z.boolean(),
    purpose: z.string(),
    priority: z.string(),
    sourceSystem: SourceSystemDto,
    customers: z.array(RequestCustomerDto).nullable(),
    properties: z.array(RequestPropertyDto).nullable(),
    documents: z.array(RequestDocumentDto).nullable(),
    comments: z.array(RequestCommentDto),
    titles: z.array(RequestTitleDto),
  })
  .passthrough();
const UpdateDraftRequestResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const SubmitRequestRequest = z.object({ id: z.string().uuid() }).passthrough();
const SubmitRequestResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const RequestDto = z
  .object({
    id: z.string().uuid(),
    requestNumber: z.string(),
    status: z.string(),
    purpose: z.string(),
    channel: z.string(),
    requestor: UserInfoDto,
    creator: UserInfoDto,
    priority: z.string(),
    isPma: z.boolean(),
    detail: RequestDetailDto2,
    customers: z.array(RequestCustomerDto),
    properties: z.array(RequestPropertyDto),
    documents: z.array(RequestDocumentDto),
    titles: z.array(RequestTitleDto),
  })
  .partial()
  .passthrough();
const PaginatedResultOfRequestDto = z
  .object({
    items: z.array(RequestDto),
    count: z.number().int(),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
  })
  .passthrough();
const GetRequestResult = z.object({ result: PaginatedResultOfRequestDto }).passthrough();
const CreateRequestRequest = z
  .object({
    sessionId: z.string().uuid(),
    purpose: z.string(),
    channel: z.string(),
    requestor: UserInfoDto,
    creator: UserInfoDto,
    priority: z.string(),
    isPma: z.boolean(),
    detail: RequestDetailDto2,
    customers: z.array(RequestCustomerDto),
    properties: z.array(RequestPropertyDto),
    titles: z.array(RequestTitleDto),
    documents: z.array(RequestDocumentDto),
    comments: z.array(RequestCommentDto),
  })
  .passthrough();
const CreateRequestResponse = z.object({ id: z.string().uuid() }).passthrough();
const CreateDraftRequestRequest = z
  .object({
    sessionId: z.string().uuid(),
    purpose: z.string(),
    channel: z.string(),
    requestor: UserInfoDto,
    creator: UserInfoDto,
    priority: z.string(),
    isPma: z.boolean(),
    detail: RequestDetailDto2,
    customers: z.array(RequestCustomerDto),
    properties: z.array(RequestPropertyDto),
    documents: z.array(RequestDocumentDto),
    comments: z.array(RequestCommentDto),
  })
  .passthrough();
const CreateDraftRequestResponse = z.object({ id: z.string().uuid() }).passthrough();
const UpdateRequestCommentRequest = z.object({ comment: z.string() }).passthrough();
const UpdateRequestCommentResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const RemoveRequestCommentResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const GetRequestCommentByIdResponse = z
  .object({
    id: z.string().uuid(),
    requestId: z.string().uuid(),
    comment: z.string(),
    commentedBy: z.string(),
    commentedByName: z.string(),
    commentedAt: z.string().datetime({ offset: true }),
    lastModifiedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const GetRequestCommentsByRequestIdResponse = z
  .object({ comments: z.array(RequestCommentDto) })
  .passthrough();
const AddRequestCommentRequest = z
  .object({
    comment: z.string(),
    commentedBy: z.string(),
    commentedByName: z.string(),
  })
  .passthrough();
const AddRequestCommentResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const PermissionDto = z
  .object({
    id: z.string().uuid(),
    permissionCode: z.string(),
    description: z.string(),
  })
  .passthrough();
const RoleDto = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    permissions: z.array(PermissionDto),
  })
  .passthrough();
const PaginatedResultOfRoleDto = z
  .object({
    items: z.array(RoleDto),
    count: z.number().int(),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
  })
  .passthrough();
const GetRoleResult = z.object({ result: PaginatedResultOfRoleDto }).passthrough();
const CreateRoleRequest = z
  .object({
    name: z.string(),
    description: z.string(),
    permissions: z.array(z.string().uuid()),
  })
  .passthrough();
const CreateRoleResponse = z.object({ id: z.string().uuid() }).passthrough();
const GetRoleByIdResponse = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    permissions: z.array(PermissionDto),
  })
  .passthrough();
const DeleteRoleResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const PaginatedResultOfPermissionDto = z
  .object({
    items: z.array(PermissionDto),
    count: z.number().int(),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
  })
  .passthrough();
const GetPermissionResult = z.object({ result: PaginatedResultOfPermissionDto }).passthrough();
const CreatePermissionRequest = z
  .object({ permissionCode: z.string(), description: z.string() })
  .passthrough();
const CreatePermissionResponse = z.object({ id: z.string().uuid() }).passthrough();
const GetPermissionByIdResponse = z
  .object({
    id: z.string().uuid(),
    permissionCode: z.string(),
    description: z.string(),
  })
  .passthrough();
const DeletePermissionResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const TokenRequest = z
  .object({
    grantType: z.string(),
    clientId: z.string(),
    code: z.string(),
    codeVerifier: z.string(),
    redirectUri: z.string(),
  })
  .passthrough();
const RegisterUserPermissionDto = z
  .object({ permissionId: z.string().uuid(), isGranted: z.boolean() })
  .passthrough();
const RegisterUserRequest = z
  .object({
    username: z.string(),
    password: z.string(),
    email: z.string(),
    permissions: z.array(RegisterUserPermissionDto),
    roles: z.array(z.string().uuid()),
  })
  .passthrough();
const RegisterUserResponse = z.object({ id: z.string().uuid() }).passthrough();
const RegisterClientRequest = z
  .object({
    displayName: z.string(),
    clientType: z.string(),
    postLogoutRedirectUris: z.array(z.string().url()),
    redirectUris: z.array(z.string().url()),
    permissions: z.array(z.string()),
    requirements: z.array(z.string()),
  })
  .passthrough();
const RegisterClientResponse = z
  .object({
    clientId: z.string().nullable(),
    clientSecret: z.string().nullable(),
  })
  .passthrough();
const MarkNotificationAsReadResponse = z
  .object({ success: z.boolean(), message: z.string() })
  .passthrough();
const WorkflowStepDto = z
  .object({
    stateName: z.string(),
    isCompleted: z.boolean(),
    isCurrent: z.boolean(),
    assignedTo: z.string().nullable(),
    completedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const GetWorkflowStatusResponse = z
  .object({
    requestId: z.number().int(),
    currentState: z.string(),
    nextAssignee: z.string().nullable(),
    nextAssigneeType: z.string().nullable(),
    workflowSteps: z.array(WorkflowStepDto),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .passthrough();
const NotificationType = z.number();
const NotificationDto = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    message: z.string(),
    type: NotificationType.int(),
    createdAt: z.string().datetime({ offset: true }),
    isRead: z.boolean(),
    actionUrl: z.string().nullable(),
    metadata: z.object({}).partial().passthrough().nullable(),
  })
  .passthrough();
const GetUserNotificationsResponse = z
  .object({ notifications: z.array(NotificationDto) })
  .passthrough();
const DocumentLink = z
  .object({
    entityType: z.string(),
    entityId: z.string().uuid(),
    documentId: z.string().uuid(),
    isUnlink: z.boolean(),
  })
  .partial()
  .passthrough();
const Input = z
  .object({ sessionId: z.string(), documentLinks: z.array(DocumentLink) })
  .passthrough();
const CreateUploadSessionResponse = z
  .object({
    sessionId: z.string().uuid(),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .passthrough();
const UploadDocumentResult = z
  .object({
    isSuccess: z.boolean(),
    documentId: z.string().uuid(),
    fileName: z.string(),
    fileSize: z.number().int(),
  })
  .passthrough();
const KickstartWorkflowRequest = z.object({ requestId: z.number().int() }).passthrough();
const CompleteActivityRequest = z
  .object({
    correlationId: z.string().uuid(),
    activityName: z.string(),
    actionTaken: z.string(),
  })
  .passthrough();
const SimulateTaskCompletionRequest = z
  .object({
    correlationId: z.string().uuid().nullable().default(null),
    taskName: z.string().nullable().default(null),
    actionTaken: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const SimulateTaskAssignmentRequest = z
  .object({
    correlationId: z.string().uuid().nullable().default(null),
    taskName: z.string().nullable().default(null),
    assignedTo: z.string().nullable().default(null),
    assignedType: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const SimulateTransitionCompletedRequest = z
  .object({
    correlationId: z.string().uuid().nullable().default(null),
    requestId: z.number().int().nullable().default(null),
    taskName: z.string().nullable().default(null),
    currentState: z.string().nullable().default(null),
    assignedTo: z.string().nullable().default(null),
    assignedType: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();

export const schemas = {
  AddressDto,
  RequestTitleDocumentDto,
  RequestTitleDto,
  GetRequestTitlesByRequestIdResponse,
  GetRequestTitleByIdResponse,
  UserInfoDto,
  LoanDetailDto,
  AddressDto2,
  ContactDto,
  AppointmentDto,
  FeeDto,
  RequestDetailDto,
  RequestCustomerDto,
  RequestPropertyDto,
  RequestDocumentDto,
  UpdateRequestRequest,
  UpdateRequestResponse,
  RequestDetailDto2,
  GetRequestByIdResult,
  DeleteRequestResponse,
  SourceSystemDto,
  RequestCommentDto,
  UpdateDraftRequestRequest,
  UpdateDraftRequestResponse,
  SubmitRequestRequest,
  SubmitRequestResponse,
  RequestDto,
  PaginatedResultOfRequestDto,
  GetRequestResult,
  CreateRequestRequest,
  CreateRequestResponse,
  CreateDraftRequestRequest,
  CreateDraftRequestResponse,
  UpdateRequestCommentRequest,
  UpdateRequestCommentResponse,
  RemoveRequestCommentResponse,
  GetRequestCommentByIdResponse,
  GetRequestCommentsByRequestIdResponse,
  AddRequestCommentRequest,
  AddRequestCommentResponse,
  PermissionDto,
  RoleDto,
  PaginatedResultOfRoleDto,
  GetRoleResult,
  CreateRoleRequest,
  CreateRoleResponse,
  GetRoleByIdResponse,
  DeleteRoleResponse,
  PaginatedResultOfPermissionDto,
  GetPermissionResult,
  CreatePermissionRequest,
  CreatePermissionResponse,
  GetPermissionByIdResponse,
  DeletePermissionResponse,
  TokenRequest,
  RegisterUserPermissionDto,
  RegisterUserRequest,
  RegisterUserResponse,
  RegisterClientRequest,
  RegisterClientResponse,
  MarkNotificationAsReadResponse,
  WorkflowStepDto,
  GetWorkflowStatusResponse,
  NotificationType,
  NotificationDto,
  GetUserNotificationsResponse,
  DocumentLink,
  Input,
  CreateUploadSessionResponse,
  UploadDocumentResult,
  KickstartWorkflowRequest,
  CompleteActivityRequest,
  SimulateTaskCompletionRequest,
  SimulateTaskAssignmentRequest,
  SimulateTransitionCompletedRequest,
};

export type CreateRequestRequestType = z.infer<typeof CreateRequestRequest>;
export type CreateRequestResponseType = z.infer<typeof CreateRequestResponse>;
