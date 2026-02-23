import { z } from 'zod';

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
// Base fields shared by all title types (all optional for backend compatibility)
const BaseTitleFields = {
  id: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  collateralStatus: z.boolean().optional(),
  ownerName: z.string().nullable().optional(),
  titleAddress: AddressDto.optional(),
  dopaAddress: AddressDto.optional(),
  notes: z.string().nullable().optional(),
  documents: z.array(RequestTitleDocumentDto).optional(),
};

// Optional fields for land-based types
const LandFields = {
  titleNumber: z.string().nullable().optional(),
  titleType: z.string().nullable().optional(),
  titleDetail: z.string().nullable().optional(),
  bookNumber: z.string().nullable().optional(),
  pageNumber: z.string().nullable().optional(),
  rawang: z.string().nullable().optional(),
  landParcelNumber: z.string().nullable().optional(),
  surveyNumber: z.string().nullable().optional(),
  aerialMapName: z.string().nullable().optional(),
  aerialMapNumber: z.string().nullable().optional(),
  areaRai: z.number().int().nullable().optional(),
  areaNgan: z.number().int().nullable().optional(),
  areaSquareWa: z.number().nullable().optional(),
};

// Optional fields for building-based types
const BuildingFields = {
  buildingType: z.string().nullable().optional(),
  usableArea: z.number().nullable().optional(),
  numberOfBuilding: z.number().int().nullable().optional(),
};

// Optional fields for a condominium type
const CondoFields = {
  condoName: z.string().nullable().optional(),
  buildingNumber: z.string().nullable().optional(),
  roomNumber: z.string().nullable().optional(),
  floorNumber: z.string().nullable().optional(),
};

// Optional fields for a vehicle type
const VehicleFields = {
  vehicleType: z.string().nullable().optional(),
  vehicleAppointmentLocation: z.string().nullable().optional(),
  vin: z.string().nullable().optional(),
  licensePlateNumber: z.string().nullable().optional(),
};

// Optional fields for a machine type
const MachineFields = {
  machineType: z.string().nullable().optional(),
  registrationStatus: z.boolean().optional(),
  registrationNo: z.string().nullable().optional(),
  installationStatus: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  numberOfMachine: z.number().int().nullable().optional(),
};

// Vessel fields (for future use)
const VesselFields = {
  vesselType: z.string().nullable().optional(),
  vesselAppointmentLocation: z.string().nullable().optional(),
  hullIdentificationNumber: z.string().nullable().optional(),
  vesselRegistrationNumber: z.string().nullable().optional(),
};

// All optional fields (for unselected state)
const AllOptionalFields = {
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
};

// Unselected state (when the collateral type is not yet chosen)
const UnselectedTitleDto = z.object({
  ...BaseTitleFields,
  ...AllOptionalFields,
  collateralType: z.literal(''),
});

// Land title schema
const LandTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('L'),
  titleNumber: z.string().min(1, 'Title number is required'),
});

// Building title schema
const BuildingTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('B'),
  titleNumber: z.string().min(1, 'Title number is required'),
  buildingType: z.string().min(1, 'Building type is required'),
});

// Land and Building title schema
const LandAndBuildingTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('LB'),
  titleNumber: z.string().min(1, 'Title number is required'),
  buildingType: z.string().min(1, 'Building type is required'),
});

// Condominium title schema
const CondominiumTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('U'),
  condoName: z.string().min(1, 'Condo name is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
});

// Vehicle title schema
const VehicleTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('VEH'),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  licensePlateNumber: z.string().min(1, 'License plate number is required'),
});

// Machine title schema
const MachineTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('MAC'),
  machineType: z.string().min(1, 'Machine type is required'),
  registrationNumber: z.string().min(1, 'Registration number is required'),
});

// Lease Agreement Land title schema
const LeaseAgreementLandTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('LSL'),
  titleNumber: z.string().min(1, 'Title number is required'),
});

// Lease Agreement Building title schema
const LeaseAgreementBuildingTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('LSB'),
  titleNumber: z.string().min(1, 'Title number is required'),
  buildingType: z.string().min(1, 'Building type is required'),
});

// Lease Agreement Land and Building title schema
const LeaseAgreementLandAndBuildingTitleDto = z.object({
  ...BaseTitleFields,
  ...LandFields,
  ...BuildingFields,
  ...CondoFields,
  ...VehicleFields,
  ...MachineFields,
  ...VesselFields,
  collateralType: z.literal('LS'),
  titleNumber: z.string().min(1, 'Title number is required'),
  buildingType: z.string().min(1, 'Building type is required'),
});

// Combined discriminated union
const RequestTitleDto = z.discriminatedUnion('collateralType', [
  UnselectedTitleDto,
  LandTitleDto,
  BuildingTitleDto,
  LandAndBuildingTitleDto,
  CondominiumTitleDto,
  VehicleTitleDto,
  MachineTitleDto,
  LeaseAgreementLandTitleDto,
  LeaseAgreementBuildingTitleDto,
  LeaseAgreementLandAndBuildingTitleDto,
]);
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

export const createRequestForm = z
  .object({
    purpose: z.string().min(1, 'Appraisal purpose is required.'),
    channel: z.string().min(1, 'Channel is required.'),
    priority: z.string(),
    isPma: z.boolean(),
    creator: UserDto,
    requestor: UserDto,
    detail: RequestDetailDto,
    customers: z.array(RequestCustomerDto).min(1, 'At least one customer is required.'),
    properties: z.array(RequestPropertyDto).min(1, 'At least one property is required.'),
    titles: z.array(RequestTitleDto),
    documents: z.array(RequestDocumentDto),
    comments: z.array(RequestCommentDto),
  })
  .superRefine((data, ctx) => {
    // Loan Application Number is required when the purpose is '01' (New Loan)
    console.log('[superRefine] Running validation, purpose:', data.purpose);
    if (data.purpose === '01') {
      const loanAppNumber = data.detail?.loanDetail?.loanApplicationNumber;
      const isEmpty = loanAppNumber == null || loanAppNumber.trim() === '';
      console.log('[superRefine] loanAppNumber:', loanAppNumber, 'isEmpty:', isEmpty);
      if (isEmpty) {
        console.log('[superRefine] Adding error for loanApplicationNumber');
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Loan Application No is required',
          path: ['detail', 'loanDetail', 'loanApplicationNumber'],
        });
      }
    }
  });

export type UserDtoType = z.infer<typeof UserDto>;
export type RequestCommentDtoType = z.infer<typeof RequestCommentDto>;
export type createRequestFormType = z.infer<typeof createRequestForm>;
export type RequestTitleDtoType = z.infer<typeof RequestTitleDto>;
export type RequestDocumentDtoType = z.infer<typeof RequestDocumentDto>;
export type CollateralType = RequestTitleDtoType['collateralType'];

// Export schema for validation
export { RequestTitleDto };

//**
// Default values
//
export const createRequestFormDefault: createRequestFormType = {
  purpose: '',
  channel: '',
  priority: 'normal',
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
  collateralStatus: false,
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
  vesselType: '',
  vesselAppointmentLocation: '',
  hullIdentificationNumber: '',
  vesselRegistrationNumber: '',
  registrationStatus: false,
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
