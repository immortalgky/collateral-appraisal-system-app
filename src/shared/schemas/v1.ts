import { z } from 'zod';
import { AreaDetailDto } from './typeCondo';

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
    appointmentDate: z.string().datetime({ offset: true }).nullable(),
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
    id: z.string().uuid().nullable().optional(),
    requestId: z.string().uuid().nullable().optional(), // Optional when creating new request
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
    prevAppraisalReportNo: z.string().nullable(),
    prevAppraisalValue: z.number().nullable(),
    prevAppraisalDate: z.string().nullable(),
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
const LandAndBuildingDetailDto = {
  propertyName: z.string().nullable(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  subDistrict: z.string().nullable(),
  subDistrictName: z.string().nullable(),
  district: z.string().nullable(),
  districtName: z.string().nullable(),
  province: z.string().nullable(),
  provinceName: z.string().nullable(),
  landOffice: z.string().nullable(),
  landDescription: z.string().nullable(),
  isOwnerVerified: z.boolean().nullable(),
  ownerName: z.string().nullable(),
  hasObligation: z.boolean().nullable(),
  obligationDetails: z.string().nullable(),
  isLandLocationVerified: z.boolean().nullable(),
  landCheckMethodType: z.string().nullable(),
  landCheckMethodTypeOther: z.string().nullable(),
  street: z.string().nullable(),
  soi: z.string().nullable(),
  distanceFromMainRoad: z.coerce.number().nullable(),
  village: z.string().nullable(),
  addressLocation: z.string().nullable(),
  landShapeType: z.string().nullable(),
  urbanPlanningType: z.string().nullable(),
  landZoneType: z.array(z.string()).nullable(),
  plotLocationType: z.array(z.string()).nullable(),
  plotLocationTypeOther: z.string().nullable(),
  landFillType: z.string().nullable(),
  landFillTypeOther: z.string().nullable(),
  landFillPercent: z.coerce.number().nullable(),
  soilLevel: z.coerce.number().nullable(),
  accessRoadWidth: z.coerce.number().nullable(),
  rightOfWay: z.coerce.number().nullable(),
  roadFrontage: z.coerce.number().nullable(),
  numberOfSidesFacingRoad: z.coerce.number().nullable(),
  roadPassInFrontOfLand: z.string().nullable(),
  landAccessibilityType: z.string().nullable(),
  landAccessibilityRemark: z.string().nullable(),
  roadSurfaceType: z.string().nullable(),
  roadSurfaceTypeOther: z.string().nullable(),
  publicUtilityType: z.array(z.string()).nullable(),
  publicUtilityTypeOther: z.string().nullable(),
  landUseType: z.array(z.string()).nullable(),
  landUseTypeOther: z.string().nullable(),
  landEntranceExitType: z.array(z.string()).nullable(),
  landEntranceExitTypeOther: z.string().nullable(),
  transportationAccessType: z.array(z.string()).nullable(),
  transportationAccessTypeOther: z.string().nullable(),
  propertyAnticipationType: z.string().nullable(),
  isExpropriated: z.boolean().nullable(),
  expropriationRemark: z.string().nullable(),
  isInExpropriationLine: z.boolean().nullable(),
  expropriationLineRemark: z.string().nullable(),
  royalDecree: z.string().nullable(),
  isEncroached: z.boolean().nullable(),
  encroachmentRemark: z.string().nullable(),
  encroachmentArea: z.coerce.number().nullable(),
  hasElectricity: z.boolean().nullable(),
  electricityDistance: z.coerce.number().nullable(),
  isLandlocked: z.boolean().nullable(),
  landlockedRemark: z.string().nullable(),
  isForestBoundary: z.boolean().nullable(),
  forestBoundaryRemark: z.string().nullable(),
  otherLegalLimitations: z.string().nullable(),
  evictionType: z.array(z.string()).nullable(),
  evictionTypeOther: z.string().nullable(),
  allocationType: z.string().nullable(),
  northAdjacentArea: z.string().nullable(),
  northBoundaryLength: z.coerce.number().nullable(),
  southAdjacentArea: z.string().nullable(),
  southBoundaryLength: z.coerce.number().nullable(),
  eastAdjacentArea: z.string().nullable(),
  eastBoundaryLength: z.coerce.number().nullable(),
  westAdjacentArea: z.string().nullable(),
  westBoundaryLength: z.coerce.number().nullable(),
  pondArea: z.coerce.number().nullable(),
  pondDepth: z.coerce.number().nullable(),
  //Building
  buildingNumber: z.string().nullable(),
  modelName: z.string().nullable(),
  builtOnTitleNumber: z.string().nullable(),
  houseNumber: z.string().nullable(),
  buildingConditionType: z.string().nullable(),
  isUnderConstruction: z.boolean().nullable(),
  constructionCompletionPercent: z.coerce.number().nullable(),
  constructionLicenseExpirationDate: z.string().datetime({ offset: true }).nullable(),
  isAppraisable: z.boolean().nullable(),
  buildingType: z.string().nullable(),
  buildingTypeOther: z.string().nullable(),
  numberOfFloors: z.coerce.number().nullable(),
  decorationType: z.string().nullable(),
  decorationTypeOther: z.string().nullable(),
  isEncroachingOthers: z.boolean().nullable(),
  encroachingOthersRemark: z.string().nullable(),
  encroachingOthersArea: z.coerce.number().nullable(),
  buildingMaterialType: z.string().nullable(),
  buildingStyleType: z.string().nullable(),
  isResidential: z.boolean().nullable(),
  buildingAge: z.coerce.number().nullable(),
  residentialRemark: z.string().nullable(),
  constructionStyleRemark: z.string().nullable(),
  constructionStyleType: z.string().nullable(),
  structureType: z.array(z.string()).nullable(),
  structureTypeOther: z.string().nullable(),
  roofFrameType: z.array(z.string()).nullable(),
  roofFrameTypeOther: z.string().nullable(),
  roofType: z.array(z.string()).nullable(),
  roofTypeOther: z.string().nullable(),
  ceilingType: z.array(z.string()).nullable(),
  ceilingTypeOther: z.string().nullable(),
  interiorWallType: z.array(z.string()).nullable(),
  interiorWallTypeOther: z.string().nullable(),
  exteriorWallType: z.array(z.string()).nullable(),
  exteriorWallTypeOther: z.string().nullable(),
  fenceType: z.array(z.string()).nullable(),
  fenceTypeOther: z.string().nullable(),
  constructionType: z.string().nullable(),
  constructionTypeOther: z.string().nullable(),
  utilizationType: z.string().nullable(),
  utilizationTypeOther: z.string().nullable(),
  totalBuildingArea: z.coerce.number().nullable(),
  buildingInsurancePrice: z.coerce.number().nullable(),
  sellingPrice: z.coerce.number().nullable(),
  forcedSalePrice: z.coerce.number().nullable(),
  remark: z.string().nullable(),
};
const CreateLandAndBuildingPropertyRequest = z
  .object({
    ...LandAndBuildingDetailDto,
  })
  .partial()
  .passthrough();
const UpdateLandAndBuildingPropertyRequest = z
  .object({
    ...LandAndBuildingDetailDto,
  })
  .partial()
  .passthrough();
const GetLandAndBuildingPropertyByIdResult = z
  .object({
    ...LandAndBuildingDetailDto,
  })
  .partial()
  .passthrough();
const CreateLandAndBuildingPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const UpdateLandAndBuildingPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const LandTitleDto = z
  .object({
    titleDeedNo: z.string(),
    bookNo: z.string(),
    pageNo: z.string(),
    landNo: z.string(),
    surveyNo: z.string(),
    sheetNo: z.string(),
    rai: z.coerce.number(),
    ngan: z.coerce.number(),
    wa: z.coerce.number(),
    totalSqWa: z.coerce.number(),
    documentType: z.string(),
    rawang: z.string(),
    aerialPhotoNo: z.string(),
    aerialPhotoName: z.string(),
    boundaryMarker: z.string().nullable(),
    boundartMakerOther: z.string().nullable(),
    docValidate: z.string(),
    isMissedOutSurvey: z.boolean(),
    pricePerSquareWa: z.coerce.number(),
    governmentPrice: z.coerce.number(),
  })
  .passthrough();
const LandDetailDto = {
  landTitle: z.array(LandTitleDto),
  propertyName: z.string().nullable(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  subDistrict: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string().nullable(),
  landOffice: z.string().nullable(),
  landDescription: z.string().nullable(),
  isOwnerVerified: z.boolean().nullable(),
  ownerName: z.string().nullable(),
  hasObligation: z.boolean().nullable(),
  obligationDetails: z.string().nullable(),
  isLandLocationVerified: z.boolean().nullable(),
  landCheckMethodType: z.string().nullable(),
  landCheckMethodTypeOther: z.string().nullable(),
  street: z.string().nullable(),
  soi: z.string().nullable(),
  distanceFromMainRoad: z.coerce.number().nullable(),
  village: z.string().nullable(),
  addressLocation: z.string().nullable(),
  landShapeType: z.string().nullable(),
  urbanPlanningType: z.string().nullable(),
  landZoneType: z.array(z.string()).nullable(),
  plotLocationType: z.array(z.string()).nullable(),
  plotLocationTypeOther: z.string().nullable(),
  landFillType: z.string().nullable(),
  landFillTypeOther: z.string().nullable(),
  landFillPercent: z.coerce.number().nullable(),
  soilLevel: z.coerce.number().nullable(),
  accessRoadWidth: z.coerce.number().nullable(),
  rightOfWay: z.coerce.number().nullable(),
  roadFrontage: z.coerce.number().nullable(),
  numberOfSidesFacingRoad: z.coerce.number().nullable(),
  roadPassInFrontOfLand: z.string().nullable(),
  landAccessibilityType: z.string().nullable(),
  landAccessibilityRemark: z.string().nullable(),
  roadSurfaceType: z.string().nullable(),
  roadSurfaceTypeOther: z.string().nullable(),
  publicUtilityType: z.array(z.string()).nullable(),
  publicUtilityTypeOther: z.string().nullable(),
  landUseType: z.array(z.string()).nullable(),
  landUseTypeOther: z.string().nullable(),
  landEntranceExitType: z.array(z.string()).nullable(),
  landEntranceExitTypeOther: z.string().nullable(),
  transportationAccessType: z.array(z.string()).nullable(),
  transportationAccessTypeOther: z.string().nullable(),
  propertyAnticipationType: z.string().nullable(),
  isExpropriated: z.boolean().nullable(),
  expropriationRemark: z.string().nullable(),
  isInExpropriationLine: z.boolean().nullable(),
  expropriationLineRemark: z.string().nullable(),
  royalDecree: z.string().nullable(),
  isEncroached: z.boolean().nullable(),
  encroachmentRemark: z.string().nullable(),
  encroachmentArea: z.coerce.number().nullable(),
  hasElectricity: z.boolean().nullable(),
  electricityDistance: z.coerce.number().nullable(),
  isLandlocked: z.boolean().nullable(),
  landlockedRemark: z.string().nullable(),
  isForestBoundary: z.boolean().nullable(),
  forestBoundaryRemark: z.string().nullable(),
  otherLegalLimitations: z.string().nullable(),
  evictionType: z.array(z.string()).nullable(),
  evictionTypeOther: z.string().nullable(),
  allocationType: z.string().nullable(),
  northAdjacentArea: z.string().nullable(),
  northBoundaryLength: z.coerce.number().nullable(),
  southAdjacentArea: z.string().nullable(),
  southBoundaryLength: z.coerce.number().nullable(),
  eastAdjacentArea: z.string().nullable(),
  eastBoundaryLength: z.coerce.number().nullable(),
  westAdjacentArea: z.string().nullable(),
  westBoundaryLength: z.coerce.number().nullable(),
  pondArea: z.coerce.number().nullable(),
  pondDepth: z.coerce.number().nullable(),
  hasBuilding: z.boolean().nullable(),
  hasBuildingOther: z.string().nullable(),
  remark: z.string().nullable(),
};
const CreateLandPropertyRequest = z
  .object({
    ...LandDetailDto,
  })
  .partial()
  .passthrough();
const UpdateLandPropertyRequest = z
  .object({
    ...LandDetailDto,
  })
  .partial()
  .passthrough();
const GetLandPropertyByIdResult = z
  .object({
    ...LandDetailDto,
  })
  .partial()
  .passthrough();
const CreateLandPropertyResponse = z.object({ id: z.coerce.number().int() }).passthrough();
const UpdateLandPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const DeletePropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const SurfaceDto = z.object({
  fromFloorNumber: z.coerce.number(),
  toFloorNumber: z.coerce.number(),
  floorType: z.string(),
  floorStructure: z.string(),
  floorSurface: z.string(),
});
const BuildingDepreciationMethodDto = z.object({
  fromYear: z.coerce.number().max(30, { message: 'Max value must not exceed 30' }),
  toYear: z.coerce.number(),
  depreciationPercentPerYear: z.coerce.number(),
  totalDepreciationPercent: z.coerce.number(),
  depreciationPrice: z.coerce.number(),
});
const BuildingDepreciationDetail = z.object({
  seq: z.coerce.number(),
  areaDescription: z.string().nullable(),
  area: z.coerce.number(),
  isBuilding: z.boolean(),
  pricePerSqMeterBeforeDepreciation: z.coerce.number(),
  totalPriceBeforeDepreciation: z.coerce.number(),
  year: z.coerce.number(),
  totalDepreciationPercentPerYear: z.coerce.number(),
  totalDepreciationPercent: z.coerce.number(),
  depreciationMethod: z.string(),
  totalDepreciationPrice: z.coerce.number(),
  pricePerSqMeterAfterDepreciation: z.coerce.number(),
  totalPriceAfterDepreciation: z.coerce.number(),
  buildingDepreciationMethods: z.array(BuildingDepreciationMethodDto),
});
const BuildingDetailDto = {
  ownerName: z.string().nullable(),

  propertyName: z.string().nullable(),
  buildingNumber: z.string().nullable(),
  modelName: z.string().nullable(),
  builtOnTitleNumber: z.string().nullable(),

  isOwnerVerified: z.boolean(),
  houseNumber: z.string().nullable(),

  buildingConditionType: z.string().nullable(),
  isUnderConstruction: z.boolean(),
  constructionCompletionPercent: z.coerce.number().nullable(),
  constructionLicenseExpirationDate: z.string().datetime({ offset: true }).nullable(),
  isAppraisable: z.boolean(),
  hasObligation: z.boolean(),
  obligationDetails: z.string().nullable(),

  buildingType: z.string().nullable(),
  buildingTypeOther: z.string().nullable(),
  numberOfFloors: z.coerce.number().nullable(),
  decorationType: z.string().nullable(),
  decorationtypeOther: z.string().nullable(),
  isEncroachingOthers: z.boolean(),
  encroachingOthersRemark: z.string().nullable(),
  encroachingOthersArea: z.coerce.number().nullable(),

  buildingMaterialType: z.string().nullable(),
  buildingStyleType: z.string().nullable(),
  isResidential: z.boolean(),
  buildingAge: z.coerce.number().nullable(),
  residentialRemark: z.string().nullable(),
  constructionStyleRemark: z.string().nullable(),
  constructionStyleType: z.string().nullable(),

  structureType: z.array(z.string()).nullable(),
  structureTypeOther: z.string().nullable(),
  roofFrameType: z.array(z.string()).nullable(),
  roofFrameTypeOther: z.string().nullable(),
  roofType: z.array(z.string()).nullable(),
  roofTypeOther: z.string().nullable(),
  ceilingType: z.array(z.string()).nullable(),
  ceilingTypeOther: z.string().nullable(),
  interiorWallType: z.array(z.string()).nullable(),
  interiorWallTypeOther: z.string().nullable(),
  exteriorWallType: z.array(z.string()).nullable(),
  exteriorWallTypeOther: z.string().nullable(),
  surface: SurfaceDto.nullable().nullable(),
  fenceType: z.array(z.string()).nullable(),
  fenceTypeOther: z.string().nullable(),
  constructionType: z.string().nullable(),
  constructionTypeOther: z.string().nullable(),

  utilizationType: z.string().nullable(),
  utilizationTypeOther: z.string().nullable(),

  buildingDepreciationDetails: z.array(BuildingDepreciationDetail),

  totalBuildingArea: z.coerce.number().nullable(),
  buildingInsurancePrice: z.coerce.number().nullable(),
  sellingPrice: z.coerce.number().nullable(),
  forcedSalePrice: z.coerce.number().nullable(),

  remark: z.string().nullable(),
};
const CreateBuildingPropertyRequest = z
  .object({
    ...BuildingDetailDto,
  })
  .partial()
  .passthrough();
const UpdateBuildingPropertyRequest = z
  .object({
    ...BuildingDetailDto,
  })
  .partial()
  .passthrough();
const GetBuildingPropertyByIdResult = z
  .object({
    ...BuildingDetailDto,
  })
  .partial()
  .passthrough();
const CreateBuildingPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const UpdateBuildingPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const CondoDetailDto = {
  ownerName: z.string().nullable(),

  propertyName: z.string().nullable(),
  condoName: z.string().nullable(),
  buildingNumber: z.string().nullable(),
  modelName: z.string().nullable(),
  builtOnTitleNumber: z.string().nullable(),
  condoRegistrationNumber: z.string().nullable(),
  roomNumber: z.string().nullable(),
  floorNumber: z.coerce.number().nullable(),
  usableArea: z.coerce.number().nullable(),

  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),

  subDistrict: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string().nullable(),
  landOffice: z.string().nullable(),

  isOwnerVerified: z.boolean().nullable(),
  buildingConditionType: z.string().nullable(),
  hasObligation: z.boolean().nullable(),
  obligationDetails: z.string().nullable(),
  isDocumentValidated: z.boolean().nullable(),

  locationType: z.string().nullable(),
  street: z.string().nullable(),
  soi: z.string().nullable(),
  distanceFromMainRoad: z.coerce.number().nullable(),
  accessRoadWidth: z.coerce.number().nullable(),
  rightOfWay: z.coerce.number().nullable(),
  roadSurfaceType: z.string().nullable(),
  publicUtilityType: z.array(z.string()).nullable(),
  publicUtilityTypeOther: z.string().nullable(),

  decorationType: z.string().nullable(),
  decorationTypeOther: z.string().nullable(),
  buildingAge: z.coerce.number().nullable(),
  numberOfFloors: z.coerce.number().nullable(),
  buildingFormType: z.string().nullable(),
  constructionMaterialType: z.string().nullable(),

  roomLayoutType: z.string().nullable(),
  roomLayoutTypeOther: z.string().nullable(),
  locationViewType: z.array(z.string()).nullable(),
  groundFloorMaterialType: z.string().nullable(),
  groundFloorMaterialTypeOther: z.string().nullable(),
  upperFloorMaterialType: z.string().nullable(),
  upperFloorMaterialTypeOther: z.string().nullable(),
  bathroomFloorMaterialType: z.string().nullable(),
  bathroomFloorMaterialTypeOther: z.string().nullable(),
  roofType: z.string().nullable(),
  roofTypeOther: z.string().nullable(),

  totalBuildingArea: z.coerce.number().nullable(),

  isExpropriated: z.boolean().nullable(),
  expropriationRemark: z.string().nullable(),
  isInExpropriationLine: z.boolean().nullable(),
  expropriationLineRemark: z.string().nullable(),
  royalDecree: z.string().nullable(),
  isForestBoundary: z.boolean().nullable(),
  forestBoundaryRemark: z.string().nullable(),

  facilityType: z.array(z.string()).nullable(),
  facilityTypeOther: z.string().nullable(),
  environmentType: z.array(z.string()).nullable(),

  buildingInsurancePrice: z.coerce.number().nullable(),
  sellingPrice: z.coerce.number().nullable(),
  forcedSalePrice: z.coerce.number().nullable(),

  remark: z.string().nullable(),
};
const CreateCondoPropertyRequest = z
  .object({
    ...CondoDetailDto,
  })
  .partial()
  .passthrough();
const UpdateCondoPropertyRequest = z
  .object({
    ...CondoDetailDto,
  })
  .partial()
  .passthrough();
const GetCondoPropertyByIdResult = z
  .object({
    ...CondoDetailDto,
  })
  .partial()
  .passthrough();
export const GroupValuations = z
  .object({
    groupNumber: z.coerce.number(),
    marketComparasionApproach: z.coerce.number().nullable(),
    costApproach: z.coerce.number().nullable(),
    incomeApproach: z.coerce.number().nullable(),
    residualApproach: z.coerce.number().nullable(),
    useApproach: z.string().nullable(),
  })
  .partial()
  .passthrough();
const UpdateSummaryDecisionRequest = z
  .object({
    dateTime: z.string().datetime({ offset: true }).nullable(),
    appraisalPrice: z.coerce.number().nullable(),
    buildingInsurancePrice: z.coerce.number().nullable(),
    forcedSalePrice: z.coerce.number().nullable(),
    priceVerification: z.boolean(),
    condition: z.string().nullable(),
    remark: z.string().nullable(),
    opinionAppraiser: z.string().nullable(),
    opinionCommittee: z.string().nullable(),
    specialAssumption: z.string().nullable(),
  })
  .partial()
  .passthrough();
const GetSummaryDecisionResponse = z
  .object({
    dateTime: z.string().datetime({ offset: true }).nullable(),
    appraisalPrice: z.coerce.number().nullable(),
    buildingInsurancePrice: z.coerce.number().nullable(),
    forcedSalePrice: z.coerce.number().nullable(),
    priceVerification: z.boolean(),
    groupValuations: z.array(GroupValuations),
    landTitle: z.array(LandTitleDto),
    condition: z.string().nullable(),
    remark: z.string().nullable(),
    opinionAppraiser: z.string().nullable(),
    opinionCommittee: z.string().nullable(),
    specialAssumption: z.string().nullable(),
  })
  .partial()
  .passthrough();
const CreateCondoPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const UpdateCondoPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const UpdateSummaryDecisionResponse = z.object({ isSuccess: z.boolean() }).passthrough();

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
  CreateLandAndBuildingPropertyRequest,
  UpdateLandAndBuildingPropertyRequest,
  GetLandAndBuildingPropertyByIdResult,
  CreateLandAndBuildingPropertyResponse,
  UpdateLandAndBuildingPropertyResponse,
  CreateLandPropertyRequest,
  CreateLandPropertyResponse,
  LandTitleDto,
  DeletePropertyResponse,
  GetLandPropertyByIdResult,
  UpdateLandPropertyRequest,
  UpdateLandPropertyResponse,
  CreateBuildingPropertyRequest,
  UpdateBuildingPropertyRequest,
  GetBuildingPropertyByIdResult,
  CreateBuildingPropertyResponse,
  UpdateBuildingPropertyResponse,
  AreaDetailDto,
  CreateCondoPropertyRequest,
  UpdateCondoPropertyRequest,
  GetCondoPropertyByIdResult,
  CreateCondoPropertyResponse,
  UpdateCondoPropertyResponse,
  UpdateSummaryDecisionRequest,
  UpdateSummaryDecisionResponse,
  GetSummaryDecisionResponse,
};
export type CreateRequestRequestType = z.infer<typeof CreateRequestRequest>;
export type CreateRequestResponseType = z.infer<typeof CreateRequestResponse>;
export type CreateLandAndBuildingPropertyRequestType = z.infer<
  typeof CreateLandAndBuildingPropertyRequest
