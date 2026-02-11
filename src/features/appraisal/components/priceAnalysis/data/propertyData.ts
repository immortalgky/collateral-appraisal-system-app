export const LAND_PROPERTY = {
  // ids
  propertyId: '019e2a6b-9c2d-7a44-b2d1-6d2b7f5c3a10',
  appraisalId: '019e2a6b-a7d3-7e1b-9b6a-2a0e6f1d8c22',
  sequenceNumber: 1,

  // basic
  propertyType: 'Land',
  description: 'Vacant industrial land with road frontage; suitable for warehouse/factory use.',

  // land detail
  landDetailId: '019e2a6b-b5c8-7b30-8a12-9b9c2d4a1f03',
  propertyName: 'Suksawat Industrial Plot',
  landOffice: 'Phra Pradaeng Land Office',
  landDescription: 'Chanote title deed; flat land; clear boundaries; rectangular-ish plot.',

  // owner
  ownerName: 'Somchai P.',
  isOwnerVerified: true,
  hasObligation: true,
  obligationDetails: 'Property is mortgaged with a local bank; no overdue status reported.',

  // location
  street: 'Suksawat Road',
  soi: 'Soi Suksawat 78',
  village: 'Moo 3',
  subDistrict: 'Bang Ya Phraek',
  district: 'Phra Pradaeng',
  province: 'Samut Prakan',

  // coordinates
  latitude: 13.644231,
  longitude: 100.567812,

  // document verification
  isLandLocationVerified: true,
  landCheckMethodType: 'GPS',
  landCheckMethodTypeOther: '',
  distanceFromMainRoad: 0.25, // km
  addressLocation: 'Along Suksawat Rd, ~250m from main intersection; near logistics warehouses.',

  // land characteristics
  landShapeType: 'Polygon',
  urbanPlanningType: 'Industrial (Purple Zone)',
  landZoneType: ['Industrial', 'Warehouse'],
  plotLocationType: ['Inner plot'], // e.g. "แปลงกลาง"
  plotLocationTypeOther: '',
  landFillType: 'Filled',
  landFillTypeOther: '',
  landFillPercent: 95,
  soilLevel: 0.5, // meters above surrounding reference point (example)

  // road access
  accessRoadWidth: 10, // meters
  rightOfWay: 6, // meters
  roadFrontage: 85, // meters
  numberOfSidesFacingRoad: 1,
  roadPassInFrontOfLand: 'Public road',
  landAccessibilityType: 'Truck access (10-wheel)',
  landAccessibilityRemark:
    'Accessible for container trucks; turning radius OK; no weight restriction observed.',
  roadSurfaceType: 'Asphalt',
  roadSurfaceTypeOther: '',

  // utilities & infrastructure
  hasElectricity: true,
  electricityDistance: 0, // meters (available at frontage)
  publicUtilityType: ['Electricity', 'Water supply', 'Drainage', 'Internet/Fiber'],
  publicUtilityTypeOther: '',
  landUseType: ['Vacant land', 'Warehouse/Industrial'],
  landUseTypeOther: '',
  landEntranceExitType: ['Single entrance'],
  landEntranceExitTypeOther: '',
  transportationAccessType: ['Main road', 'Near expressway'],
  transportationAccessTypeOther: '',
  propertyAnticipationType: 'Industrial development / logistics hub',

  // legal information
  isExpropriated: false,
  expropriationRemark: '',
  isInExpropriationLine: false,
  expropriationLineRemark: '',
  royalDecree: '',
  isEncroached: false,
  encroachmentRemark: '',
  encroachmentArea: 0,
  isLandlocked: false,
  landlockedRemark: '',
  isForestBoundary: false,
  forestBoundaryRemark: '',
  otherLegalLimitations:
    'Subject to industrial zoning requirements; building height and EIA may apply depending on project.',
  evictionType: [],
  evictionTypeOther: '',
  allocationType: 'Private ownership (Chanote)',

  // adjacent boundaries
  northAdjacentArea: 'Warehouse',
  northBoundaryLength: 120,
  southAdjacentArea: 'Vacant land',
  southBoundaryLength: 115,
  eastAdjacentArea: 'Canal',
  eastBoundaryLength: 80,
  westAdjacentArea: 'Public road',
  westBoundaryLength: 85,

  // other
  pondArea: 0,
  pondDepth: 0,
  hasBuilding: false,
  hasBuildingOther: '',
  remark: 'Site inspection completed; photos captured; boundaries verified with GPS points.',
};

