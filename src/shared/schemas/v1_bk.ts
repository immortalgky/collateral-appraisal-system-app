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
    notes: z.string().nullable(),
    filePath: z.string().nullable(),
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
    titleNumber: z.string().nullable(),
    titleType: z.string().nullable(),
    titleDetail: z.string().nullable(),
    bookNumber: z.string().nullable(),
    pageNumber: z.string().nullable(),
    landParcelNumber: z.string().nullable(),
    surveyNumber: z.string().nullable(),
    mapSheetNumber: z.string().nullable(),
    rawang: z.string().nullable(),
    aerialMapName: z.string().nullable(),
    aerialMapNumber: z.string().nullable(),
    areaRai: z.number().int().nullable(),
    areaNgan: z.number().int().nullable(),
    areaSquareWa: z.number().nullable(),
    ownerName: z.string().nullable(),
    vehicleType: z.string().nullable(),
    vehicleLocation: z.string().nullable(),
    vin: z.string().nullable(),
    licensePlateNumber: z.string().nullable(),
    vesselType: z.string().nullable(),
    vesselLocation: z.string().nullable(),
    hin: z.string().nullable(),
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
    buildingNumber: z.string().nullable(),
    roomNumber: z.string().nullable(),
    floorNumber: z.string().nullable(),
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
  .object({ comment: z.string(), commentedBy: z.string(), commentedByName: z.string() })
  .passthrough();
const AddRequestCommentResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const PermissionDto = z
  .object({ id: z.string().uuid(), permissionCode: z.string(), description: z.string() })
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
  .object({ name: z.string(), description: z.string(), permissions: z.array(z.string().uuid()) })
  .passthrough();
const CreateRoleResponse = z.object({ id: z.string().uuid() }).passthrough();
const GetRoleByIdResponse = z
  .object({ id: z.string().uuid(), name: z.string(), permissions: z.array(PermissionDto) })
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
  .object({ id: z.string().uuid(), permissionCode: z.string(), description: z.string() })
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
  .object({ clientId: z.string().nullable(), clientSecret: z.string().nullable() })
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
const NotificationType = z.unknown();
const NotificationDto = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    message: z.string(),
    type: NotificationType,
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
  .object({ sessionId: z.string().uuid(), expiresAt: z.string().datetime({ offset: true }) })
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
  .object({ correlationId: z.string().uuid(), activityName: z.string(), actionTaken: z.string() })
  .passthrough();
const AssignmentOverrideRequest = z
  .object({
    runtimeAssignee: z.string().nullable(),
    runtimeAssigneeGroup: z.string().nullable(),
    runtimeAssignmentStrategies: z.array(z.string()).nullable(),
    overrideReason: z.string().nullable(),
    overrideProperties: z.object({}).partial().passthrough().nullable(),
  })
  .partial()
  .passthrough();
const StartWorkflowRequest = z
  .object({
    workflowDefinitionId: z.string().uuid(),
    instanceName: z.string(),
    startedBy: z.string(),
    initialVariables: z.object({}).partial().passthrough().nullable(),
    correlationId: z.string().nullable(),
    assignmentOverrides: z.record(AssignmentOverrideRequest).nullable(),
  })
  .partial()
  .passthrough();
const ActivityPosition = z.object({ x: z.number(), y: z.number() }).partial().passthrough();
const ActivityDefinition = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string(),
    properties: z.object({}).partial().passthrough(),
    position: ActivityPosition,
    requiredRoles: z.array(z.string()),
    timeoutDuration: z
      .string()
      .regex(/^-?(\d+\.)?\d{2}:\d{2}:\d{2}(\.\d{1,7})?$/)
      .nullable(),
    isStartActivity: z.boolean(),
    isEndActivity: z.boolean(),
  })
  .partial()
  .passthrough();
const TransitionType = z.unknown();
const TransitionDefinition = z
  .object({
    id: z.string(),
    from: z.string(),
    to: z.string(),
    condition: z.string().nullable(),
    properties: z.object({}).partial().passthrough(),
    type: TransitionType,
  })
  .partial()
  .passthrough();
const WorkflowMetadata = z
  .object({
    author: z.string(),
    createdDate: z.string().datetime({ offset: true }),
    version: z.string(),
    tags: z.array(z.string()),
    customProperties: z.object({}).partial().passthrough(),
  })
  .partial()
  .passthrough();
const WorkflowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    activities: z.array(ActivityDefinition),
    transitions: z.array(TransitionDefinition),
    variables: z.object({}).partial().passthrough(),
    metadata: WorkflowMetadata,
  })
  .partial()
  .passthrough();
const CreateWorkflowDefinitionRequest = z
  .object({
    name: z.string(),
    description: z.string(),
    category: z.string(),
    workflowSchema: WorkflowSchema,
    createdBy: z.string(),
  })
  .partial()
  .passthrough();
const CompleteActivityRequest2 = z
  .object({
    completedBy: z.string(),
    input: z.object({}).partial().passthrough(),
    nextAssignmentOverrides: z.record(AssignmentOverrideRequest).nullable(),
  })
  .partial()
  .passthrough();
const UpdateCollateralEngagementRequest = z
  .object({ reqId: z.number().int().nullable() })
  .passthrough();
const UpdateCollateralEngagementResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const CollateralPropertyDto = z
  .object({
    name: z.string().nullable(),
    brand: z.string().nullable(),
    model: z.string().nullable(),
    energyUse: z.string().nullable(),
  })
  .passthrough();
const CollateralDetailDto = z
  .object({
    engineNo: z.string().nullable(),
    registrationNo: z.string().nullable(),
    yearOfManufacture: z.number().int().nullable(),
    countryOfManufacture: z.string().nullable(),
    purchaseDate: z.string().datetime({ offset: true }).nullable(),
    purchasePrice: z.number().nullable(),
  })
  .passthrough();
const CollateralSizeDto = z
  .object({
    capacity: z.string().nullable(),
    width: z.number().nullable(),
    length: z.number().nullable(),
    height: z.number().nullable(),
  })
  .passthrough();
const CollateralMachineDto = z
  .object({
    collateralMachineProperty: CollateralPropertyDto,
    collateralMachineDetail: CollateralDetailDto,
    collateralMachineSize: CollateralSizeDto,
    chassisNo: z.string(),
  })
  .passthrough();
const CollateralVehicleDto = z
  .object({
    collateralVehicleProperty: CollateralPropertyDto,
    collateralVehicleDetail: CollateralDetailDto,
    collateralVehicleSize: CollateralSizeDto,
    chassisNo: z.string(),
  })
  .passthrough();
const CollateralVesselDto = z
  .object({
    collateralVesselProperty: CollateralPropertyDto,
    collateralVesselDetail: CollateralDetailDto,
    collateralVesselSize: CollateralSizeDto,
  })
  .passthrough();
const CoordinateDto = z.object({ latitude: z.number(), longitude: z.number() }).passthrough();
const CollateralLocationDto = z
  .object({
    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    landOffice: z.string(),
  })
  .passthrough();
const CollateralLandDto = z
  .object({
    coordinate: CoordinateDto,
    collateralLocation: CollateralLocationDto,
    landDesc: z.string(),
  })
  .passthrough();
const CollateralBuildingDto = z
  .object({
    buildingNo: z.string(),
    modelName: z.string(),
    houseNo: z.string(),
    builtOnTitleNo: z.string(),
    owner: z.string(),
  })
  .passthrough();
const CollateralCondoDto = z
  .object({
    condoName: z.string(),
    buildingNo: z.string(),
    modelName: z.string(),
    builtOnTitleNo: z.string(),
    condoRegisNo: z.string(),
    roomNo: z.string(),
    floorNo: z.number().int(),
    usableArea: z.number(),
    collateralLocation: CollateralLocationDto,
    coordinate: CoordinateDto,
    owner: z.string(),
  })
  .passthrough();
const LandTitleDocumentDetailDto = z
  .object({
    titleNo: z.string(),
    bookNo: z.string(),
    pageNo: z.string(),
    landNo: z.string(),
    surveyNo: z.string(),
    sheetNo: z.string().nullable(),
  })
  .passthrough();
const LandTitleAreaDto = z
  .object({
    rai: z.number().nullable(),
    ngan: z.number().nullable(),
    wa: z.number().nullable(),
    totalAreaInSqWa: z.number().nullable(),
  })
  .passthrough();
const LandTitleDto = z
  .object({
    id: z.number().int(),
    seqNo: z.number().int(),
    landTitleDocumentDetail: LandTitleDocumentDetailDto,
    landTitleArea: LandTitleAreaDto,
    documentType: z.string(),
    rawang: z.string(),
    aerialPhotoNo: z.string().nullable(),
    boundaryMarker: z.string().nullable(),
    boundaryMarkerOther: z.string().nullable(),
    docValidate: z.string(),
    pricePerSquareWa: z.number().nullable(),
    governmentPrice: z.number().nullable(),
  })
  .passthrough();
const UpdateCollateralRequest = z
  .object({
    collatType: z.string(),
    hostCollatId: z.number().int().nullable(),
    collateralMachine: CollateralMachineDto.nullable(),
    collateralVehicle: CollateralVehicleDto.nullable(),
    collateralVessel: CollateralVesselDto.nullable(),
    collateralLand: CollateralLandDto.nullable(),
    collateralBuilding: CollateralBuildingDto.nullable(),
    collateralCondo: CollateralCondoDto.nullable(),
    landTitles: z.array(LandTitleDto).nullable(),
  })
  .passthrough();
const UpdateCollateralResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const CollateralEngagementDto = z
  .object({
    collatId: z.number().int(),
    reqId: z.number().int(),
    linkedAt: z.string().datetime({ offset: true }).nullable(),
    unlinkedAt: z.string().datetime({ offset: true }).nullable(),
    isActive: z.boolean(),
  })
  .passthrough();
const GetCollateralByIdResponse = z
  .object({
    id: z.number().int(),
    collatType: z.string(),
    hostCollatId: z.number().int().nullable(),
    collateralMachine: CollateralMachineDto.nullable(),
    collateralVehicle: CollateralVehicleDto.nullable(),
    collateralVessel: CollateralVesselDto.nullable(),
    collateralLand: CollateralLandDto.nullable(),
    collateralBuilding: CollateralBuildingDto.nullable(),
    collateralCondo: CollateralCondoDto.nullable(),
    landTitles: z.array(LandTitleDto).nullable(),
    collateralEngagements: z.array(CollateralEngagementDto),
  })
  .passthrough();
const DeleteCollateralResponse = z.object({ isSuccess: z.boolean() }).passthrough();
const CollateralMasterDto = z
  .object({
    collatId: z.number().int(),
    collatType: z.string(),
    hostCollatId: z.number().int().nullable(),
    collateralLand: CollateralLandDto.nullable(),
    landTitles: z.array(LandTitleDto).nullable(),
    collateralBuilding: CollateralBuildingDto.nullable(),
    collateralCondo: CollateralCondoDto.nullable(),
    collateralMachine: CollateralMachineDto.nullable(),
    collateralVehicle: CollateralVehicleDto.nullable(),
    collateralVessel: CollateralVesselDto.nullable(),
    collateralEngagements: z.array(CollateralEngagementDto),
  })
  .passthrough();
const PaginatedResultOfCollateralMasterDto = z
  .object({
    items: z.array(CollateralMasterDto),
    count: z.number().int(),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
  })
  .passthrough();
const GetCollateralResponse = z
  .object({ result: PaginatedResultOfCollateralMasterDto })
  .passthrough();
const CreateCollateralRequest = z
  .object({
    collatType: z.string(),
    collateralLand: CollateralLandDto.nullable(),
    landTitles: z.array(LandTitleDto).nullable(),
    collateralBuilding: CollateralBuildingDto.nullable(),
    collateralCondo: CollateralCondoDto.nullable(),
    collateralMachine: CollateralMachineDto.nullable(),
    collateralVehicle: CollateralVehicleDto.nullable(),
    collateralVessel: CollateralVesselDto.nullable(),
    reqId: z.number().int(),
  })
  .passthrough();
const CreateCollateralResponse = z.object({ id: z.number().int() }).passthrough();
const QuotationDto = z
  .object({
    id: z.string().uuid(),
    quotationNumber: z.string(),
    requestDate: z.string().datetime({ offset: true }),
    dueDate: z.string().datetime({ offset: true }),
    status: z.string(),
    requestedByName: z.string(),
    totalAppraisals: z.number().int(),
    totalCompaniesInvited: z.number().int(),
    totalQuotationsReceived: z.number().int(),
  })
  .passthrough();
const PaginatedResultOfQuotationDto = z
  .object({
    items: z.array(QuotationDto),
    count: z.number().int(),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
  })
  .passthrough();
const GetQuotationsResponse = z.object({ quotations: PaginatedResultOfQuotationDto }).passthrough();
const CreateQuotationRequest = z
  .object({
    quotationNumber: z.string(),
    dueDate: z.string().datetime({ offset: true }),
    requestedBy: z.string().uuid(),
    requestedByName: z.string(),
    description: z.string().nullish().default(null),
    specialRequirements: z.string().nullish().default(null),
  })
  .passthrough();
const CreateQuotationResponse = z.object({ id: z.string().uuid() }).passthrough();
const GetQuotationByIdResponse = z
  .object({
    id: z.string().uuid(),
    quotationNumber: z.string(),
    requestDate: z.string().datetime({ offset: true }),
    dueDate: z.string().datetime({ offset: true }),
    status: z.string(),
    requestedBy: z.string().uuid(),
    requestedByName: z.string(),
    description: z.string().nullable(),
    specialRequirements: z.string().nullable(),
    totalAppraisals: z.number().int(),
    totalCompaniesInvited: z.number().int(),
    totalQuotationsReceived: z.number().int(),
    selectedCompanyId: z.string().uuid().nullable(),
    selectedQuotationId: z.string().uuid().nullable(),
    selectedAt: z.string().datetime({ offset: true }).nullable(),
    selectionReason: z.string().nullable(),
  })
  .passthrough();
const UpdatePricingAnalysisRequest = z
  .object({
    marketValue: z.number(),
    appraisedValue: z.number(),
    forcedSaleValue: z.number().nullable(),
  })
  .passthrough();
