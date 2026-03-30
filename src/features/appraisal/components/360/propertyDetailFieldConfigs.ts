export interface FieldDef {
  key: string;
  label: string;
  isBoolean?: boolean;
  isNumber?: boolean;
  isDate?: boolean;
  parameterGroup?: string;
  decimalPlaces?: number;
}

export interface SectionDef {
  title: string;
  fields: FieldDef[];
}

const LAND_SECTIONS: SectionDef[] = [
  {
    title: 'Land Information',
    fields: [
      { key: 'propertyName', label: 'Property Name' },
      { key: 'latitude', label: 'Latitude', isNumber: true, decimalPlaces: 6 },
      { key: 'longitude', label: 'Longitude', isNumber: true, decimalPlaces: 6 },
      { key: 'subDistrictName', label: 'Sub-district' },
      { key: 'districtName', label: 'District' },
      { key: 'provinceName', label: 'Province' },
      { key: 'landOffice', label: 'Land Office', parameterGroup: 'LandOffice' },
      { key: 'landDescription', label: 'Land Description' },
      { key: 'isOwnerVerified', label: 'Owner Verified', isBoolean: true },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'hasObligation', label: 'Has Obligation', isBoolean: true },
      { key: 'obligationDetails', label: 'Obligation Details' },
    ],
  },
  {
    title: 'Land Location',
    fields: [
      { key: 'isLandLocationVerified', label: 'Location Verified', isBoolean: true },
      { key: 'landCheckMethodType', label: 'Check Method', parameterGroup: 'CheckBy' },
      { key: 'street', label: 'Street' },
      { key: 'soi', label: 'Soi' },
      { key: 'distanceFromMainRoad', label: 'Distance from Main Road', isNumber: true },
      { key: 'village', label: 'Village' },
      { key: 'addressLocation', label: 'Address Location' },
      { key: 'landShapeType', label: 'Land Shape', parameterGroup: 'LandShape' },
      { key: 'urbanPlanningType', label: 'Urban Planning', parameterGroup: 'TypeOfUrbanPlanning' },
      { key: 'landZoneType', label: 'Land Zone', parameterGroup: 'Location' },
    ],
  },
  {
    title: 'Plot & Landfill',
    fields: [
      { key: 'plotLocationType', label: 'Plot Location', parameterGroup: 'PlotLocation' },
      { key: 'landFillType', label: 'Landfill Type', parameterGroup: 'Landfill' },
      { key: 'landFillPercent', label: 'Landfill %', isNumber: true },
      { key: 'soilLevel', label: 'Soil Level' },
    ],
  },
  {
    title: 'Road & Access',
    fields: [
      { key: 'accessRoadWidth', label: 'Access Road Width (m)', isNumber: true, decimalPlaces: 2 },
      { key: 'rightOfWay', label: 'Right of Way' },
      { key: 'roadFrontage', label: 'Road Frontage (m)', isNumber: true, decimalPlaces: 2 },
      { key: 'numberOfSidesFacingRoad', label: 'Sides Facing Road', isNumber: true },
      { key: 'roadPassInFrontOfLand', label: 'Road Pass in Front' },
      { key: 'landAccessibilityType', label: 'Accessibility', parameterGroup: 'LandAccessibility' },
      { key: 'roadSurfaceType', label: 'Road Surface', parameterGroup: 'RoadSurface' },
    ],
  },
  {
    title: 'Infrastructure',
    fields: [
      { key: 'publicUtilityType', label: 'Public Utility', parameterGroup: 'PublicUtility' },
      { key: 'landUseType', label: 'Land Use', parameterGroup: 'LandUse' },
      { key: 'landEntranceExitType', label: 'Entrance/Exit', parameterGroup: 'LandEntranceExit' },
      { key: 'transportationAccessType', label: 'Transportation', parameterGroup: 'Transportation' },
      { key: 'hasElectricity', label: 'Has Electricity', isBoolean: true },
      { key: 'electricityDistance', label: 'Electricity Distance', isNumber: true },
    ],
  },
  {
    title: 'Legal & Limitation',
    fields: [
      { key: 'isExpropriated', label: 'Expropriated', isBoolean: true },
      { key: 'isInExpropriationLine', label: 'In Expropriation Line', isBoolean: true },
      { key: 'royalDecree', label: 'Royal Decree' },
      { key: 'expropriationRemark', label: 'Expropriation Remark' },
      { key: 'isEncroached', label: 'Encroached', isBoolean: true },
      { key: 'encroachmentArea', label: 'Encroachment Area', isNumber: true },
      { key: 'encroachmentRemark', label: 'Encroachment Remark' },
      { key: 'isLandlocked', label: 'Landlocked', isBoolean: true },
      { key: 'landlockedRemark', label: 'Landlocked Remark' },
      { key: 'isForestBoundary', label: 'Forest Boundary', isBoolean: true },
      { key: 'forestBoundaryRemark', label: 'Forest Boundary Remark' },
      { key: 'otherLegalLimitations', label: 'Other Legal Limitations' },
    ],
  },
  {
    title: 'Assessment',
    fields: [
      { key: 'propertyAnticipationType', label: 'Anticipation of Prosperity', parameterGroup: 'AnticipationOfProsperity' },
      { key: 'evictionType', label: 'Eviction', parameterGroup: 'Eviction' },
      { key: 'allocationType', label: 'Allocation', parameterGroup: 'Allocation' },
    ],
  },
  {
    title: 'Size & Boundary',
    fields: [
      { key: 'totalLandAreaInSqWa', label: 'Total Area (Sq.Wa)', isNumber: true, decimalPlaces: 2 },
      { key: 'northAdjacentArea', label: 'North Adjacent' },
      { key: 'northBoundaryLength', label: 'North Boundary Length', isNumber: true, decimalPlaces: 2 },
      { key: 'southAdjacentArea', label: 'South Adjacent' },
      { key: 'southBoundaryLength', label: 'South Boundary Length', isNumber: true, decimalPlaces: 2 },
      { key: 'eastAdjacentArea', label: 'East Adjacent' },
      { key: 'eastBoundaryLength', label: 'East Boundary Length', isNumber: true, decimalPlaces: 2 },
      { key: 'westAdjacentArea', label: 'West Adjacent' },
      { key: 'westBoundaryLength', label: 'West Boundary Length', isNumber: true, decimalPlaces: 2 },
    ],
  },
  {
    title: 'Other',
    fields: [
      { key: 'pondArea', label: 'Pond Area', isNumber: true },
      { key: 'pondDepth', label: 'Pond Depth', isNumber: true },
      { key: 'hasBuilding', label: 'Has Building', isBoolean: true },
      { key: 'remark', label: 'Remark' },
    ],
  },
];