export const LAND_AND_BUILDING_PROPERTY = {
  // Property
  propertyId: '019e2a6b-9c2d-7a44-b2d1-6d2b7f5c3a10',
  appraisalId: '019e2a6b-a7d3-7e1b-9b6a-2a0e6f1d8c22',
  sequenceNumber: 1,
  propertyType: 'LandAndBuilding',
  description: 'Land with a warehouse building; good logistics access.',
  detailId: '019e2a6b-b5c8-7b30-8a12-9b9c2d4a1f03',

  // Property Identification
  propertyName: 'Suksawat Logistics Site',
  landDescription: 'Chanote title deed; boundaries verified; no visible encroachment.',
  latitude: 13.644231,
  longitude: 100.567812,
  subDistrict: 'Bang Ya Phraek',
  district: 'Phra Pradaeng',
  province: 'Samut Prakan',
  landOffice: 'Phra Pradaeng Land Office',

  // Owner Fields
  ownerName: 'Somchai P.',
  isOwnerVerified: true,
  hasObligation: true,
  obligationDetails: 'Mortgaged with local bank; normal status.',

  // Land - Document Verification
  isLandLocationVerified: true,
  landCheckMethodType: 'GPS',
  landCheckMethodTypeOther: '',

  // Land - Location Details
  street: 'Suksawat Road',
  soi: 'Soi Suksawat 78',
  distanceFromMainRoad: 0.25, // km
  village: 'Moo 3',
  addressLocation: '~250m from Suksawat main road; near logistics warehouses.',

  // Land - Characteristics
  landShapeType: 'Polygon',
  urbanPlanningType: 'Industrial (Purple Zone)',
  landZoneType: ['Industrial', 'Warehouse'],
  plotLocationType: ['Inner plot'],
  plotLocationOther: '',
  landFillType: 'Filled',
  landFillTypeOther: '',
  landFillPercent: 95,
  soilLevel: 0.5,

  // Land - Road Access
  accessRoadWidth: 10,
  rightOfWay: 6,
  roadFrontage: 85,
  numberOfSidesFacingRoad: 1,
  roadPassInFrontOfLand: 'Public road',
  landAccessibilityType: 'Truck access (10-wheel)',
  landAccessibilityRemark: 'Container truck accessible; no weight restriction observed.',
  roadSurfaceType: 'Asphalt',
  roadSurfaceTypeOther: '',

  // Land - Utilities
  hasElectricity: true,
  electricityDistance: 0,
  publicUtilityType: ['Electricity', 'Water supply', 'Drainage', 'Fiber internet'],
  publicUtilityTypeOther: '',
  landUseType: ['Warehouse/Industrial'],
  landUseTypeOther: '',
  landEntranceExitType: ['Single entrance'],
  landEntranceExitTypeOther: '',
  transportationAccessType: ['Main road', 'Near expressway'],
  transportationAccessTypeOther: '',
  propertyAnticipationType: 'Logistics / industrial development',

  // Land - Legal
  isExpropriated: false,
  expropriationRemark: '',
  isInExpropriationLine: false,
  expropriationLineRemark: '',
  royalDecree: '',
  isEncroached: false,
  encroachmentRemark: '',
  encroachmentArea: 0,
  isLandlocked: false,
  landlockedRemark: '',
  isForestBoundary: false,
  forestBoundaryRemark: '',
  otherLegalLimitations:
    'Industrial zoning requirements apply; certain projects may require EIA depending on size/type.',
  evictionType: [],
  evictionTypeOther: '',
  allocationType: 'Private ownership (Chanote)',

  // Land - Boundaries
  northAdjacentArea: 'Warehouse',
  northBoundaryLength: 120,
  southAdjacentArea: 'Vacant land',
  southBoundaryLength: 115,
  eastAdjacentArea: 'Canal',
  eastBoundaryLength: 80,
  westAdjacentArea: 'Public road',
  westBoundaryLength: 85,

  // Land - Other
  pondArea: 0,
  pondDepth: 0,
  hasBuilding: true,
  hasBuildingOther: '',

  // Building - Identification
  buildingNumber: 'B-01',
  modelName: 'Steel Frame Warehouse',
  builtOnTitleNumber: '12345/2560',
  houseNumber: '88/12',

  // Building Status
  buildingConditionType: 'Good',
  isUnderConstruction: false,
  constructionCompletionPercent: 100,
  constructionLicenseExpirationDate: null,
  isAppraisable: true,

  // Building Info
  buildingType: 'Warehouse',
  buildingTypeOther: '',
  numberOfFloors: 1,
  decorationType: 'Standard',
  decorationTypeOther: '',
  isEncroachingOthers: false,
  encroachingOthersRemark: '',
  encroachingOthersArea: 0,

  // Construction Details
  buildingMaterialType: 'Steel & Concrete',
  buildingStyleType: 'Modern industrial',
  isResidential: false,
  buildingAge: 7,
  constructionYear: 2019,
  residentialRemark: '',
  constructionStyleType: 'Pre-engineered metal building',
  constructionStyleRemark: 'Steel frame with concrete slab and high-clearance interior.',

  // Structure Components
  structureType: ['Steel frame', 'Reinforced concrete slab'],
  structureTypeOther: '',
  roofFrameType: ['Steel truss'],
  roofFrameTypeOther: '',
  roofType: ['Metal sheet'],
  roofTypeOther: '',
  ceilingType: ['None (open ceiling)'],
  ceilingTypeOther: '',
  interiorWallType: ['Painted block wall (partial)'],
  interiorWallTypeOther: '',
  exteriorWallType: ['Metal cladding'],
  exteriorWallTypeOther: '',
  fenceType: ['Concrete wall', 'Metal gate'],
  fenceTypeOther: '',
  constructionType: 'Permanent',
  constructionTypeOther: '',

  // Utilization
  utilizationType: 'Warehouse / storage',
  utilizationTypeOther: '',

  // Area & Pricing
  totalBuildingArea: 3200, // sqm
  buildingInsurancePrice: 25000000,
  sellingPrice: 185000000,
  forcedSalePrice: 148000000,

  // Remarks
  landRemark: 'Flat land; good drainage; utilities available at frontage.',
  buildingRemark: 'Well-maintained warehouse; suitable for logistics operations.',
};