>;
export type UpdateLandAndBuildingPropertyRequestType = z.infer<
  typeof UpdateLandAndBuildingPropertyRequest
>;
export type GetLandAndBuildingPropertyByIdResultType = z.infer<
  typeof GetLandAndBuildingPropertyByIdResult
>;
export type CreateLandAndBuildingPropertyResponseType = z.infer<
  typeof CreateLandAndBuildingPropertyResponse
>;
export type UpdateLandAndBuildingPropertyResponseType = z.infer<
  typeof UpdateLandAndBuildingPropertyResponse
>;
export type GetLandPropertyByIdResultType = z.infer<typeof GetLandPropertyByIdResult>;
export type UpdateLandPropertyRequestType = z.infer<typeof UpdateLandPropertyRequest>;
export type UpdateLandPropertyResponseType = z.infer<typeof UpdateLandPropertyResponse>;
export type CreateLandPropertyRequestType = z.infer<typeof CreateLandPropertyRequest>;
export type CreateLandPropertyResponseType = z.infer<typeof CreateLandPropertyResponse>;
export type LandTitleDtoType = z.infer<typeof LandTitleDto>;
export type DeletePropertyResponseType = z.infer<typeof DeletePropertyResponse>;
export type GetBuildingPropertyByIdResultType = z.infer<typeof GetBuildingPropertyByIdResult>;
export type CreateBuildingPropertyRequestType = z.infer<typeof CreateBuildingPropertyRequest>;
export type CreateBuildingPropertyResponseType = z.infer<typeof CreateBuildingPropertyResponse>;
export type UpdateBuildingPropertyRequestType = z.infer<typeof UpdateBuildingPropertyRequest>;
export type UpdateBuildingPropertyResponseType = z.infer<typeof UpdateBuildingPropertyResponse>;
export type AreaDetailDtoType = z.infer<typeof AreaDetailDto>;
export type CreateCondoPropertyResponseType = z.infer<typeof CreateCondoPropertyResponse>;
export type CreateCondoPropertyRequestType = z.infer<typeof CreateCondoPropertyRequest>;
export type UpdateCondoPropertyRequestType = z.infer<typeof UpdateCondoPropertyRequest>;
export type UpdateCondoPropertyResponseType = z.infer<typeof UpdateCondoPropertyResponse>;
export type GetCondoPropertyByIdResultType = z.infer<typeof GetCondoPropertyByIdResult>;
export type UpdateSummaryDecisionRequestType = z.infer<typeof UpdateSummaryDecisionRequest>;
export type UpdateSummaryDecisionResponseType = z.infer<typeof UpdateSummaryDecisionResponse>;
export type GetSummaryDecisionResponseType = z.infer<typeof GetSummaryDecisionResponse>;