const BUILDING_SECTIONS: SectionDef[] = [
  {
    title: 'Building Information',
    fields: [
      { key: 'propertyName', label: 'Property Name' },
      { key: 'buildingNumber', label: 'Building No.' },
      { key: 'houseNumber', label: 'House No.' },
      { key: 'modelName', label: 'Model Name' },
      { key: 'builtOnTitleNumber', label: 'Built on Title No.' },
      { key: 'isOwnerVerified', label: 'Owner Verified', isBoolean: true },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'hasObligation', label: 'Has Obligation', isBoolean: true },
      { key: 'obligationDetails', label: 'Obligation Details' },
      { key: 'buildingConditionType', label: 'Building Condition', parameterGroup: 'BuildingCondition' },
      { key: 'isUnderConstruction', label: 'Under Construction', isBoolean: true },
      { key: 'constructionCompletionPercent', label: 'Construction Completion %', isNumber: true },
      { key: 'isAppraisable', label: 'Appraisable', isBoolean: true },
    ],
  },
  {
    title: 'Building Type & Decoration',
    fields: [
      { key: 'buildingType', label: 'Building Type', parameterGroup: 'BuildingType' },
      { key: 'numberOfFloors', label: 'Floors', isNumber: true },
      { key: 'buildingAge', label: 'Building Age (yrs)', isNumber: true },
      { key: 'decorationType', label: 'Decoration', parameterGroup: 'Decoration' },
    ],
  },
  {
    title: 'Material & Structure',
    fields: [
      { key: 'buildingMaterialType', label: 'Building Material', parameterGroup: 'BuildingMaterial' },
      { key: 'buildingStyleType', label: 'Building Style', parameterGroup: 'BuildingStyle' },
      { key: 'constructionStyleType', label: 'Construction Style', parameterGroup: 'ConstructionStyle' },
      { key: 'structureType', label: 'Structure', parameterGroup: 'GeneralStructure' },
      { key: 'roofFrameType', label: 'Roof Frame', parameterGroup: 'RoofFrame' },
      { key: 'roofType', label: 'Roof', parameterGroup: 'Roof' },
      { key: 'ceilingType', label: 'Ceiling', parameterGroup: 'Ceiling' },
      { key: 'interiorWallType', label: 'Interior Wall', parameterGroup: 'Interior' },
      { key: 'exteriorWallType', label: 'Exterior Wall', parameterGroup: 'Exterior' },
      { key: 'fenceType', label: 'Fence', parameterGroup: 'Fence' },
      { key: 'constructionType', label: 'Construction Type', parameterGroup: 'ConstructionType' },
    ],
  },
  {
    title: 'Usage',
    fields: [
      { key: 'isResidential', label: 'Residential', isBoolean: true },
      { key: 'utilizationType', label: 'Utilization', parameterGroup: 'Utilization' },
      { key: 'totalBuildingArea', label: 'Total Building Area', isNumber: true, decimalPlaces: 2 },
    ],
  },
  {
    title: 'Encroachment',
    fields: [
      { key: 'isEncroachingOthers', label: 'Encroaching Others', isBoolean: true },
      { key: 'encroachingOthersArea', label: 'Encroaching Area', isNumber: true },
      { key: 'encroachingOthersRemark', label: 'Encroaching Remark' },
    ],
  },
  {
    title: 'Pricing',
    fields: [
      { key: 'buildingInsurancePrice', label: 'Insurance Price', isNumber: true, decimalPlaces: 2 },
      { key: 'sellingPrice', label: 'Selling Price', isNumber: true, decimalPlaces: 2 },
      { key: 'forcedSalePrice', label: 'Forced Sale Price', isNumber: true, decimalPlaces: 2 },
    ],
  },
  {
    title: 'Remark',
    fields: [
      { key: 'remark', label: 'Remark' },
    ],
  },
];