const UpdatePricingAnalysisResponse = z.object({ id: z.string().uuid() }).passthrough();
const ApproachDto = z.object({ id: z.string().uuid(), approachType: z.string() }).passthrough();
const GetPricingAnalysisResponse = z
  .object({
    id: z.string().uuid(),
    propertyGroupId: z.string().uuid(),
    status: z.string(),
    finalMarketValue: z.number().nullable(),
    finalAppraisedValue: z.number().nullable(),
    finalForcedSaleValue: z.number().nullable(),
    valuationDate: z.string().datetime({ offset: true }).nullable(),
    approaches: z.array(ApproachDto),
  })
  .passthrough();
const UpdateMethodRequest = z
  .object({
    methodValue: z.number().nullable().default(null),
    valuePerUnit: z.number().nullable().default(null),
    unitType: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const UpdateMethodResponse = z
  .object({
    id: z.string().uuid(),
    methodType: z.string(),
    methodValue: z.number().nullable(),
    valuePerUnit: z.number().nullable(),
    unitType: z.string().nullable(),
    status: z.string(),
  })
  .passthrough();
const UpdateFinalValueRequest = z
  .object({
    finalValue: z.number(),
    finalValueRounded: z.number(),
    includeLandArea: z.boolean().nullish().default(null),
    landArea: z.number().nullish().default(null),
    appraisalPrice: z.number().nullish().default(null),
    appraisalPriceRounded: z.number().nullish().default(null),
    hasBuildingCost: z.boolean().nullish().default(null),
    buildingCost: z.number().nullish().default(null),
    appraisalPriceWithBuilding: z.number().nullish().default(null),
    appraisalPriceWithBuildingRounded: z.number().nullish().default(null),
  })
  .passthrough();
const UpdateFinalValueResponse = z
  .object({
    finalValueId: z.string().uuid(),
    finalValue: z.number(),
    finalValueRounded: z.number(),
    includeLandArea: z.boolean(),
    landArea: z.number().nullable(),
    appraisalPrice: z.number().nullable(),
    appraisalPriceRounded: z.number().nullable(),
    hasBuildingCost: z.boolean(),
    buildingCost: z.number().nullable(),
    appraisalPriceWithBuilding: z.number().nullable(),
    appraisalPriceWithBuildingRounded: z.number().nullable(),
  })
  .passthrough();
const UpdateFactorScoreRequest = z
  .object({
    subjectValue: z.string().nullable().default(null),
    subjectScore: z.number().nullable().default(null),
    comparableValue: z.string().nullable().default(null),
    comparableScore: z.number().nullable().default(null),
    factorWeight: z.number().nullable().default(null),
    adjustmentPct: z.number().nullable().default(null),
    remarks: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const UpdateFactorScoreResponse = z
  .object({
    factorScoreId: z.string().uuid(),
    factorId: z.string().uuid(),
    factorWeight: z.number(),
    subjectValue: z.string().nullable(),
    subjectScore: z.number().nullable(),
    comparableValue: z.string().nullable(),
    comparableScore: z.number().nullable(),
    scoreDifference: z.number().nullable(),
    weightedScore: z.number().nullable(),
    adjustmentPct: z.number().nullable(),
  })
  .passthrough();
const DeleteFactorScoreResponse = z.object({ success: z.boolean() }).passthrough();
const UpdateComparableLinkRequest = z
  .object({
    weight: z.number().nullable().default(null),
    displaySequence: z.number().int().nullable().default(null),
  })
  .partial()
  .passthrough();
const UpdateComparableLinkResponse = z
  .object({
    linkId: z.string().uuid(),
    weight: z.number().nullable(),
    displaySequence: z.number().int(),
  })
  .passthrough();
const UpdateCalculationRequest = z
  .object({
    offeringPrice: z.number().nullable().default(null),
    offeringPriceUnit: z.string().nullable().default(null),
    adjustOfferPricePct: z.number().nullable().default(null),
    adjustOfferPriceAmt: z.number().nullable().default(null),
    sellingPrice: z.number().nullable().default(null),
    sellingPriceUnit: z.string().nullable().default(null),
    buySellYear: z.number().int().nullable().default(null),
    buySellMonth: z.number().int().nullable().default(null),
    adjustedPeriodPct: z.number().nullable().default(null),
    cumulativeAdjPeriod: z.number().nullable().default(null),
    totalInitialPrice: z.number().nullable().default(null),
    landAreaDeficient: z.number().nullable().default(null),
    landAreaDeficientUnit: z.string().nullable().default(null),
    landPrice: z.number().nullable().default(null),
    landValueAdjustment: z.number().nullable().default(null),
    usableAreaDeficient: z.number().nullable().default(null),
    usableAreaDeficientUnit: z.string().nullable().default(null),
    usableAreaPrice: z.number().nullable().default(null),
    buildingValueAdjustment: z.number().nullable().default(null),
    totalFactorDiffPct: z.number().nullable().default(null),
    totalFactorDiffAmt: z.number().nullable().default(null),
    totalAdjustedValue: z.number().nullable().default(null),
    weight: z.number().nullable().default(null),
  })
  .partial()
  .passthrough();
const UpdateCalculationResponse = z.object({ calculationId: z.string().uuid() }).passthrough();
const UpdateApproachRequest = z
  .object({
    approachValue: z.number().nullable().default(null),
    weight: z.number().nullable().default(null),
  })
  .partial()
  .passthrough();
const UpdateApproachResponse = z
  .object({
    id: z.string().uuid(),
    approachType: z.string(),
    approachValue: z.number().nullable(),
    weight: z.number().nullable(),
    status: z.string(),
  })
  .passthrough();
const StartPricingAnalysisResponse = z
  .object({ id: z.string().uuid(), status: z.string() })
  .passthrough();
const SetFinalValueRequest = z
  .object({
    finalValue: z.number(),
    finalValueRounded: z.number(),
    includeLandArea: z.boolean().nullish().default(null),
    landArea: z.number().nullish().default(null),
    appraisalPrice: z.number().nullish().default(null),
    appraisalPriceRounded: z.number().nullish().default(null),
    hasBuildingCost: z.boolean().nullish().default(null),
    buildingCost: z.number().nullish().default(null),
    appraisalPriceWithBuilding: z.number().nullish().default(null),
    appraisalPriceWithBuildingRounded: z.number().nullish().default(null),
  })
  .passthrough();
const SetFinalValueResponse = z
  .object({
    finalValueId: z.string().uuid(),
    finalValue: z.number(),
    finalValueRounded: z.number(),
    includeLandArea: z.boolean(),
    landArea: z.number().nullable(),
    appraisalPrice: z.number().nullable(),
    appraisalPriceRounded: z.number().nullable(),
    hasBuildingCost: z.boolean(),
    buildingCost: z.number().nullable(),
    appraisalPriceWithBuilding: z.number().nullable(),
    appraisalPriceWithBuildingRounded: z.number().nullable(),
  })
  .passthrough();
const SelectMethodResponse = z
  .object({ id: z.string().uuid(), methodType: z.string(), status: z.string() })
  .passthrough();
const ComparativeFactorInput = z
  .object({
    id: z.string().uuid().nullable(),
    factorId: z.string().uuid(),
    displaySequence: z.number().int(),
    isSelectedForScoring: z.boolean(),
    remarks: z.string().nullish().default(null),
  })
  .passthrough();
const FactorScoreInput = z
  .object({
    id: z.string().uuid().nullable(),
    factorId: z.string().uuid(),
    marketComparableId: z.string().uuid().nullable(),
    factorWeight: z.number(),
    displaySequence: z.number().int(),
    value: z.string().nullish().default(null),
    score: z.number().nullish().default(null),
    adjustmentPct: z.number().nullish().default(null),
    remarks: z.string().nullish().default(null),
  })
  .passthrough();
const CalculationInput = z
  .object({
    marketComparableId: z.string().uuid(),
    offeringPrice: z.number().nullish().default(null),
    offeringPriceUnit: z.string().nullish().default(null),
    adjustOfferPricePct: z.number().nullish().default(null),
    sellingPrice: z.number().nullish().default(null),
    buySellYear: z.number().int().nullish().default(null),
    buySellMonth: z.number().int().nullish().default(null),
    adjustedPeriodPct: z.number().nullish().default(null),
    cumulativeAdjPeriod: z.number().nullish().default(null),
    totalAdjustedValue: z.number().nullish().default(null),
    weight: z.number().nullish().default(null),
  })
  .passthrough();
const SaveComparativeAnalysisRequest = z
  .object({
    comparativeFactors: z.array(ComparativeFactorInput),
    factorScores: z.array(FactorScoreInput),
    calculations: z.array(CalculationInput),
  })
  .passthrough();
const SaveComparativeAnalysisResult = z
  .object({
    pricingAnalysisId: z.string().uuid(),
    methodId: z.string().uuid(),
    comparativeFactorsCount: z.number().int(),
    factorScoresCount: z.number().int(),
    calculationsCount: z.number().int(),
    success: z.boolean(),
  })
  .passthrough();
const RecalculateFactorsResponse = z
  .object({ pricingCalculationId: z.string().uuid(), totalFactorDiffPct: z.number().nullable() })
  .passthrough();
const LinkComparableRequest = z
  .object({
    marketComparableId: z.string().uuid(),
    displaySequence: z.number().int(),
    weight: z.number().nullish().default(null),
  })
  .passthrough();
const LinkComparableResponse = z
  .object({ linkId: z.string().uuid(), calculationId: z.string().uuid() })
  .passthrough();
const GetPricingAnalysisByGroupResponse = z
  .object({
    id: z.string().uuid().nullable(),
    propertyGroupId: z.string().uuid().nullable(),
    status: z.string().nullable(),
    finalMarketValue: z.number().nullable(),
    finalAppraisedValue: z.number().nullable(),
    finalForcedSaleValue: z.number().nullable(),
    valuationDate: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const CreatePricingAnalysisResponse = z
  .object({ id: z.string().uuid(), status: z.string() })
  .passthrough();
const LinkedComparableDto = z
  .object({
    linkId: z.string().uuid(),
    marketComparableId: z.string().uuid(),
    displaySequence: z.number().int(),
    comparableName: z.string().nullable(),
    comparableCode: z.string().nullable(),
  })
  .passthrough();
const ComparativeFactorDto = z
  .object({
    id: z.string().uuid(),
    factorId: z.string().uuid(),
    factorName: z.string().nullable(),
    factorCode: z.string().nullable(),
    displaySequence: z.number().int(),
    isSelectedForScoring: z.boolean(),
    remarks: z.string().nullable(),
  })
  .passthrough();
const FactorScoreDto = z
  .object({
    id: z.string().uuid(),
    factorId: z.string().uuid(),
    factorName: z.string().nullable(),
    marketComparableId: z.string().uuid().nullable(),
    comparableName: z.string().nullable(),
    factorWeight: z.number(),
    displaySequence: z.number().int(),
    value: z.string().nullable(),
    score: z.number().nullable(),
    weightedScore: z.number().nullable(),
    adjustmentPct: z.number().nullable(),
    remarks: z.string().nullable(),
  })
  .passthrough();
const CalculationDto = z
  .object({
    id: z.string().uuid(),
    marketComparableId: z.string().uuid(),
    comparableName: z.string().nullable(),
    offeringPrice: z.number().nullable(),
    offeringPriceUnit: z.string().nullable(),
    adjustOfferPricePct: z.number().nullable(),
    sellingPrice: z.number().nullable(),
    buySellYear: z.number().int().nullable(),
    buySellMonth: z.number().int().nullable(),
    adjustedPeriodPct: z.number().nullable(),
    cumulativeAdjPeriod: z.number().nullable(),
    totalFactorDiffPct: z.number().nullable(),
    totalAdjustedValue: z.number().nullable(),
  })
  .passthrough();
const GetComparativeFactorsResult = z
  .object({
    pricingAnalysisId: z.string().uuid(),
    methodId: z.string().uuid(),
    methodType: z.string(),
    linkedComparables: z.array(LinkedComparableDto),
    comparativeFactors: z.array(ComparativeFactorDto),
    factorScores: z.array(FactorScoreDto),
    calculations: z.array(CalculationDto),
  })
  .passthrough();
const CompletePricingAnalysisRequest = z
  .object({
    marketValue: z.number(),
    appraisedValue: z.number(),
    forcedSaleValue: z.number().nullable(),
  })
  .passthrough();
const CompletePricingAnalysisResponse = z
  .object({
    id: z.string().uuid(),
    status: z.string(),
    valuationDate: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const AddMethodRequest = z
  .object({ methodType: z.string(), status: z.string().nullish().default(null) })
  .passthrough();
const AddMethodResponse = z
  .object({ id: z.string().uuid(), methodType: z.string(), status: z.string() })
  .passthrough();
const AddFactorScoreRequest = z
  .object({
    factorId: z.string().uuid(),
    factorWeight: z.number(),
    subjectValue: z.string().nullish().default(null),
    subjectScore: z.number().nullish().default(null),
    comparableValue: z.string().nullish().default(null),
    comparableScore: z.number().nullish().default(null),
    adjustmentPct: z.number().nullish().default(null),
    remarks: z.string().nullish().default(null),
  })
  .passthrough();
const AddFactorScoreResponse = z
  .object({
    factorScoreId: z.string().uuid(),
    factorId: z.string().uuid(),
    factorWeight: z.number(),
    subjectValue: z.string().nullable(),
    subjectScore: z.number().nullable(),
    comparableValue: z.string().nullable(),
    comparableScore: z.number().nullable(),
    scoreDifference: z.number().nullable(),
    weightedScore: z.number().nullable(),
    adjustmentPct: z.number().nullable(),
    displaySequence: z.number().int(),
  })
  .passthrough();
const AddCalculationRequest = z.object({ marketComparableId: z.string().uuid() }).passthrough();
const AddCalculationResponse = z.object({ calculationId: z.string().uuid() }).passthrough();
const AddApproachRequest = z
  .object({ approachType: z.string(), weight: z.number().nullish().default(null) })
  .passthrough();
const AddApproachResponse = z
  .object({
    id: z.string().uuid(),
    approachType: z.string(),
    weight: z.number().nullable(),
    status: z.string(),
  })
  .passthrough();
const UpdateMarketComparableTemplateRequest = z
  .object({
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullable(),
  })
  .passthrough();
const UpdateMarketComparableTemplateResponse = z.object({ id: z.string().uuid() }).passthrough();
const TemplateFactorDto = z
  .object({
    templateFactorId: z.string().uuid(),
    factorId: z.string().uuid(),
    factorCode: z.string(),
    factorName: z.string(),
    fieldName: z.string(),
    dataType: z.string(),
    fieldLength: z.number().int().nullable(),
    fieldDecimal: z.number().int().nullable(),
    parameterGroup: z.string().nullable(),
    displaySequence: z.number().int(),
    isMandatory: z.boolean(),
    isActive: z.boolean(),
  })
  .passthrough();
const MarketComparableTemplateDetailDto = z
  .object({
    id: z.string().uuid(),
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    factors: z.array(TemplateFactorDto),
    createdOn: z.string().datetime({ offset: true }).nullable(),
    updatedOn: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const GetMarketComparableTemplateByIdResult = z
  .object({ template: MarketComparableTemplateDetailDto })
  .passthrough();
const MarketComparableTemplateDto = z
  .object({
    id: z.string().uuid(),
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    createdOn: z.string().datetime({ offset: true }).nullable(),
    updatedOn: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const GetMarketComparableTemplatesResult = z
  .object({ templates: z.array(MarketComparableTemplateDto) })
  .passthrough();
const CreateMarketComparableTemplateRequest = z
  .object({
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullable(),
  })
  .passthrough();
const CreateMarketComparableTemplateResponse = z.object({ id: z.string().uuid() }).passthrough();
const AddFactorToTemplateRequest = z
  .object({
    factorId: z.string().uuid(),
    displaySequence: z.number().int(),
    isMandatory: z.boolean(),
  })
  .passthrough();
const AddFactorToTemplateResponse = z.object({ templateFactorId: z.string().uuid() }).passthrough();
const FactorDataItem = z
  .object({
    factorId: z.string().uuid(),
    value: z.string().nullable(),
    otherRemarks: z.string().nullish().default(null),
  })
  .passthrough();
const SetMarketComparableFactorDataRequest = z
  .object({ factorData: z.array(FactorDataItem) })
  .passthrough();
const MarketComparableDto = z
  .object({
    id: z.string().uuid(),
    comparableNumber: z.string(),
    propertyType: z.string(),
    province: z.string(),
    district: z.string().nullable(),
    subDistrict: z.string().nullable(),
    address: z.string().nullable(),
    transactionType: z.string().nullable(),
    transactionDate: z.string().datetime({ offset: true }).nullable(),
    transactionPrice: z.number().nullable(),
    pricePerUnit: z.number().nullable(),
    unitType: z.string().nullable(),
    dataSource: z.string(),
    dataConfidence: z.string().nullable(),
    isVerified: z.boolean(),
    status: z.string(),
    surveyDate: z.string().datetime({ offset: true }),
    createdOn: z.string().datetime({ offset: true }).nullable(),
  })
  .partial()
  .passthrough();
const PaginatedResultOfMarketComparableDto = z
  .object({
    items: z.array(MarketComparableDto),
    count: z.number().int(),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
  })
  .passthrough();
const GetMarketComparablesResponse = z
  .object({ result: PaginatedResultOfMarketComparableDto })
  .passthrough();
const CreateMarketComparableRequest = z
  .object({
    comparableNumber: z.string(),
    propertyType: z.string(),
    province: z.string(),
    dataSource: z.string(),
    surveyDate: z.string().datetime({ offset: true }),
    district: z.string().nullish().default(null),
    subDistrict: z.string().nullish().default(null),
    address: z.string().nullish().default(null),
    latitude: z.number().nullish().default(null),
    longitude: z.number().nullish().default(null),
    transactionType: z.string().nullish().default(null),
    transactionDate: z.string().datetime({ offset: true }).nullish().default(null),
    transactionPrice: z.number().nullish().default(null),
    pricePerUnit: z.number().nullish().default(null),
    unitType: z.string().nullish().default(null),
    description: z.string().nullish().default(null),
    notes: z.string().nullish().default(null),
    templateId: z.string().uuid().nullish().default(null),
  })
  .passthrough();
const CreateMarketComparableResponse = z.object({ id: z.string().uuid() }).passthrough();
const FactorDataDto = z
  .object({
    id: z.string().uuid(),
    factorId: z.string().uuid(),
    value: z.string().nullable(),
    otherRemarks: z.string().nullable(),
  })
  .partial()
  .passthrough();
const ImageDto = z
  .object({
    id: z.string().uuid(),
    documentId: z.string().uuid(),
    displaySequence: z.number().int(),
    title: z.string().nullable(),
    description: z.string().nullable(),
  })
  .partial()
  .passthrough();
const MarketComparableDetailDto = z
  .object({
    id: z.string().uuid(),
    comparableNumber: z.string(),
    propertyType: z.string(),
    province: z.string(),
    district: z.string().nullable(),
    subDistrict: z.string().nullable(),
    address: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    transactionType: z.string().nullable(),
    transactionDate: z.string().datetime({ offset: true }).nullable(),
    transactionPrice: z.number().nullable(),
    pricePerUnit: z.number().nullable(),
    unitType: z.string().nullable(),
    dataSource: z.string(),
    dataConfidence: z.string().nullable(),
    isVerified: z.boolean(),
    verifiedAt: z.string().datetime({ offset: true }).nullable(),
    verifiedBy: z.string().uuid().nullable(),
    status: z.string(),
    expiryDate: z.string().datetime({ offset: true }).nullable(),
    surveyDate: z.string().datetime({ offset: true }),
    surveyedBy: z.string().uuid().nullable(),
    description: z.string().nullable(),
    notes: z.string().nullable(),
    templateId: z.string().uuid().nullable(),
    createdOn: z.string().datetime({ offset: true }).nullable(),
    createdBy: z.string().nullable(),
    updatedOn: z.string().datetime({ offset: true }).nullable(),
    updatedBy: z.string().nullable(),
    factorData: z.array(FactorDataDto),
    images: z.array(ImageDto),
  })
  .partial()
  .passthrough();
const GetMarketComparableByIdResponse = z
  .object({ marketComparable: MarketComparableDetailDto })
  .passthrough();
const AddMarketComparableImageRequest = z
  .object({
    documentId: z.string().uuid(),
    title: z.string().nullish().default(null),
    description: z.string().nullish().default(null),
  })
  .passthrough();
const AddMarketComparableImageResponse = z.object({ imageId: z.string().uuid() }).passthrough();
const UpdateMarketComparableFactorRequest = z
  .object({
    factorName: z.string(),
    fieldName: z.string(),
    fieldLength: z.number().int().nullable(),
    fieldDecimal: z.number().int().nullable(),
    parameterGroup: z.string().nullable(),
  })
  .passthrough();
const UpdateMarketComparableFactorResult = z.object({ id: z.string().uuid() }).passthrough();
const MarketComparableFactorDto = z
  .object({
    id: z.string().uuid(),
    factorCode: z.string(),
    factorName: z.string(),
    fieldName: z.string(),
    dataType: z.string(),
    fieldLength: z.number().int().nullable(),
    fieldDecimal: z.number().int().nullable(),
    parameterGroup: z.string().nullable(),
    isActive: z.boolean(),
  })
  .passthrough();
const CreateMarketComparableFactorRequest = z
  .object({
    factorCode: z.string(),
    factorName: z.string(),
    fieldName: z.string(),
    dataType: z.string(),
    fieldLength: z.number().int().nullable(),
    fieldDecimal: z.number().int().nullable(),
    parameterGroup: z.string().nullable(),
  })
  .passthrough();
const CreateMarketComparableFactorResponse = z.object({ id: z.string().uuid() }).passthrough();
const UpdateDocumentTypeRequest = z
  .object({
    name: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    sortOrder: z.number().int(),
    isActive: z.boolean(),
  })
  .passthrough();
const UpdateDocumentRequirementRequest = z
  .object({ isRequired: z.boolean(), isActive: z.boolean(), notes: z.string().nullable() })
  .passthrough();
const DocumentTypeDto = z
  .object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    isActive: z.boolean(),
    sortOrder: z.number().int(),
    createdOn: z.string().datetime({ offset: true }).nullable(),
    updatedOn: z.string().datetime({ offset: true }).nullable(),
  })
  .partial()
  .passthrough();
const CreateDocumentTypeRequest = z
  .object({
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    sortOrder: z.number().int().optional().default(0),
  })
  .passthrough();
const CreateDocumentTypeResult = z
  .object({ id: z.string().uuid(), code: z.string(), name: z.string() })
  .passthrough();
const DocumentRequirementDto = z
  .object({
    id: z.string().uuid(),
    documentTypeId: z.string().uuid(),
    documentTypeCode: z.string(),
    documentTypeName: z.string(),
    documentTypeCategory: z.string().nullable(),
    collateralTypeCode: z.string().nullable(),
    collateralTypeName: z.string().nullable(),
    isRequired: z.boolean(),
    isActive: z.boolean(),
    notes: z.string().nullable(),
    createdOn: z.string().datetime({ offset: true }).nullable(),
    updatedOn: z.string().datetime({ offset: true }).nullable(),
  })
  .partial()
  .passthrough();
const CreateDocumentRequirementRequest = z
  .object({
    documentTypeId: z.string().uuid(),
    collateralTypeCode: z.string().nullable(),
    isRequired: z.boolean(),
    notes: z.string().nullable(),
  })
  .passthrough();
const CreateDocumentRequirementResponse = z.object({ id: z.string().uuid() }).passthrough();
const DocumentChecklistItemDto = z
  .object({
    documentTypeId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    category: z.string().nullable(),
    isRequired: z.boolean(),
    notes: z.string().nullable(),
  })
  .partial()
  .passthrough();
const CollateralDocumentGroupDto = z
  .object({
    collateralTypeCode: z.string(),
    collateralTypeName: z.string(),
    documents: z.array(z.unknown()),
  })
  .passthrough();
const GetDocumentChecklistResponse = z
  .object({
    applicationDocuments: z.array(DocumentChecklistItemDto),
    collateralGroups: z.array(CollateralDocumentGroupDto),
  })
  .passthrough();
const UpdateTemplateRequest = z
  .object({
    templateName: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean().nullable(),
  })
  .passthrough();
const UpdateTemplateResult = z
  .object({
    id: z.string().uuid(),
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
  })
  .passthrough();
const TemplateFactorDto2 = z
  .object({
    id: z.string().uuid(),
    factorId: z.string().uuid(),
    displaySequence: z.number().int(),
    isMandatory: z.boolean(),
    defaultWeight: z.number().nullable(),
  })
  .passthrough();
const GetTemplateByIdResult = z
  .object({
    id: z.string().uuid(),
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    factors: z.array(TemplateFactorDto2),
  })
  .passthrough();
const TemplateDto = z
  .object({
    id: z.string().uuid(),
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    factorCount: z.number().int(),
  })
  .passthrough();
const CreateTemplateRequest = z
  .object({
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullish().default(null),
  })
  .passthrough();
const CreateTemplateResult = z
  .object({
    templateId: z.string().uuid(),
    templateCode: z.string(),
    templateName: z.string(),
    propertyType: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
  })
  .passthrough();
const AddFactorToTemplateRequest2 = z
  .object({
    factorId: z.string().uuid(),
    displaySequence: z.number().int(),
    isMandatory: z.boolean().optional().default(false),
    defaultWeight: z.number().nullish().default(null),
  })
  .passthrough();
const AddFactorToTemplateResult = z
  .object({
    templateFactorId: z.string().uuid(),
    templateId: z.string().uuid(),
    factorId: z.string().uuid(),
    displaySequence: z.number().int(),
    isMandatory: z.boolean(),
    defaultWeight: z.number().nullable(),
  })
  .passthrough();
const CommitteeDto = z
  .object({
    id: z.string().uuid(),
    committeeName: z.string(),
    committeeCode: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    quorumType: z.string(),
    quorumValue: z.number().int(),
    majorityType: z.string(),
    memberCount: z.number().int(),
    conditionCount: z.number().int(),
    createdOn: z.string().datetime({ offset: true }).nullable(),
  })
  .partial()
  .passthrough();
const PaginatedResultOfCommitteeDto = z
  .object({
    items: z.array(CommitteeDto),
    count: z.number().int(),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
  })
  .passthrough();
const GetCommitteesResponse = z.object({ result: PaginatedResultOfCommitteeDto }).passthrough();
const CreateCommitteeRequest = z
  .object({
    committeeName: z.string(),
    committeeCode: z.string(),
    quorumType: z.string(),
    quorumValue: z.number().int(),
    majorityType: z.string(),
    description: z.string().nullish().default(null),
  })
  .passthrough();
const CreateCommitteeResponse = z.object({ id: z.string().uuid() }).passthrough();
const UpdateVesselPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    vesselName: z.string().nullable().default(null),
    engineNo: z.string().nullable().default(null),
    registrationNo: z.string().nullable().default(null),
    registrationDate: z.string().datetime({ offset: true }).nullable().default(null),
    brand: z.string().nullable().default(null),
    model: z.string().nullable().default(null),
    yearOfManufacture: z.number().int().nullable().default(null),
    placeOfManufacture: z.string().nullable().default(null),
    vesselType: z.string().nullable().default(null),
    classOfVessel: z.string().nullable().default(null),
    purchaseDate: z.string().datetime({ offset: true }).nullable().default(null),
    purchasePrice: z.number().nullable().default(null),
    engineCapacity: z.string().nullable().default(null),
    width: z.number().nullable().default(null),
    length: z.number().nullable().default(null),
    height: z.number().nullable().default(null),
    grossTonnage: z.number().nullable().default(null),
    netTonnage: z.number().nullable().default(null),
    energyUse: z.string().nullable().default(null),
    energyUseRemark: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    canUse: z.boolean().nullable().default(null),
    formerName: z.string().nullable().default(null),
    vesselCurrentName: z.string().nullable().default(null),
    location: z.string().nullable().default(null),
    conditionUse: z.string().nullable().default(null),
    vesselCondition: z.string().nullable().default(null),
    vesselAge: z.number().int().nullable().default(null),
    vesselEfficiency: z.string().nullable().default(null),
    vesselTechnology: z.string().nullable().default(null),
    usePurpose: z.string().nullable().default(null),
    vesselPart: z.string().nullable().default(null),
    remark: z.string().nullable().default(null),
    other: z.string().nullable().default(null),
    appraiserOpinion: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const GetVesselPropertyResponse = z
  .object({
    propertyId: z.string().uuid(),
    appraisalId: z.string().uuid(),
    sequenceNumber: z.number().int(),
    propertyType: z.string(),
    description: z.string().nullable(),
    detailId: z.string().uuid(),
    propertyName: z.string().nullable(),
    vesselName: z.string().nullable(),
    engineNo: z.string().nullable(),
    registrationNo: z.string().nullable(),
    registrationDate: z.string().datetime({ offset: true }).nullable(),
    brand: z.string().nullable(),
    model: z.string().nullable(),
    yearOfManufacture: z.number().int().nullable(),
    placeOfManufacture: z.string().nullable(),
    vesselType: z.string().nullable(),
    classOfVessel: z.string().nullable(),
    purchaseDate: z.string().datetime({ offset: true }).nullable(),
    purchasePrice: z.number().nullable(),
    engineCapacity: z.string().nullable(),
    width: z.number().nullable(),
    length: z.number().nullable(),
    height: z.number().nullable(),
    grossTonnage: z.number().nullable(),
    netTonnage: z.number().nullable(),
    energyUse: z.string().nullable(),
    energyUseRemark: z.string().nullable(),
    owner: z.string(),
    verifiableOwner: z.boolean(),
    canUse: z.boolean(),
    formerName: z.string().nullable(),
    vesselCurrentName: z.string().nullable(),
    location: z.string().nullable(),
    conditionUse: z.string().nullable(),
    vesselCondition: z.string().nullable(),
    vesselAge: z.number().int().nullable(),
    vesselEfficiency: z.string().nullable(),
    vesselTechnology: z.string().nullable(),
    usePurpose: z.string().nullable(),
    vesselPart: z.string().nullable(),
    remark: z.string().nullable(),
    other: z.string().nullable(),
    appraiserOpinion: z.string().nullable(),
  })
  .passthrough();
const UpdateVehiclePropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    vehicleName: z.string().nullable().default(null),
    engineNo: z.string().nullable().default(null),
    chassisNo: z.string().nullable().default(null),
    registrationNo: z.string().nullable().default(null),
    brand: z.string().nullable().default(null),
    model: z.string().nullable().default(null),
    yearOfManufacture: z.number().int().nullable().default(null),
    countryOfManufacture: z.string().nullable().default(null),
    purchaseDate: z.string().datetime({ offset: true }).nullable().default(null),
    purchasePrice: z.number().nullable().default(null),
    capacity: z.string().nullable().default(null),
    width: z.number().nullable().default(null),
    length: z.number().nullable().default(null),
    height: z.number().nullable().default(null),
    energyUse: z.string().nullable().default(null),
    energyUseRemark: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    canUse: z.boolean().nullable().default(null),
    location: z.string().nullable().default(null),
    conditionUse: z.string().nullable().default(null),
    vehicleCondition: z.string().nullable().default(null),
    vehicleAge: z.number().int().nullable().default(null),
    vehicleEfficiency: z.string().nullable().default(null),
    vehicleTechnology: z.string().nullable().default(null),
    usePurpose: z.string().nullable().default(null),
    vehiclePart: z.string().nullable().default(null),
    remark: z.string().nullable().default(null),
    other: z.string().nullable().default(null),
    appraiserOpinion: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const GetVehiclePropertyResponse = z
  .object({
    propertyId: z.string().uuid(),
    appraisalId: z.string().uuid(),
    sequenceNumber: z.number().int(),
    propertyType: z.string(),
    description: z.string().nullable(),
    detailId: z.string().uuid(),
    propertyName: z.string().nullable(),
    vehicleName: z.string().nullable(),
    engineNo: z.string().nullable(),
    chassisNo: z.string().nullable(),
    registrationNo: z.string().nullable(),
    brand: z.string().nullable(),
    model: z.string().nullable(),
    yearOfManufacture: z.number().int().nullable(),
    countryOfManufacture: z.string().nullable(),
    purchaseDate: z.string().datetime({ offset: true }).nullable(),
    purchasePrice: z.number().nullable(),
    capacity: z.string().nullable(),
    width: z.number().nullable(),
    length: z.number().nullable(),
    height: z.number().nullable(),
    energyUse: z.string().nullable(),
    energyUseRemark: z.string().nullable(),
    owner: z.string(),
    verifiableOwner: z.boolean(),
    canUse: z.boolean(),
    location: z.string().nullable(),
    conditionUse: z.string().nullable(),
    vehicleCondition: z.string().nullable(),
    vehicleAge: z.number().int().nullable(),
    vehicleEfficiency: z.string().nullable(),
    vehicleTechnology: z.string().nullable(),
    usePurpose: z.string().nullable(),
    vehiclePart: z.string().nullable(),
    remark: z.string().nullable(),
    other: z.string().nullable(),
    appraiserOpinion: z.string().nullable(),
  })
  .passthrough();
const UpdatePropertyGroupRequest = z
  .object({ groupName: z.string(), description: z.string().nullable(), useSystemCalc: z.boolean() })
  .passthrough();
const UpdatePropertyGroupResponse = z.object({ id: z.string().uuid() }).passthrough();
const PropertyGroupItemDto = z
  .object({
    propertyId: z.string().uuid(),
    sequenceInGroup: z.number().int(),
    propertyType: z.string(),
    appraisalDetailId: z.string().uuid(),
    location: z.string(),
  })
  .passthrough();
const GetPropertyGroupByIdResponse = z
  .object({
    id: z.string().uuid(),
    groupNumber: z.number().int(),
    groupName: z.string(),
    description: z.string().nullable(),
    useSystemCalc: z.boolean(),
    properties: z.array(PropertyGroupItemDto),
  })
  .passthrough();
const DeletePropertyGroupResponse = z.object({ success: z.boolean() }).passthrough();
const UpdateMachineryPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    machineName: z.string().nullable().default(null),
    engineNo: z.string().nullable().default(null),
    chassisNo: z.string().nullable().default(null),
    registrationNo: z.string().nullable().default(null),
    brand: z.string().nullable().default(null),
    model: z.string().nullable().default(null),
    yearOfManufacture: z.number().int().nullable().default(null),
    countryOfManufacture: z.string().nullable().default(null),
    purchaseDate: z.string().datetime({ offset: true }).nullable().default(null),
    purchasePrice: z.number().nullable().default(null),
    capacity: z.string().nullable().default(null),
    width: z.number().nullable().default(null),
    length: z.number().nullable().default(null),
    height: z.number().nullable().default(null),
    energyUse: z.string().nullable().default(null),
    energyUseRemark: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    canUse: z.boolean().nullable().default(null),
    location: z.string().nullable().default(null),
    conditionUse: z.string().nullable().default(null),
    machineCondition: z.string().nullable().default(null),
    machineAge: z.number().int().nullable().default(null),
    machineEfficiency: z.string().nullable().default(null),
    machineTechnology: z.string().nullable().default(null),
    usePurpose: z.string().nullable().default(null),
    machinePart: z.string().nullable().default(null),
    remark: z.string().nullable().default(null),
    other: z.string().nullable().default(null),
    appraiserOpinion: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const GetMachineryPropertyResponse = z
  .object({
    propertyId: z.string().uuid(),
    appraisalId: z.string().uuid(),
    sequenceNumber: z.number().int(),
    propertyType: z.string(),
    description: z.string().nullable(),
    detailId: z.string().uuid(),
    propertyName: z.string().nullable(),
    machineName: z.string().nullable(),
    engineNo: z.string().nullable(),
    chassisNo: z.string().nullable(),
    registrationNo: z.string().nullable(),
    brand: z.string().nullable(),
    model: z.string().nullable(),
    yearOfManufacture: z.number().int().nullable(),
    countryOfManufacture: z.string().nullable(),
    purchaseDate: z.string().datetime({ offset: true }).nullable(),
    purchasePrice: z.number().nullable(),
    capacity: z.string().nullable(),
    width: z.number().nullable(),
    length: z.number().nullable(),
    height: z.number().nullable(),
    energyUse: z.string().nullable(),
    energyUseRemark: z.string().nullable(),
    owner: z.string(),
    verifiableOwner: z.boolean(),
    canUse: z.boolean(),
    location: z.string().nullable(),
    conditionUse: z.string().nullable(),
    machineCondition: z.string().nullable(),
    machineAge: z.number().int().nullable(),
    machineEfficiency: z.string().nullable(),
    machineTechnology: z.string().nullable(),
    usePurpose: z.string().nullable(),
    machinePart: z.string().nullable(),
    remark: z.string().nullable(),
    other: z.string().nullable(),
    appraiserOpinion: z.string().nullable(),
  })
  .passthrough();
const UpdateLandPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    landDescription: z.string().nullable().default(null),
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    subDistrict: z.string().nullable().default(null),
    district: z.string().nullable().default(null),
    province: z.string().nullable().default(null),
    landOffice: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    hasObligation: z.boolean().nullable().default(null),
    obligationDetails: z.string().nullable().default(null),
    isLandLocationVerified: z.boolean().nullable().default(null),
    landCheckMethodType: z.string().nullable().default(null),
    landCheckMethodTypeOther: z.string().nullable().default(null),
    street: z.string().nullable().default(null),
    soi: z.string().nullable().default(null),
    distanceFromMainRoad: z.number().nullable().default(null),
    village: z.string().nullable().default(null),
    addressLocation: z.string().nullable().default(null),
    landShapeType: z.string().nullable().default(null),
    urbanPlanningType: z.string().nullable().default(null),
    landZoneType: z.array(z.string()).nullable().default(null),
    plotLocationType: z.array(z.string()).nullable().default(null),
    plotLocationTypeOther: z.string().nullable().default(null),
    landFillType: z.string().nullable().default(null),
    landFillTypeOther: z.string().nullable().default(null),
    landFillPercent: z.number().nullable().default(null),
    soilLevel: z.number().nullable().default(null),
    accessRoadWidth: z.number().nullable().default(null),
    rightOfWay: z.number().nullable().default(null),
    roadFrontage: z.number().nullable().default(null),
    numberOfSidesFacingRoad: z.number().int().nullable().default(null),
    roadPassInFrontOfLand: z.string().nullable().default(null),
    landAccessibilityType: z.string().nullable().default(null),
    landAccessibilityRemark: z.string().nullable().default(null),
    roadSurfaceType: z.string().nullable().default(null),
    roadSurfaceTypeOther: z.string().nullable().default(null),
    hasElectricity: z.boolean().nullable().default(null),
    electricityDistance: z.number().nullable().default(null),
    publicUtilityType: z.array(z.string()).nullable().default(null),
    publicUtilityTypeOther: z.string().nullable().default(null),
    landUseType: z.array(z.string()).nullable().default(null),
    landUseTypeOther: z.string().nullable().default(null),
    landEntranceExitType: z.array(z.string()).nullable().default(null),
    landEntranceExitTypeOther: z.string().nullable().default(null),
    transportationAccessType: z.array(z.string()).nullable().default(null),
    transportationAccessTypeOther: z.string().nullable().default(null),
    propertyAnticipationType: z.string().nullable().default(null),
    isExpropriated: z.boolean().nullable().default(null),
    expropriationRemark: z.string().nullable().default(null),
    isInExpropriationLine: z.boolean().nullable().default(null),
    expropriationLineRemark: z.string().nullable().default(null),
    royalDecree: z.string().nullable().default(null),
    isEncroached: z.boolean().nullable().default(null),
    encroachmentRemark: z.string().nullable().default(null),
    encroachmentArea: z.number().nullable().default(null),
    isLandlocked: z.boolean().nullable().default(null),
    landlockedRemark: z.string().nullable().default(null),
    isForestBoundary: z.boolean().nullable().default(null),
    forestBoundaryRemark: z.string().nullable().default(null),
    otherLegalLimitations: z.string().nullable().default(null),
    evictionType: z.array(z.string()).nullable().default(null),
    evictionTypeOther: z.string().nullable().default(null),
    allocationType: z.string().nullable().default(null),
    northAdjacentArea: z.string().nullable().default(null),
    northBoundaryLength: z.number().nullable().default(null),
    southAdjacentArea: z.string().nullable().default(null),
    southBoundaryLength: z.number().nullable().default(null),
    eastAdjacentArea: z.string().nullable().default(null),
    eastBoundaryLength: z.number().nullable().default(null),
    westAdjacentArea: z.string().nullable().default(null),
    westBoundaryLength: z.number().nullable().default(null),
    pondArea: z.number().nullable().default(null),
    pondDepth: z.number().nullable().default(null),
    hasBuilding: z.boolean().nullable().default(null),
    hasBuildingOther: z.string().nullable().default(null),
    remark: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const GetLandPropertyResponse = z
  .object({
    propertyId: z.string().uuid(),
    appraisalId: z.string().uuid(),
    sequenceNumber: z.number().int(),
    propertyType: z.string(),
    description: z.string().nullable(),
    landDetailId: z.string().uuid().nullable(),
    propertyName: z.string().nullable(),
    landOffice: z.string().nullable(),
    landDescription: z.string().nullable(),
    ownerName: z.string().nullable(),
    isOwnerVerified: z.boolean(),
    hasObligation: z.boolean(),
    obligationDetails: z.string().nullable(),
    street: z.string().nullable(),
    soi: z.string().nullable(),
    village: z.string().nullable(),
    subDistrict: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    isLandLocationVerified: z.boolean().nullable(),
    landCheckMethodType: z.string().nullable(),
    landCheckMethodTypeOther: z.string().nullable(),
    distanceFromMainRoad: z.number().nullable(),
    addressLocation: z.string().nullable(),
    landShapeType: z.string().nullable(),
    urbanPlanningType: z.string().nullable(),
    landZoneType: z.array(z.string()).nullable(),
    plotLocationType: z.array(z.string()).nullable(),
    plotLocationTypeOther: z.string().nullable(),
    landFillType: z.string().nullable(),
    landFillTypeOther: z.string().nullable(),
    landFillPercent: z.number().nullable(),
    soilLevel: z.number().nullable(),
    accessRoadWidth: z.number().nullable(),
    rightOfWay: z.number().nullable(),
    roadFrontage: z.number().nullable(),
    numberOfSidesFacingRoad: z.number().int().nullable(),
    roadPassInFrontOfLand: z.string().nullable(),
    landAccessibilityType: z.string().nullable(),
    landAccessibilityRemark: z.string().nullable(),
    roadSurfaceType: z.string().nullable(),
    roadSurfaceTypeOther: z.string().nullable(),
    hasElectricity: z.boolean().nullable(),
    electricityDistance: z.number().nullable(),
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
    encroachmentArea: z.number().nullable(),
    isLandlocked: z.boolean().nullable(),
    landlockedRemark: z.string().nullable(),
    isForestBoundary: z.boolean().nullable(),
    forestBoundaryRemark: z.string().nullable(),
    otherLegalLimitations: z.string().nullable(),
    evictionType: z.array(z.string()).nullable(),
    evictionTypeOther: z.string().nullable(),
    allocationType: z.string().nullable(),
    northAdjacentArea: z.string().nullable(),
    northBoundaryLength: z.number().nullable(),
    southAdjacentArea: z.string().nullable(),
    southBoundaryLength: z.number().nullable(),
    eastAdjacentArea: z.string().nullable(),
    eastBoundaryLength: z.number().nullable(),
    westAdjacentArea: z.string().nullable(),
    westBoundaryLength: z.number().nullable(),
    pondArea: z.number().nullable(),
    pondDepth: z.number().nullable(),
    hasBuilding: z.boolean().nullable(),
    hasBuildingOther: z.string().nullable(),
    remark: z.string().nullable(),
  })
  .partial()
  .passthrough();
const UpdateLandAndBuildingPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    landDescription: z.string().nullable().default(null),
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    subDistrict: z.string().nullable().default(null),
    district: z.string().nullable().default(null),
    province: z.string().nullable().default(null),
    landOffice: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    hasObligation: z.boolean().nullable().default(null),
    obligationDetails: z.string().nullable().default(null),
    isLandLocationVerified: z.boolean().nullable().default(null),
    landCheckMethodType: z.string().nullable().default(null),
    landCheckMethodTypeOther: z.string().nullable().default(null),
    street: z.string().nullable().default(null),
    soi: z.string().nullable().default(null),
    distanceFromMainRoad: z.number().nullable().default(null),
    village: z.string().nullable().default(null),
    addressLocation: z.string().nullable().default(null),
    landShapeType: z.string().nullable().default(null),
    urbanPlanningType: z.string().nullable().default(null),
    landZoneType: z.array(z.string()).nullable().default(null),
    plotLocationType: z.array(z.string()).nullable().default(null),
    plotLocationTypeOther: z.string().nullable().default(null),
    landFillType: z.string().nullable().default(null),
    landFillTypeOther: z.string().nullable().default(null),
    landFillPercent: z.number().nullable().default(null),
    soilLevel: z.number().nullable().default(null),
    accessRoadWidth: z.number().nullable().default(null),
    rightOfWay: z.number().int().nullable().default(null),
    roadFrontage: z.number().nullable().default(null),
    numberOfSidesFacingRoad: z.number().int().nullable().default(null),
    roadPassInFrontOfLand: z.string().nullable().default(null),
    landAccessibilityType: z.string().nullable().default(null),
    landAccessibilityRemark: z.string().nullable().default(null),
    roadSurfaceType: z.string().nullable().default(null),
    roadSurfaceTypeOther: z.string().nullable().default(null),
    hasElectricity: z.boolean().nullable().default(null),
    electricityDistance: z.number().nullable().default(null),
    publicUtilityType: z.array(z.string()).nullable().default(null),
    publicUtilityTypeOther: z.string().nullable().default(null),
    landUseType: z.array(z.string()).nullable().default(null),
    landUseTypeOther: z.string().nullable().default(null),
    landEntranceExitType: z.array(z.string()).nullable().default(null),
    landEntranceExitTypeOther: z.string().nullable().default(null),
    transportationAccessType: z.array(z.string()).nullable().default(null),
    transportationAccessTypeOther: z.string().nullable().default(null),
    propertyAnticipationType: z.string().nullable().default(null),
    isExpropriated: z.boolean().nullable().default(null),
    expropriationRemark: z.string().nullable().default(null),
    isInExpropriationLine: z.boolean().nullable().default(null),
    expropriationLineRemark: z.string().nullable().default(null),
    royalDecree: z.string().nullable().default(null),
    isEncroached: z.boolean().nullable().default(null),
    encroachmentRemark: z.string().nullable().default(null),
    encroachmentArea: z.number().nullable().default(null),
    isLandlocked: z.boolean().nullable().default(null),
    landlockedRemark: z.string().nullable().default(null),
    isForestBoundary: z.boolean().nullable().default(null),
    forestBoundaryRemark: z.string().nullable().default(null),
    otherLegalLimitations: z.string().nullable().default(null),
    evictionType: z.array(z.string()).nullable().default(null),
    evictionTypeOther: z.string().nullable().default(null),
    allocationType: z.string().nullable().default(null),
    northAdjacentArea: z.string().nullable().default(null),
    northBoundaryLength: z.number().nullable().default(null),
    southAdjacentArea: z.string().nullable().default(null),
    southBoundaryLength: z.number().nullable().default(null),
    eastAdjacentArea: z.string().nullable().default(null),
    eastBoundaryLength: z.number().nullable().default(null),
    westAdjacentArea: z.string().nullable().default(null),
    westBoundaryLength: z.number().nullable().default(null),
    pondArea: z.number().nullable().default(null),
    pondDepth: z.number().nullable().default(null),
    buildingNumber: z.string().nullable().default(null),
    modelName: z.string().nullable().default(null),
    builtOnTitleNumber: z.string().nullable().default(null),
    houseNumber: z.string().nullable().default(null),
    buildingConditionType: z.string().nullable().default(null),
    isUnderConstruction: z.boolean().nullable().default(null),
    constructionCompletionPercent: z.number().nullable().default(null),
    constructionLicenseExpirationDate: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .default(null),
    isAppraisable: z.boolean().nullable().default(null),
    buildingType: z.string().nullable().default(null),
    buildingTypeOther: z.string().nullable().default(null),
    numberOfFloors: z.number().nullable().default(null),
    decorationType: z.string().nullable().default(null),
    decorationTypeOther: z.string().nullable().default(null),
    isEncroachingOthers: z.boolean().nullable().default(null),
    encroachingOthersRemark: z.string().nullable().default(null),
    encroachingOthersArea: z.number().nullable().default(null),
    buildingMaterialType: z.string().nullable().default(null),
    buildingStyleType: z.string().nullable().default(null),
    isResidential: z.boolean().nullable().default(null),
    buildingAge: z.number().int().nullable().default(null),
    constructionYear: z.number().int().nullable().default(null),
    residentialRemark: z.string().nullable().default(null),
    constructionStyleType: z.string().nullable().default(null),
    constructionStyleRemark: z.string().nullable().default(null),
    structureType: z.array(z.string()).nullable().default(null),
    structureTypeOther: z.string().nullable().default(null),
    roofFrameType: z.array(z.string()).nullable().default(null),
    roofFrameTypeOther: z.string().nullable().default(null),
    roofType: z.array(z.string()).nullable().default(null),
    roofTypeOther: z.string().nullable().default(null),
    ceilingType: z.array(z.string()).nullable().default(null),
    ceilingTypeOther: z.string().nullable().default(null),
    interiorWallType: z.array(z.string()).nullable().default(null),
    interiorWallTypeOther: z.string().nullable().default(null),
    exteriorWallType: z.array(z.string()).nullable().default(null),
    exteriorWallTypeOther: z.string().nullable().default(null),
    fenceType: z.array(z.string()).nullable().default(null),
    fenceTypeOther: z.string().nullable().default(null),
    constructionType: z.string().nullable().default(null),
    constructionTypeOther: z.string().nullable().default(null),
    utilizationType: z.string().nullable().default(null),
    otherPurposeUsage: z.string().nullable().default(null),
    totalBuildingArea: z.number().nullable().default(null),
    buildingInsurancePrice: z.number().nullable().default(null),
    sellingPrice: z.number().nullable().default(null),
    forcedSalePrice: z.number().nullable().default(null),
    landRemark: z.string().nullable().default(null),
    buildingRemark: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const GetLandAndBuildingPropertyResponse = z
  .object({
    propertyId: z.string().uuid(),
    appraisalId: z.string().uuid(),
    sequenceNumber: z.number().int(),
    propertyType: z.string(),
    description: z.string().nullable(),
    detailId: z.string().uuid(),
    propertyName: z.string().nullable(),
    landDescription: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    subDistrict: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string().nullable(),
    landOffice: z.string().nullable(),
    ownerName: z.string().nullable(),
    isOwnerVerified: z.boolean().nullable(),
    hasObligation: z.boolean().nullable(),
    obligationDetails: z.string().nullable(),
    isLandLocationVerified: z.boolean().nullable(),
    landCheckMethodType: z.string().nullable(),
    landCheckMethodTypeOther: z.string().nullable(),
    street: z.string().nullable(),
    soi: z.string().nullable(),
    distanceFromMainRoad: z.number().nullable(),
    village: z.string().nullable(),
    addressLocation: z.string().nullable(),
    landShapeType: z.string().nullable(),
    urbanPlanningType: z.string().nullable(),
    landZoneType: z.array(z.string()).nullable(),
    plotLocationType: z.array(z.string()).nullable(),
    plotLocationOther: z.string().nullable(),
    landFillType: z.string().nullable(),
    landFillTypeOther: z.string().nullable(),
    landFillPercent: z.number().nullable(),
    soilLevel: z.number().nullable(),
    accessRoadWidth: z.number().nullable(),
    rightOfWay: z.number().int().nullable(),
    roadFrontage: z.number().nullable(),
    numberOfSidesFacingRoad: z.number().int().nullable(),
    roadPassInFrontOfLand: z.string().nullable(),
    landAccessibilityType: z.string().nullable(),
    landAccessibilityRemark: z.string().nullable(),
    roadSurfaceType: z.string().nullable(),
    roadSurfaceTypeOther: z.string().nullable(),
    hasElectricity: z.boolean().nullable(),
    electricityDistance: z.number().nullable(),
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
    encroachmentArea: z.number().nullable(),
    isLandlocked: z.boolean().nullable(),
    landlockedRemark: z.string().nullable(),
    isForestBoundary: z.boolean().nullable(),
    forestBoundaryRemark: z.string().nullable(),
    otherLegalLimitations: z.string().nullable(),
    evictionType: z.array(z.string()).nullable(),
    evictionTypeOther: z.string().nullable(),
    allocationType: z.string().nullable(),
    northAdjacentArea: z.string().nullable(),
    northBoundaryLength: z.number().nullable(),
    southAdjacentArea: z.string().nullable(),
    southBoundaryLength: z.number().nullable(),
    eastAdjacentArea: z.string().nullable(),
    eastBoundaryLength: z.number().nullable(),
    westAdjacentArea: z.string().nullable(),
    westBoundaryLength: z.number().nullable(),
    pondArea: z.number().nullable(),
    pondDepth: z.number().nullable(),
    hasBuilding: z.boolean().nullable(),
    hasBuildingOther: z.string().nullable(),
    buildingNumber: z.string().nullable(),
    modelName: z.string().nullable(),
    builtOnTitleNumber: z.string().nullable(),
    houseNumber: z.string().nullable(),
    buildingConditionType: z.string().nullable(),
    isUnderConstruction: z.boolean().nullable(),
    constructionCompletionPercent: z.number().nullable(),
    constructionLicenseExpirationDate: z.string().datetime({ offset: true }).nullable(),
    isAppraisable: z.boolean().nullable(),
    buildingType: z.string().nullable(),
    buildingTypeOther: z.string().nullable(),
    numberOfFloors: z.number().nullable(),
    decorationType: z.string().nullable(),
    decorationTypeOther: z.string().nullable(),
    isEncroachingOthers: z.boolean().nullable(),
    encroachingOthersRemark: z.string().nullable(),
    encroachingOthersArea: z.number().nullable(),
    buildingMaterialType: z.string().nullable(),
    buildingStyleType: z.string().nullable(),
    isResidential: z.boolean().nullable(),
    buildingAge: z.number().int().nullable(),
    constructionYear: z.number().int().nullable(),
    residentialRemark: z.string().nullable(),
    constructionStyleType: z.string().nullable(),
    constructionStyleRemark: z.string().nullable(),
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
    totalBuildingArea: z.number().nullable(),
    buildingInsurancePrice: z.number().nullable(),
    sellingPrice: z.number().nullable(),
    forcedSalePrice: z.number().nullable(),
    landRemark: z.string().nullable(),
    buildingRemark: z.string().nullable(),
  })
  .passthrough();
const UpdateCondoPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    condoName: z.string().nullable().default(null),
    buildingNumber: z.string().nullable().default(null),
    modelName: z.string().nullable().default(null),
    builtOnTitleNumber: z.string().nullable().default(null),
    condoRegistrationNumber: z.string().nullable().default(null),
    roomNumber: z.string().nullable().default(null),
    floorNumber: z.number().int().nullable().default(null),
    usableArea: z.number().nullable().default(null),
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    subDistrict: z.string().nullable().default(null),
    district: z.string().nullable().default(null),
    province: z.string().nullable().default(null),
    landOffice: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    buildingConditionType: z.string().nullable().default(null),
    hasObligation: z.boolean().nullable().default(null),
    obligationDetails: z.string().nullable().default(null),
    isDocumentValidated: z.boolean().nullable().default(null),
    locationType: z.string().nullable().default(null),
    street: z.string().nullable().default(null),
    soi: z.string().nullable().default(null),
    distanceFromMainRoad: z.number().nullable().default(null),
    accessRoadWidth: z.number().nullable().default(null),
    rightOfWay: z.number().int().nullable().default(null),
    roadSurfaceType: z.string().nullable().default(null),
    roadSurfaceTypeOther: z.string().nullable().default(null),
    publicUtilityType: z.array(z.string()).nullable().default(null),
    publicUtilityTypeOther: z.string().nullable().default(null),
    decorationType: z.string().nullable().default(null),
    decorationTypeOther: z.string().nullable().default(null),
    buildingAge: z.number().int().nullable().default(null),
    constructionYear: z.number().int().nullable().default(null),
    numberOfFloors: z.number().nullable().default(null),
    buildingFormType: z.string().nullable().default(null),
    constructionMaterialType: z.string().nullable().default(null),
    roomLayoutType: z.string().nullable().default(null),
    roomLayoutTypeOther: z.string().nullable().default(null),
    locationViewType: z.array(z.string()).nullable().default(null),
    groundFloorMaterialType: z.string().nullable().default(null),
    groundFloorMaterialTypeOther: z.string().nullable().default(null),
    upperFloorMaterialType: z.string().nullable().default(null),
    upperFloorMaterialTypeOther: z.string().nullable().default(null),
    bathroomFloorMaterialType: z.string().nullable().default(null),
    bathroomFloorMaterialTypeOther: z.string().nullable().default(null),
    roofType: z.string().nullable().default(null),
    roofTypeOther: z.string().nullable().default(null),
    totalBuildingArea: z.number().nullable().default(null),
    isExpropriated: z.boolean().nullable().default(null),
    expropriationRemark: z.string().nullable().default(null),
    isInExpropriationLine: z.boolean().nullable().default(null),
    expropriationLineRemark: z.string().nullable().default(null),
    royalDecree: z.string().nullable().default(null),
    isForestBoundary: z.boolean().nullable().default(null),
    forestBoundaryRemark: z.string().nullable().default(null),
    facilityType: z.array(z.string()).nullable().default(null),
    facilityTypeOther: z.string().nullable().default(null),
    environmentType: z.array(z.string()).nullable().default(null),
    buildingInsurancePrice: z.number().nullable().default(null),
    sellingPrice: z.number().nullable().default(null),
    forcedSalePrice: z.number().nullable().default(null),
    remark: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const GetCondoPropertyResponse = z
  .object({
    propertyId: z.string().uuid(),
    appraisalId: z.string().uuid(),
    sequenceNumber: z.number().int(),
    propertyType: z.string(),
    description: z.string().nullable(),
    detailId: z.string().uuid(),
    propertyName: z.string().nullable(),
    condoName: z.string().nullable(),
    buildingNumber: z.string().nullable(),
    modelName: z.string().nullable(),
    builtOnTitleNumber: z.string().nullable(),
    condoRegistrationNumber: z.string().nullable(),
    roomNumber: z.string().nullable(),
    floorNumber: z.number().int().nullable(),
    usableArea: z.number().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    subDistrict: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string().nullable(),
    landOffice: z.string().nullable(),
    ownerName: z.string().nullable(),
    isOwnerVerified: z.boolean().nullable(),
    buildingConditionType: z.string().nullable(),
    hasObligation: z.boolean().nullable(),
    obligationDetails: z.string().nullable(),
    isDocumentValidated: z.boolean().nullable(),
    locationType: z.string().nullable(),
    street: z.string().nullable(),
    soi: z.string().nullable(),
    distanceFromMainRoad: z.number().nullable(),
    accessRoadWidth: z.number().nullable(),
    rightOfWay: z.number().int().nullable(),
    roadSurfaceType: z.string().nullable(),
    roadSurfaceTypeOther: z.string().nullable(),
    publicUtilityType: z.array(z.string()).nullable(),
    publicUtilityTypeOther: z.string().nullable(),
    decorationType: z.string().nullable(),
    decorationTypeOther: z.string().nullable(),
    buildingAge: z.number().int().nullable(),
    numberOfFloors: z.number().nullable(),
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
    totalBuildingArea: z.number().nullable(),
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
    buildingInsurancePrice: z.number().nullable(),
    sellingPrice: z.number().nullable(),
    forceSellingPrice: z.number().nullable(),
    remark: z.string().nullable(),
  })
  .passthrough();
const UpdateBuildingPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    buildingNumber: z.string().nullable().default(null),
    modelName: z.string().nullable().default(null),
    builtOnTitleNumber: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    houseNumber: z.string().nullable().default(null),
    buildingConditionType: z.string().nullable().default(null),
    isUnderConstruction: z.boolean().nullable().default(null),
    constructionCompletionPercent: z.number().nullable().default(null),
    constructionLicenseExpirationDate: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .default(null),
    isAppraisable: z.boolean().nullable().default(null),
    hasObligation: z.boolean().nullable().default(null),
    obligationDetails: z.string().nullable().default(null),
    buildingType: z.string().nullable().default(null),
    buildingTypeOther: z.string().nullable().default(null),
    numberOfFloors: z.number().int().nullable().default(null),
    decorationType: z.string().nullable().default(null),
    decorationTypeOther: z.string().nullable().default(null),
    isEncroachingOthers: z.boolean().nullable().default(null),
    encroachingOthersRemark: z.string().nullable().default(null),
    encroachingOthersArea: z.number().nullable().default(null),
    buildingMaterialType: z.string().nullable().default(null),
    buildingStyleType: z.string().nullable().default(null),
    isResidential: z.boolean().nullable().default(null),
    buildingAge: z.number().int().nullable().default(null),
    constructionYear: z.number().int().nullable().default(null),
    residentialRemark: z.string().nullable().default(null),
    constructionStyleType: z.string().nullable().default(null),
    constructionStyleRemark: z.string().nullable().default(null),
    structureType: z.array(z.string()).nullable().default(null),
    structureTypeOther: z.string().nullable().default(null),
    roofFrameType: z.array(z.string()).nullable().default(null),
    roofFrameTypeOther: z.string().nullable().default(null),
    roofType: z.array(z.string()).nullable().default(null),
    roofTypeOther: z.string().nullable().default(null),
    ceilingType: z.array(z.string()).nullable().default(null),
    ceilingTypeOther: z.string().nullable().default(null),
    interiorWallType: z.array(z.string()).nullable().default(null),
    interiorWallTypeOther: z.string().nullable().default(null),
    exteriorWallType: z.array(z.string()).nullable().default(null),
    exteriorWallTypeOther: z.string().nullable().default(null),
    fenceType: z.array(z.string()).nullable().default(null),
    fenceTypeOther: z.string().nullable().default(null),
    constructionType: z.string().nullable().default(null),
    constructionTypeOther: z.string().nullable().default(null),
    utilizationType: z.string().nullable().default(null),
    utilizationTypeOther: z.string().nullable().default(null),
    totalBuildingArea: z.number().nullable().default(null),
    buildingInsurancePrice: z.number().nullable().default(null),
    sellingPrice: z.number().nullable().default(null),
    forcedSalePrice: z.number().nullable().default(null),
    remark: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const GetBuildingPropertyResponse = z
  .object({
    propertyId: z.string().uuid(),
    appraisalId: z.string().uuid(),
    sequenceNumber: z.number().int(),
    propertyType: z.string(),
    description: z.string().nullable(),
    detailId: z.string().uuid(),
    propertyName: z.string().nullable(),
    buildingNumber: z.string().nullable(),
    modelName: z.string().nullable(),
    builtOnTitleNumber: z.string().nullable(),
    ownerName: z.string().nullable(),
    isOwnerVerified: z.boolean(),
    houseNumber: z.string().nullable(),
    buildingConditionType: z.string().nullable(),
    isUnderConstruction: z.boolean(),
    constructionCompletionPercent: z.number().nullable(),
    constructionLicenseExpirationDate: z.string().datetime({ offset: true }).nullable(),
    isAppraisable: z.boolean().nullable(),
    hasObligation: z.boolean().nullable(),
    obligationDetails: z.string().nullable(),
    buildingType: z.string().nullable(),
    buildingTypeOther: z.string().nullable(),
    numberOfFloors: z.number().nullable(),
    decorationType: z.string().nullable(),
    decorationTypeOther: z.string().nullable(),
    isEncroachingOthers: z.boolean(),
    encroachingOthersRemark: z.string().nullable(),
    encroachingOthersArea: z.number().nullable(),
    buildingMaterialType: z.string().nullable(),
    buildingStyleType: z.string().nullable(),
    isResidential: z.boolean(),
    buildingAge: z.number().int().nullable(),
    constructionYear: z.number().int().nullable(),
    residentialRemark: z.string().nullable(),
    constructionStyleType: z.string().nullable(),
    constructionStyleRemark: z.string().nullable(),
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
    totalBuildingArea: z.number().nullable(),
    buildingInsurancePrice: z.number().nullable(),
    sellingPrice: z.number().nullable(),
    forcedSalePrice: z.number().nullable(),
    remark: z.string().nullable(),
  })
  .passthrough();
const RemovePropertyFromGroupResponse = z.object({ success: z.boolean() }).passthrough();
const PropertyGroupDto = z
  .object({
    id: z.string().uuid(),
    groupNumber: z.number().int(),
    groupName: z.string(),
    description: z.string().nullable(),
    useSystemCalc: z.boolean(),
    propertyCount: z.number().int(),
  })
  .passthrough();
const GetPropertyGroupsResponse = z.object({ groups: z.array(PropertyGroupDto) }).passthrough();
const CreatePropertyGroupRequest = z
  .object({ groupName: z.string(), description: z.string().nullish().default(null) })
  .passthrough();
const CreatePropertyGroupResponse = z
  .object({ id: z.string().uuid(), groupNumber: z.number().int() })
  .passthrough();
const AppraisalDto = z
  .object({
    id: z.string().uuid(),
    appraisalNumber: z.string().nullable(),
    requestId: z.string().uuid(),
    status: z.string(),
    appraisalType: z.string(),
    priority: z.string(),
    slaDays: z.number().int().nullable(),
    slaDueDate: z.string().datetime({ offset: true }).nullable(),
    slaStatus: z.string().nullable(),
    propertyCount: z.number().int(),
    createdOn: z.string().datetime({ offset: true }).nullable(),
  })
  .partial()
  .passthrough();
const PaginatedResultOfAppraisalDto = z
  .object({
    items: z.array(AppraisalDto),
    count: z.number().int(),
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
  })
  .passthrough();
const GetAppraisalsResponse = z.object({ result: PaginatedResultOfAppraisalDto }).passthrough();
const CreateAppraisalRequest = z
  .object({
    requestId: z.string().uuid(),
    appraisalType: z.string(),
    priority: z.string(),
    slaDays: z.number().int().nullish().default(null),
  })
  .passthrough();
const CreateAppraisalResponse = z.object({ id: z.string().uuid() }).passthrough();
const GetAppraisalByIdResponse = z
  .object({
    id: z.string().uuid(),
    appraisalNumber: z.string().nullable(),
    requestId: z.string().uuid(),
    status: z.string(),
    appraisalType: z.string(),
    priority: z.string(),
    slaDays: z.number().int().nullable(),
    slaDueDate: z.string().datetime({ offset: true }).nullable(),
    slaStatus: z.string().nullable(),
    actualDaysToComplete: z.number().int().nullable(),
    isWithinSLA: z.boolean().nullable(),
    collateralCount: z.number().int(),
    groupCount: z.number().int(),
    assignmentCount: z.number().int(),
    createdOn: z.string().datetime({ offset: true }).nullable(),
    createdBy: z.string().nullable(),
    updatedOn: z.string().datetime({ offset: true }).nullable(),
    updatedBy: z.string().nullable(),
  })
  .partial()
  .passthrough();
const CreateVesselPropertyRequest = z
  .object({
    ownerName: z.string(),
    propertyName: z.string().nullish().default(null),
    vesselName: z.string().nullish().default(null),
    engineNo: z.string().nullish().default(null),
    registrationNo: z.string().nullish().default(null),
    registrationDate: z.string().datetime({ offset: true }).nullish().default(null),
    description: z.string().nullish().default(null),
    brand: z.string().nullish().default(null),
    model: z.string().nullish().default(null),
    yearOfManufacture: z.number().int().nullish().default(null),
    placeOfManufacture: z.string().nullish().default(null),
    vesselType: z.string().nullish().default(null),
    classOfVessel: z.string().nullish().default(null),
    purchaseDate: z.string().datetime({ offset: true }).nullish().default(null),
    purchasePrice: z.number().nullish().default(null),
    engineCapacity: z.string().nullish().default(null),
    width: z.number().nullish().default(null),
    length: z.number().nullish().default(null),
    height: z.number().nullish().default(null),
    grossTonnage: z.number().nullish().default(null),
    netTonnage: z.number().nullish().default(null),
    energyUse: z.string().nullish().default(null),
    energyUseRemark: z.string().nullish().default(null),
    isOwnerVerified: z.boolean().nullish().default(null),
    canUse: z.boolean().nullish().default(null),
    formerName: z.string().nullish().default(null),
    vesselCurrentName: z.string().nullish().default(null),
    location: z.string().nullish().default(null),
    conditionUse: z.string().nullish().default(null),
    vesselCondition: z.string().nullish().default(null),
    vesselAge: z.number().int().nullish().default(null),
    vesselEfficiency: z.string().nullish().default(null),
    vesselTechnology: z.string().nullish().default(null),
    usePurpose: z.string().nullish().default(null),
    vesselPart: z.string().nullish().default(null),
    remark: z.string().nullish().default(null),
    other: z.string().nullish().default(null),
    appraiserOpinion: z.string().nullish().default(null),
  })
  .passthrough();
const CreateVesselPropertyResponse = z
  .object({ propertyId: z.string().uuid(), detailId: z.string().uuid() })
  .passthrough();
const CreateVehiclePropertyRequest = z
  .object({
    ownerName: z.string(),
    propertyName: z.string().nullish().default(null),
    vehicleName: z.string().nullish().default(null),
    engineNo: z.string().nullish().default(null),
    chassisNo: z.string().nullish().default(null),
    registrationNo: z.string().nullish().default(null),
    description: z.string().nullish().default(null),
    brand: z.string().nullish().default(null),
    model: z.string().nullish().default(null),
    yearOfManufacture: z.number().int().nullish().default(null),
    countryOfManufacture: z.string().nullish().default(null),
    purchaseDate: z.string().datetime({ offset: true }).nullish().default(null),
    purchasePrice: z.number().nullish().default(null),
    capacity: z.string().nullish().default(null),
    width: z.number().nullish().default(null),
    length: z.number().nullish().default(null),
    height: z.number().nullish().default(null),
    energyUse: z.string().nullish().default(null),
    energyUseRemark: z.string().nullish().default(null),
    isOwnerVerified: z.boolean().nullish().default(null),
    canUse: z.boolean().nullish().default(null),
    location: z.string().nullish().default(null),
    conditionUse: z.string().nullish().default(null),
    vehicleCondition: z.string().nullish().default(null),
    vehicleAge: z.number().int().nullish().default(null),
    vehicleEfficiency: z.string().nullish().default(null),
    vehicleTechnology: z.string().nullish().default(null),
    usePurpose: z.string().nullish().default(null),
    vehiclePart: z.string().nullish().default(null),
    remark: z.string().nullish().default(null),
    other: z.string().nullish().default(null),
    appraiserOpinion: z.string().nullish().default(null),
  })
  .passthrough();
const CreateVehiclePropertyResponse = z
  .object({ propertyId: z.string().uuid(), detailId: z.string().uuid() })
  .passthrough();
const CreateMachineryPropertyRequest = z
  .object({
    ownerName: z.string(),
    propertyName: z.string().nullish().default(null),
    machineName: z.string().nullish().default(null),
    engineNo: z.string().nullish().default(null),
    chassisNo: z.string().nullish().default(null),
    registrationNo: z.string().nullish().default(null),
    description: z.string().nullish().default(null),
    brand: z.string().nullish().default(null),
    model: z.string().nullish().default(null),
    yearOfManufacture: z.number().int().nullish().default(null),
    countryOfManufacture: z.string().nullish().default(null),
    purchaseDate: z.string().datetime({ offset: true }).nullish().default(null),
    purchasePrice: z.number().nullish().default(null),
    capacity: z.string().nullish().default(null),
    width: z.number().nullish().default(null),
    length: z.number().nullish().default(null),
    height: z.number().nullish().default(null),
    energyUse: z.string().nullish().default(null),
    energyUseRemark: z.string().nullish().default(null),
    isOwnerVerified: z.boolean().nullish().default(null),
    canUse: z.boolean().nullish().default(null),
    location: z.string().nullish().default(null),
    conditionUse: z.string().nullish().default(null),
    machineCondition: z.string().nullish().default(null),
    machineAge: z.number().int().nullish().default(null),
    machineEfficiency: z.string().nullish().default(null),
    machineTechnology: z.string().nullish().default(null),
    usePurpose: z.string().nullish().default(null),
    machinePart: z.string().nullish().default(null),
    remark: z.string().nullish().default(null),
    other: z.string().nullish().default(null),
    appraiserOpinion: z.string().nullish().default(null),
  })
  .passthrough();
const CreateMachineryPropertyResponse = z
  .object({ propertyId: z.string().uuid(), detailId: z.string().uuid() })
  .passthrough();
const CreateLandPropertyRequest = z
  .object({
    ownerName: z.string(),
    description: z.string().nullish().default(null),
    propertyName: z.string().nullish().default(null),
    landDescription: z.string().nullish().default(null),
    latitude: z.number().nullish().default(null),
    longitude: z.number().nullish().default(null),
    subDistrict: z.string().nullish().default(null),
    district: z.string().nullish().default(null),
    province: z.string().nullish().default(null),
    landOffice: z.string().nullish().default(null),
    isOwnerVerified: z.boolean().nullish().default(null),
    hasObligation: z.boolean().nullish().default(null),
    obligationDetails: z.string().nullish().default(null),
    isLandLocationVerified: z.boolean().nullish().default(null),
    landCheckMethodType: z.string().nullish().default(null),
    landCheckMethodTypeOther: z.string().nullish().default(null),
    street: z.string().nullish().default(null),
    soi: z.string().nullish().default(null),
    distanceFromMainRoad: z.number().nullish().default(null),
    village: z.string().nullish().default(null),
    addressLocation: z.string().nullish().default(null),
    landShapeType: z.string().nullish().default(null),
    urbanPlanningType: z.string().nullish().default(null),
    landZoneType: z.array(z.string()).nullish().default(null),
    plotLocationType: z.array(z.string()).nullish().default(null),
    plotLocationTypeOther: z.string().nullish().default(null),
    landFillType: z.string().nullish().default(null),
    landFillTypeOther: z.string().nullish().default(null),
    landFillPercent: z.number().nullish().default(null),
    soilLevel: z.number().nullish().default(null),
    accessRoadWidth: z.number().nullish().default(null),
    rightOfWay: z.number().int().nullish().default(null),
    roadFrontage: z.number().nullish().default(null),
    numberOfSidesFacingRoad: z.number().int().nullish().default(null),
    roadPassInFrontOfLand: z.string().nullish().default(null),
    landAccessibilityType: z.string().nullish().default(null),
    landAccessibilityRemark: z.string().nullish().default(null),
    roadSurfaceType: z.string().nullish().default(null),
    roadSurfaceTypeOther: z.string().nullish().default(null),
    hasElectricity: z.boolean().nullish().default(null),
    electricityDistance: z.number().nullish().default(null),
    publicUtilityType: z.array(z.string()).nullish().default(null),
    publicUtilityTypeOther: z.string().nullish().default(null),
    landUseType: z.array(z.string()).nullish().default(null),
    landUseTypeOther: z.string().nullish().default(null),
    landEntranceExitType: z.array(z.string()).nullish().default(null),
    landEntranceExitTypeOther: z.string().nullish().default(null),
    transportationAccessType: z.array(z.string()).nullish().default(null),
    transportationAccessTypeOther: z.string().nullish().default(null),
    propertyAnticipationType: z.string().nullish().default(null),
    isExpropriated: z.boolean().nullish().default(null),
    expropriationRemark: z.string().nullish().default(null),
    isInExpropriationLine: z.boolean().nullish().default(null),
    expropriationLineRemark: z.string().nullish().default(null),
    royalDecree: z.string().nullish().default(null),
    isEncroached: z.boolean().nullish().default(null),
    encroachmentRemark: z.string().nullish().default(null),
    encroachmentArea: z.number().nullish().default(null),
    isLandlocked: z.boolean().nullish().default(null),
    landlockedRemark: z.string().nullish().default(null),
    isForestBoundary: z.boolean().nullish().default(null),
    forestBoundaryRemark: z.string().nullish().default(null),
    otherLegalLimitations: z.string().nullish().default(null),
    evictionType: z.array(z.string()).nullish().default(null),
    evictionTypeOther: z.string().nullish().default(null),
    allocationType: z.string().nullish().default(null),
    northAdjacentArea: z.string().nullish().default(null),
    northBoundaryLength: z.number().nullish().default(null),
    southAdjacentArea: z.string().nullish().default(null),
    southBoundaryLength: z.number().nullish().default(null),
    eastAdjacentArea: z.string().nullish().default(null),
    eastBoundaryLength: z.number().nullish().default(null),
    westAdjacentArea: z.string().nullish().default(null),
    westBoundaryLength: z.number().nullish().default(null),
    pondArea: z.number().nullish().default(null),
    pondDepth: z.number().nullish().default(null),
    hasBuilding: z.boolean().nullish().default(null),
    hasBuildingOther: z.string().nullish().default(null),
    remark: z.string().nullish().default(null),
  })
  .passthrough();
const CreateLandPropertyResponse = z
  .object({ propertyId: z.string().uuid(), landDetailId: z.string().uuid() })
  .passthrough();
const CreateLandAndBuildingPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    landDescription: z.string().nullable().default(null),
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    subDistrict: z.string().nullable().default(null),
    district: z.string().nullable().default(null),
    province: z.string().nullable().default(null),
    landOffice: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    hasObligation: z.boolean().nullable().default(null),
    obligationDetails: z.string().nullable().default(null),
    isLandLocationVerified: z.boolean().nullable().default(null),
    landCheckMethodType: z.string().nullable().default(null),
    landCheckMethodTypeOther: z.string().nullable().default(null),
    street: z.string().nullable().default(null),
    soi: z.string().nullable().default(null),
    distanceFromMainRoad: z.number().nullable().default(null),
    village: z.string().nullable().default(null),
    addressLocation: z.string().nullable().default(null),
    landShapeType: z.string().nullable().default(null),
    urbanPlanningType: z.string().nullable().default(null),
    landZoneType: z.array(z.string()).nullable().default(null),
    plotLocationType: z.array(z.string()).nullable().default(null),
    plotLocationTypeOther: z.string().nullable().default(null),
    landFillType: z.string().nullable().default(null),
    landFillTypeOther: z.string().nullable().default(null),
    landFillPercent: z.number().nullable().default(null),
    soilLevel: z.number().nullable().default(null),
    accessRoadWidth: z.number().nullable().default(null),
    rightOfWay: z.number().int().nullable().default(null),
    roadFrontage: z.number().nullable().default(null),
    numberOfSidesFacingRoad: z.number().int().nullable().default(null),
    roadPassInFrontOfLand: z.string().nullable().default(null),
    landAccessibilityType: z.string().nullable().default(null),
    landAccessibilityRemark: z.string().nullable().default(null),
    roadSurfaceType: z.string().nullable().default(null),
    roadSurfaceTypeOther: z.string().nullable().default(null),
    hasElectricity: z.boolean().nullable().default(null),
    electricityDistance: z.number().nullable().default(null),
    publicUtilityType: z.array(z.string()).nullable().default(null),
    publicUtilityTypeOther: z.string().nullable().default(null),
    landUseType: z.array(z.string()).nullable().default(null),
    landUseTypeOther: z.string().nullable().default(null),
    landEntranceExitType: z.array(z.string()).nullable().default(null),
    landEntranceExitTypeOther: z.string().nullable().default(null),
    transportationAccessType: z.array(z.string()).nullable().default(null),
    transportationAccessTypeOther: z.string().nullable().default(null),
    propertyAnticipationType: z.string().nullable().default(null),
    isExpropriated: z.boolean().nullable().default(null),
    expropriationRemark: z.string().nullable().default(null),
    isInExpropriationLine: z.boolean().nullable().default(null),
    expropriationLineRemark: z.string().nullable().default(null),
    royalDecree: z.string().nullable().default(null),
    isEncroached: z.boolean().nullable().default(null),
    encroachmentRemark: z.string().nullable().default(null),
    encroachmentArea: z.number().nullable().default(null),
    isLandlocked: z.boolean().nullable().default(null),
    landlockedRemark: z.string().nullable().default(null),
    isForestBoundary: z.boolean().nullable().default(null),
    forestBoundaryRemark: z.string().nullable().default(null),
    otherLegalLimitations: z.string().nullable().default(null),
    evictionType: z.array(z.string()).nullable().default(null),
    evictionTypeOther: z.string().nullable().default(null),
    allocationType: z.string().nullable().default(null),
    northAdjacentArea: z.string().nullable().default(null),
    northBoundaryLength: z.number().nullable().default(null),
    southAdjacentArea: z.string().nullable().default(null),
    southBoundaryLength: z.number().nullable().default(null),
    eastAdjacentArea: z.string().nullable().default(null),
    eastBoundaryLength: z.number().nullable().default(null),
    westAdjacentArea: z.string().nullable().default(null),
    westBoundaryLength: z.number().nullable().default(null),
    pondArea: z.number().nullable().default(null),
    pondDepth: z.number().nullable().default(null),
    buildingNumber: z.string().nullable().default(null),
    modelName: z.string().nullable().default(null),
    builtOnTitleNumber: z.string().nullable().default(null),
    houseNumber: z.string().nullable().default(null),
    buildingType: z.string().nullable().default(null),
    buildingTypeOther: z.string().nullable().default(null),
    numberOfBuildings: z.number().int().nullable().default(null),
    buildingAge: z.number().int().nullable().default(null),
    constructionYear: z.number().int().nullable().default(null),
    residentialRemark: z.string().nullable().default(null),
    buildingCondition: z.string().nullable().default(null),
    isUnderConstruction: z.boolean().nullable().default(null),
    constructionCompletionPercent: z.number().nullable().default(null),
    constructionLicenseExpirationDate: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .default(null),
    isAppraisable: z.boolean().nullable().default(null),
    maintenanceStatus: z.string().nullable().default(null),
    renovationHistory: z.string().nullable().default(null),
    totalBuildingArea: z.number().nullable().default(null),
    buildingAreaUnit: z.string().nullable().default(null),
    usableArea: z.number().nullable().default(null),
    numberOfFloors: z.number().int().nullable().default(null),
    buildingMaterial: z.string().nullable().default(null),
    buildingStyle: z.string().nullable().default(null),
    isResidential: z.boolean().nullable().default(null),
    constructionStyleType: z.string().nullable().default(null),
    constructionStyleRemark: z.string().nullable().default(null),
    constructionType: z.string().nullable().default(null),
    constructionTypeOther: z.string().nullable().default(null),
    structureType: z.array(z.string()).nullable().default(null),
    structureTypeOther: z.string().nullable().default(null),
    foundationType: z.string().nullable().default(null),
    roofFrameType: z.array(z.string()).nullable().default(null),
    roofFrameTypeOther: z.string().nullable().default(null),
    roofType: z.array(z.string()).nullable().default(null),
    roofTypeOther: z.string().nullable().default(null),
    roofMaterial: z.string().nullable().default(null),
    ceilingType: z.array(z.string()).nullable().default(null),
    ceilingTypeOther: z.string().nullable().default(null),
    interiorWallType: z.array(z.string()).nullable().default(null),
    interiorWallTypeOther: z.string().nullable().default(null),
    exteriorWallType: z.array(z.string()).nullable().default(null),
    exteriorWallTypeOther: z.string().nullable().default(null),
    wallMaterial: z.string().nullable().default(null),
    floorMaterial: z.string().nullable().default(null),
    fenceType: z.array(z.string()).nullable().default(null),
    fenceTypeOther: z.string().nullable().default(null),
    decorationType: z.string().nullable().default(null),
    decorationTypeOther: z.string().nullable().default(null),
    utilizationType: z.string().nullable().default(null),
    otherPurposeUsage: z.string().nullable().default(null),
    buildingPermitNumber: z.string().nullable().default(null),
    buildingPermitDate: z.string().datetime({ offset: true }).nullable().default(null),
    hasOccupancyPermit: z.boolean().nullable().default(null),
    buildingInsurancePrice: z.number().nullable().default(null),
    sellingPrice: z.number().nullable().default(null),
    forcedSalePrice: z.number().nullable().default(null),
    landRemark: z.string().nullable().default(null),
    buildingRemark: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const CreateLandAndBuildingPropertyResponse = z
  .object({ propertyId: z.string().uuid(), detailId: z.string().uuid() })
  .passthrough();
const CreateCondoPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    condoName: z.string().nullable().default(null),
    buildingNumber: z.string().nullable().default(null),
    modelName: z.string().nullable().default(null),
    builtOnTitleNumber: z.string().nullable().default(null),
    condoRegistrationNumber: z.string().nullable().default(null),
    roomNumber: z.string().nullable().default(null),
    floorNumber: z.number().int().nullable().default(null),
    usableArea: z.number().nullable().default(null),
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    subDistrict: z.string().nullable().default(null),
    district: z.string().nullable().default(null),
    province: z.string().nullable().default(null),
    landOffice: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    buildingConditionType: z.string().nullable().default(null),
    hasObligation: z.boolean().nullable().default(null),
    obligationDetails: z.string().nullable().default(null),
    isDocumentValidated: z.boolean().nullable().default(null),
    locationType: z.string().nullable().default(null),
    street: z.string().nullable().default(null),
    soi: z.string().nullable().default(null),
    distanceFromMainRoad: z.number().nullable().default(null),
    accessRoadWidth: z.number().nullable().default(null),
    rightOfWay: z.number().int().nullable().default(null),
    roadSurfaceType: z.string().nullable().default(null),
    roadSurfaceTypeOther: z.string().nullable().default(null),
    publicUtilityType: z.array(z.string()).nullable().default(null),
    publicUtilityTypeOther: z.string().nullable().default(null),
    decorationType: z.string().nullable().default(null),
    decorationTypeOther: z.string().nullable().default(null),
    buildingAge: z.number().int().nullable().default(null),
    constructionYear: z.number().int().nullable().default(null),
    numberOfFloors: z.number().int().nullable().default(null),
    buildingFormType: z.string().nullable().default(null),
    constructionMaterialType: z.string().nullable().default(null),
    roomLayoutType: z.string().nullable().default(null),
    roomLayoutTypeOther: z.string().nullable().default(null),
    locationViewType: z.array(z.string()).nullable().default(null),
    groundFloorMaterialType: z.string().nullable().default(null),
    groundFloorMaterialTypeOther: z.string().nullable().default(null),
    upperFloorMaterialType: z.string().nullable().default(null),
    upperFloorMaterialTypeOther: z.string().nullable().default(null),
    bathroomFloorMaterialType: z.string().nullable().default(null),
    bathroomFloorMaterialTypeOther: z.string().nullable().default(null),
    roofType: z.string().nullable().default(null),
    roofTypeOther: z.string().nullable().default(null),
    totalBuildingArea: z.number().nullable().default(null),
    isExpropriated: z.boolean().nullable().default(null),
    expropriationRemark: z.string().nullable().default(null),
    isInExpropriationLine: z.boolean().nullable().default(null),
    expropriationLineRemark: z.string().nullable().default(null),
    royalDecree: z.string().nullable().default(null),
    isForestBoundary: z.boolean().nullable().default(null),
    forestBoundaryRemark: z.string().nullable().default(null),
    facilityType: z.array(z.string()).nullable().default(null),
    facilityTypeOther: z.string().nullable().default(null),
    environmentType: z.array(z.string()).nullable().default(null),
    buildingInsurancePrice: z.number().nullable().default(null),
    sellingPrice: z.number().nullable().default(null),
    forcedSalePrice: z.number().nullable().default(null),
    remark: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const CreateCondoPropertyResponse = z
  .object({ propertyId: z.string().uuid(), detailId: z.string().uuid() })
  .passthrough();
const CreateBuildingPropertyRequest = z
  .object({
    propertyName: z.string().nullable().default(null),
    buildingNumber: z.string().nullable().default(null),
    modelName: z.string().nullable().default(null),
    builtOnTitleNumber: z.string().nullable().default(null),
    ownerName: z.string().nullable().default(null),
    isOwnerVerified: z.boolean().nullable().default(null),
    houseNumber: z.string().nullable().default(null),
    buildingConditionType: z.string().nullable().default(null),
    isUnderConstruction: z.boolean().nullable().default(null),
    constructionCompletionPercent: z.number().nullable().default(null),
    constructionLicenseExpirationDate: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .default(null),
    isAppraisable: z.boolean().nullable().default(null),
    hasObligation: z.boolean().nullable().default(null),
    obligationDetails: z.string().nullable().default(null),
    buildingType: z.string().nullable().default(null),
    buildingTypeOther: z.string().nullable().default(null),
    numberOfFloors: z.number().int().nullable().default(null),
    decorationType: z.string().nullable().default(null),
    decorationTypeOther: z.string().nullable().default(null),
    isEncroachingOthers: z.boolean().nullable().default(null),
    encroachingOthersRemark: z.string().nullable().default(null),
    encroachingOthersArea: z.number().nullable().default(null),
    buildingMaterialType: z.string().nullable().default(null),
    buildingStyleType: z.string().nullable().default(null),
    isResidential: z.boolean().nullable().default(null),
    buildingAge: z.number().int().nullable().default(null),
    constructionYear: z.number().int().nullable().default(null),
    residentialRemark: z.string().nullable().default(null),
    constructionStyleType: z.string().nullable().default(null),
    constructionStyleRemark: z.string().nullable().default(null),
    structureType: z.array(z.string()).nullable().default(null),
    structureTypeOther: z.string().nullable().default(null),
    roofFrameType: z.array(z.string()).nullable().default(null),
    roofFrameTypeOther: z.string().nullable().default(null),
    roofType: z.array(z.string()).nullable().default(null),
    roofTypeOther: z.string().nullable().default(null),
    ceilingType: z.array(z.string()).nullable().default(null),
    ceilingTypeOther: z.string().nullable().default(null),
    interiorWallType: z.array(z.string()).nullable().default(null),
    interiorWallTypeOther: z.string().nullable().default(null),
    exteriorWallType: z.array(z.string()).nullable().default(null),
    exteriorWallTypeOther: z.string().nullable().default(null),
    fenceType: z.array(z.string()).nullable().default(null),
    fenceTypeOther: z.string().nullable().default(null),
    constructionType: z.string().nullable().default(null),
    constructionTypeOther: z.string().nullable().default(null),
    utilizationType: z.string().nullable().default(null),
    utilizationTypeOther: z.string().nullable().default(null),
    totalBuildingArea: z.number().nullable().default(null),
    buildingInsurancePrice: z.number().nullable().default(null),
    sellingPrice: z.number().nullable().default(null),
    forcedSalePrice: z.number().nullable().default(null),
    remark: z.string().nullable().default(null),
  })
  .partial()
  .passthrough();
const CreateBuildingPropertyResponse = z
  .object({ propertyId: z.string().uuid(), detailId: z.string().uuid() })
  .passthrough();
const AddPropertyToGroupRequest = z.object({ propertyId: z.string().uuid() }).passthrough();
const AddPropertyToGroupResponse = z.object({ success: z.boolean() }).passthrough();
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

export const UpdateBuildingPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const UpdateCondoPropertyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const UpdateLandAndBuildingPropertyResponse = z
  .object({ isSuccess: z.boolean() })
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
  AssignmentOverrideRequest,
  StartWorkflowRequest,
  ActivityPosition,
  ActivityDefinition,
  TransitionType,
  TransitionDefinition,
  WorkflowMetadata,
  WorkflowSchema,
  CreateWorkflowDefinitionRequest,
  CompleteActivityRequest2,
  UpdateCollateralEngagementRequest,
  UpdateCollateralEngagementResponse,
  CollateralPropertyDto,
  CollateralDetailDto,
  CollateralSizeDto,
  CollateralMachineDto,
  CollateralVehicleDto,
  CollateralVesselDto,
  CoordinateDto,
  CollateralLocationDto,
  CollateralLandDto,
  CollateralBuildingDto,
  CollateralCondoDto,
  LandTitleDocumentDetailDto,
  LandTitleAreaDto,
  LandTitleDto,
  UpdateCollateralRequest,
  UpdateCollateralResponse,
  CollateralEngagementDto,
  GetCollateralByIdResponse,
  DeleteCollateralResponse,
  CollateralMasterDto,
  PaginatedResultOfCollateralMasterDto,
  GetCollateralResponse,
  CreateCollateralRequest,
  CreateCollateralResponse,
  QuotationDto,
  PaginatedResultOfQuotationDto,
  GetQuotationsResponse,
  CreateQuotationRequest,
  CreateQuotationResponse,
  GetQuotationByIdResponse,
  UpdatePricingAnalysisRequest,
  UpdatePricingAnalysisResponse,
  ApproachDto,
  GetPricingAnalysisResponse,
  UpdateMethodRequest,
  UpdateMethodResponse,
  UpdateFinalValueRequest,
  UpdateFinalValueResponse,
  UpdateFactorScoreRequest,
  UpdateFactorScoreResponse,
  DeleteFactorScoreResponse,
  UpdateComparableLinkRequest,
  UpdateComparableLinkResponse,
  UpdateCalculationRequest,
  UpdateCalculationResponse,
  UpdateApproachRequest,
  UpdateApproachResponse,
  StartPricingAnalysisResponse,
  SetFinalValueRequest,
  SetFinalValueResponse,
  SelectMethodResponse,
  ComparativeFactorInput,
  FactorScoreInput,
  CalculationInput,
  SaveComparativeAnalysisRequest,
  SaveComparativeAnalysisResult,
  RecalculateFactorsResponse,
  LinkComparableRequest,
  LinkComparableResponse,
  GetPricingAnalysisByGroupResponse,
  CreatePricingAnalysisResponse,
  LinkedComparableDto,
  ComparativeFactorDto,
  FactorScoreDto,
  CalculationDto,
  GetComparativeFactorsResult,
  CompletePricingAnalysisRequest,
  CompletePricingAnalysisResponse,
  AddMethodRequest,
  AddMethodResponse,
  AddFactorScoreRequest,
  AddFactorScoreResponse,
  AddCalculationRequest,
  AddCalculationResponse,
  AddApproachRequest,
  AddApproachResponse,
  UpdateMarketComparableTemplateRequest,
  UpdateMarketComparableTemplateResponse,
  TemplateFactorDto,
  MarketComparableTemplateDetailDto,
  GetMarketComparableTemplateByIdResult,
  MarketComparableTemplateDto,
  GetMarketComparableTemplatesResult,
  CreateMarketComparableTemplateRequest,
  CreateMarketComparableTemplateResponse,
  AddFactorToTemplateRequest,
  AddFactorToTemplateResponse,
  FactorDataItem,
  SetMarketComparableFactorDataRequest,
  MarketComparableDto,
  PaginatedResultOfMarketComparableDto,
  GetMarketComparablesResponse,
  CreateMarketComparableRequest,
  CreateMarketComparableResponse,
  FactorDataDto,
  ImageDto,
  MarketComparableDetailDto,
  GetMarketComparableByIdResponse,
  AddMarketComparableImageRequest,
  AddMarketComparableImageResponse,
  UpdateMarketComparableFactorRequest,
  UpdateMarketComparableFactorResult,
  MarketComparableFactorDto,
  CreateMarketComparableFactorRequest,
  CreateMarketComparableFactorResponse,
  UpdateDocumentTypeRequest,
  UpdateDocumentRequirementRequest,
  DocumentTypeDto,
  CreateDocumentTypeRequest,
  CreateDocumentTypeResult,
  DocumentRequirementDto,
  CreateDocumentRequirementRequest,
  CreateDocumentRequirementResponse,
  DocumentChecklistItemDto,
  CollateralDocumentGroupDto,
  GetDocumentChecklistResponse,
  UpdateTemplateRequest,
  UpdateTemplateResult,
  TemplateFactorDto2,
  GetTemplateByIdResult,
  TemplateDto,
  CreateTemplateRequest,
  CreateTemplateResult,
  AddFactorToTemplateRequest2,
  AddFactorToTemplateResult,
  CommitteeDto,
  PaginatedResultOfCommitteeDto,
  GetCommitteesResponse,
  CreateCommitteeRequest,
  CreateCommitteeResponse,
  UpdateVesselPropertyRequest,
  GetVesselPropertyResponse,
  UpdateVehiclePropertyRequest,
  GetVehiclePropertyResponse,
  UpdatePropertyGroupRequest,
  UpdatePropertyGroupResponse,
  PropertyGroupItemDto,
  GetPropertyGroupByIdResponse,
  DeletePropertyGroupResponse,
  UpdateMachineryPropertyRequest,
  GetMachineryPropertyResponse,
  UpdateLandPropertyRequest,
  GetLandPropertyResponse,
  UpdateLandAndBuildingPropertyRequest,
  GetLandAndBuildingPropertyResponse,
  UpdateCondoPropertyRequest,
  GetCondoPropertyResponse,
  UpdateBuildingPropertyRequest,
  GetBuildingPropertyResponse,
  RemovePropertyFromGroupResponse,
  PropertyGroupDto,
  GetPropertyGroupsResponse,
  CreatePropertyGroupRequest,
  CreatePropertyGroupResponse,
  AppraisalDto,
  PaginatedResultOfAppraisalDto,
  GetAppraisalsResponse,
  CreateAppraisalRequest,
  CreateAppraisalResponse,
  GetAppraisalByIdResponse,
  CreateVesselPropertyRequest,
  CreateVesselPropertyResponse,
  CreateVehiclePropertyRequest,
  CreateVehiclePropertyResponse,
  CreateMachineryPropertyRequest,
  CreateMachineryPropertyResponse,
  CreateLandPropertyRequest,
  CreateLandPropertyResponse,
  CreateLandAndBuildingPropertyRequest,
  CreateLandAndBuildingPropertyResponse,
  CreateCondoPropertyRequest,
  CreateCondoPropertyResponse,
  CreateBuildingPropertyRequest,
  CreateBuildingPropertyResponse,
  AddPropertyToGroupRequest,
  AddPropertyToGroupResponse,
  SimulateTaskCompletionRequest,
  SimulateTaskAssignmentRequest,
  SimulateTransitionCompletedRequest,
};

export type CreateRequestRequestType = z.infer<typeof CreateRequestRequest>;
export type CreateRequestResponseType = z.infer<typeof CreateRequestResponse>;
export type GetAppraisalByIdResponseType = z.infer<typeof GetAppraisalByIdResponse>;
export type UpdateBuildingPropertyRequestType = z.infer<typeof UpdateBuildingPropertyRequest>;
export type CreateLandBuildingRequestType = z.infer<typeof CreateLandAndBuildingPropertyRequest>;
export type CreateLandBuildingResponseType = z.infer<typeof CreateLandAndBuildingPropertyResponse>;
export type UpdateBuildingPropertyResponseType = z.infer<typeof UpdateBuildingPropertyResponse>;
export type UpdateCondoPropertyRequestType = z.infer<typeof UpdateCondoPropertyRequest>;
export type UpdateCondoPropertyResponseType = z.infer<typeof UpdateCondoPropertyResponse>;
export type UpdateLandAndBuildingPropertyRequestType = z.infer<
  typeof UpdateLandAndBuildingPropertyRequest
>;
export type UpdateLandAndBuildingPropertyResponseType = z.infer<
  typeof UpdateLandAndBuildingPropertyResponse
>;