export const CONDO_PROPERTY = {
  // Property
  propertyId: '019e2a6b-9c2d-7a44-b2d1-6d2b7f5c3a10',
  appraisalId: '019e2a6b-a7d3-7e1b-9b6a-2a0e6f1d8c22',
  sequenceNumber: 1,
  propertyType: 'Condo',
  description: 'High-rise condo near BTS; corner unit with city view.',
  detailId: '019e2a6b-faa0-7c12-8a4b-2a3e8c9d7f11',

  // Property Identification
  propertyName: 'Unit 18A',
  condoName: 'Skyline Residences Sukhumvit',
  buildingNumber: 'Tower A',
  modelName: '1 Bedroom Plus',
  builtOnTitleNumber: '1234/2562',
  condoRegistrationNumber: 'CONDO-REG-56789',
  roomNumber: '1808',
  floorNumber: 18,
  usableArea: 45.5, // sqm

  // Coordinates
  latitude: 13.732145,
  longitude: 100.569321,

  // Address
  subDistrict: 'Khlong Toei Nuea',
  district: 'Watthana',
  province: 'Bangkok',
  landOffice: 'Phra Khanong Land Office',

  // Owner
  ownerName: 'Nattapong S.',
  isOwnerVerified: true,
  buildingConditionType: 'Good',
  hasObligation: true,
  obligationDetails: 'Mortgage with commercial bank; normal status.',
  isDocumentValidated: true,

  // Location Details
  locationType: 'CBD / Near BTS',
  street: 'Sukhumvit Road',
  soi: 'Sukhumvit 39',
  distanceFromMainRoad: 0.12, // km
  accessRoadWidth: 8, // meters
  rightOfWay: 6,
  roadSurfaceType: 'Asphalt',
  roadSurfaceTypeOther: '',
  publicUtilityType: ['Electricity', 'Water supply', 'Fiber internet', 'Drainage'],
  publicUtilityTypeOther: '',

  // Building Info
  decorationType: 'Built-in (standard developer package)',
  decorationTypeOther: '',
  buildingAge: 4,
  numberOfFloors: 40,
  buildingFormType: 'High-rise',
  constructionMaterialType: 'Reinforced concrete',

  // Layout & Materials
  roomLayoutType: '1 Bedroom Plus',
  roomLayoutTypeOther: '',
  locationViewType: ['City view', 'Corner unit'],
  groundFloorMaterialType: 'Tile',
  groundFloorMaterialTypeOther: '',
  upperFloorMaterialType: 'Laminate',
  upperFloorMaterialTypeOther: '',
  bathroomFloorMaterialType: 'Tile',
  bathroomFloorMaterialTypeOther: '',
  roofType: 'Concrete slab (building roof)',
  roofTypeOther: '',

  // Area
  totalBuildingArea: 45.5,

  // Legal Restrictions
  isExpropriated: false,
  expropriationRemark: '',
  isInExpropriationLine: false,
  expropriationLineRemark: '',
  royalDecree: '',
  isForestBoundary: false,
  forestBoundaryRemark: '',

  // Facilities & Environment
  facilityType: ['Swimming pool', 'Fitness', '24-hour security', 'Parking', 'Co-working space'],
  facilityTypeOther: '',
  environmentType: ['Residential', 'CBD', 'Near public transport'],

  // Pricing
  buildingInsurancePrice: 2500000,
  sellingPrice: 7200000,
  forceSellingPrice: 5760000,

  // Other
  remark: 'Unit in good condition; view unobstructed; common areas well maintained.',
};