const CONDO_SECTIONS: SectionDef[] = [
  {
    title: 'Condominium Information',
    fields: [
      { key: 'propertyName', label: 'Property Name' },
      { key: 'condoName', label: 'Condo Name' },
      { key: 'roomNumber', label: 'Room No.' },
      { key: 'floorNumber', label: 'Floor' },
      { key: 'buildingNumber', label: 'Building No.' },
      { key: 'modelName', label: 'Model Name' },
      { key: 'builtOnTitleNumber', label: 'Built on Title No.' },
      { key: 'condoRegistrationNumber', label: 'Condo Registration No.' },
      { key: 'usableArea', label: 'Usable Area (sq.m.)', isNumber: true, decimalPlaces: 2 },
      { key: 'latitude', label: 'Latitude', isNumber: true, decimalPlaces: 6 },
      { key: 'longitude', label: 'Longitude', isNumber: true, decimalPlaces: 6 },
      { key: 'subDistrictName', label: 'Sub-district' },
      { key: 'districtName', label: 'District' },
      { key: 'provinceName', label: 'Province' },
      { key: 'landOffice', label: 'Land Office', parameterGroup: 'LandOffice' },
      { key: 'isOwnerVerified', label: 'Owner Verified', isBoolean: true },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'buildingConditionType', label: 'Condition', parameterGroup: 'CondoCondition' },
      { key: 'hasObligation', label: 'Has Obligation', isBoolean: true },
      { key: 'obligationDetails', label: 'Obligation Details' },
      { key: 'documentValidationResultType', label: 'Document Validation', parameterGroup: 'DocumentValidation' },
    ],
  },
  {
    title: 'Location',
    fields: [
      { key: 'locationType', label: 'Location Type', parameterGroup: 'CondoLocation' },
      { key: 'street', label: 'Street' },
      { key: 'soi', label: 'Soi' },
      { key: 'distanceFromMainRoad', label: 'Distance from Main Road', isNumber: true },
      { key: 'accessRoadWidth', label: 'Access Road Width (m)', isNumber: true, decimalPlaces: 2 },
      { key: 'rightOfWay', label: 'Right of Way' },
      { key: 'roadSurfaceType', label: 'Road Surface', parameterGroup: 'Condo_RoadSurface' },
      { key: 'publicUtilityType', label: 'Public Utility', parameterGroup: 'Condo_PublicUtility' },
    ],
  },
  {
    title: 'Building & Decoration',
    fields: [
      { key: 'buildingAge', label: 'Building Age (yrs)', isNumber: true },
      { key: 'numberOfFloors', label: 'Floors', isNumber: true },
      { key: 'buildingFormType', label: 'Building Form', parameterGroup: 'BuildingForm' },
      { key: 'constructionMaterialType', label: 'Construction Material', parameterGroup: 'ConstructionMaterials' },
      { key: 'decorationType', label: 'Decoration', parameterGroup: 'Decoration' },
    ],
  },
  {
    title: 'Room & Floor',
    fields: [
      { key: 'roomLayoutType', label: 'Room Layout', parameterGroup: 'RoomLayout' },
      { key: 'locationViewType', label: 'Location View', parameterGroup: 'LocationView' },
      { key: 'groundFloorMaterialType', label: 'Ground Floor Material', parameterGroup: 'GroundFlooringMaterials' },
      { key: 'upperFloorMaterialType', label: 'Upper Floor Material', parameterGroup: 'UpperFlooringMaterials' },
      { key: 'bathroomFloorMaterialType', label: 'Bathroom Floor Material', parameterGroup: 'BathroomFlooringMaterials' },
      { key: 'roofType', label: 'Roof', parameterGroup: 'Condo_Roof' },
    ],
  },
  {
    title: 'Legal',
    fields: [
      { key: 'isExpropriated', label: 'Expropriated', isBoolean: true },
      { key: 'isInExpropriationLine', label: 'In Expropriation Line', isBoolean: true },
      { key: 'isForestBoundary', label: 'Forest Boundary', isBoolean: true },
      { key: 'forestBoundaryRemark', label: 'Forest Boundary Remark' },
    ],
  },
  {
    title: 'Facilities & Environment',
    fields: [
      { key: 'facilityType', label: 'Facilities', parameterGroup: 'Facilities' },
      { key: 'environmentType', label: 'Environment', parameterGroup: 'Environment' },
    ],
  },
  {
    title: 'Pricing',
    fields: [
      { key: 'buildingInsurancePrice', label: 'Insurance Price', isNumber: true, decimalPlaces: 2 },
      { key: 'sellingPrice', label: 'Selling Price', isNumber: true, decimalPlaces: 2 },
      { key: 'forceSellingPrice', label: 'Forced Sale Price', isNumber: true, decimalPlaces: 2 },
    ],
  },
  {
    title: 'Remark',
    fields: [
      { key: 'remark', label: 'Remark' },
    ],
  },
];

const MACHINERY_SECTIONS: SectionDef[] = [
  {
    title: 'Machinery Information',
    fields: [
      { key: 'propertyName', label: 'Property Name' },
      { key: 'isOwnerVerified', label: 'Owner Verified', isBoolean: true },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'conditionUse', label: 'Condition of Use', parameterGroup: 'ConditionUse' },
      { key: 'isOperational', label: 'Operational', isBoolean: true },
    ],
  },
  {
    title: 'Identification',
    fields: [
      { key: 'machineName', label: 'Machine Name' },
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'series', label: 'Series' },
      { key: 'yearOfManufacture', label: 'Year of Manufacture', isNumber: true },
      { key: 'countryOfManufacture', label: 'Country', parameterGroup: 'Country' },
      { key: 'engineNo', label: 'Engine No.' },
      { key: 'chassisNo', label: 'Chassis No.' },
      { key: 'registrationNo', label: 'Registration No.' },
    ],
  },
  {
    title: 'Specifications',
    fields: [
      { key: 'capacity', label: 'Capacity' },
      { key: 'quantity', label: 'Quantity', isNumber: true },
      { key: 'width', label: 'Width', isNumber: true, decimalPlaces: 2 },
      { key: 'length', label: 'Length', isNumber: true, decimalPlaces: 2 },
      { key: 'height', label: 'Height', isNumber: true, decimalPlaces: 2 },
      { key: 'machineDimensions', label: 'Dimensions' },
      { key: 'energyUse', label: 'Energy Use' },
    ],
  },
  {
    title: 'Purchase',
    fields: [
      { key: 'purchaseDate', label: 'Purchase Date', isDate: true },
      { key: 'purchasePrice', label: 'Purchase Price', isNumber: true, decimalPlaces: 2 },
      { key: 'location', label: 'Location' },
    ],
  },
  {
    title: 'Condition & Usage',
    fields: [
      { key: 'machineCondition', label: 'Condition' },
      { key: 'machineAge', label: 'Machine Age', isNumber: true },
      { key: 'machineEfficiency', label: 'Efficiency' },
      { key: 'machineTechnology', label: 'Technology' },
      { key: 'usagePurpose', label: 'Usage Purpose' },
      { key: 'machineParts', label: 'Machine Parts' },
    ],
  },
  {
    title: 'Valuation',
    fields: [
      { key: 'replacementValue', label: 'Replacement Value', isNumber: true, decimalPlaces: 2 },
      { key: 'conditionValue', label: 'Condition Value', isNumber: true, decimalPlaces: 2 },
    ],
  },
  {
    title: 'Other',
    fields: [
      { key: 'appraiserOpinion', label: 'Appraiser Opinion' },
      { key: 'other', label: 'Other' },
      { key: 'remark', label: 'Remark' },
    ],
  },
];

const PROPERTY_TYPE_TO_QUERY_KEY: Record<string, string> = {
  Lands: 'land',
  Building: 'building',
  Condominium: 'condo',
  'Land and building': 'land-building',
  'Lease Agreement Lands': 'land',
  'Lease Agreement Building': 'building',
  'Lease Agreement Land and building': 'land-building',
  Machine: 'machinery',
  Vehicle: 'machinery',
  Vessel: 'machinery',
  L: 'land',
  B: 'building',
  U: 'condo',
  LB: 'land-building',
  M: 'machinery',
};

export function getSectionsForType(propertyType: string): SectionDef[] {
  const key = PROPERTY_TYPE_TO_QUERY_KEY[propertyType] ?? 'land';

  switch (key) {
    case 'building':
      return BUILDING_SECTIONS;
    case 'condo':
      return CONDO_SECTIONS;
    case 'land-building':
      return [
        ...LAND_SECTIONS.map(s => ({ ...s, title: `Land: ${s.title}` })),
        ...BUILDING_SECTIONS.map(s => ({ ...s, title: `Building: ${s.title}` })),
      ];
    case 'machinery':
      return MACHINERY_SECTIONS;
    case 'land':
    default:
      return LAND_SECTIONS;
  }
}
