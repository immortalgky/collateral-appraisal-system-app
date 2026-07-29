import type { TFunction } from 'i18next';

/**
 * Field/section labels are resolved through i18n at render time, so each list is a
 * factory taking `t` rather than a module constant. The same shape is used by
 * `makeLandDetailFormSchema` in ../../types/landDetail.ts.
 *
 * Key naming: lowerCamelCase of the ENGLISH label with parentheticals and punctuation
 * dropped — "Access Road Width (m)" -> `accessRoadWidth`, "Landfill %" -> `landfillPercent`.
 * Key off the LABEL, never `field.key`: `landFillType` is "Landfill Type" on land but
 * "Land Condition" on condo, and `buildingConditionType` is "Building Condition" vs
 * "Condition" — keying off the data key would silently mistranslate condo.
 */
type T = TFunction<'appraisal'>;

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

const landSections = (t: T): SectionDef[] => [
  {
    title: t('view360.sections.landInformation'),
    fields: [
      { key: 'propertyName', label: t('view360.fields.propertyName') },
      { key: 'latitude', label: t('view360.fields.latitude'), isNumber: true, decimalPlaces: 6 },
      { key: 'longitude', label: t('view360.fields.longitude'), isNumber: true, decimalPlaces: 6 },
      { key: 'subDistrictName', label: t('view360.fields.subDistrict') },
      { key: 'districtName', label: t('view360.fields.district') },
      { key: 'provinceName', label: t('view360.fields.province') },
      { key: 'landOffice', label: t('view360.fields.landOffice'), parameterGroup: 'LandOffice' },
      { key: 'landDescription', label: t('view360.fields.landDescription') },
      { key: 'isOwnerVerified', label: t('view360.fields.ownerVerified'), isBoolean: true },
      { key: 'ownerName', label: t('view360.fields.ownerName') },
      { key: 'hasObligation', label: t('view360.fields.hasObligation'), isBoolean: true },
      { key: 'obligationDetails', label: t('view360.fields.obligationDetails') },
    ],
  },
  {
    title: t('view360.sections.landLocation'),
    fields: [
      {
        key: 'isLandLocationVerified',
        label: t('view360.fields.locationVerified'),
        isBoolean: true,
      },
      {
        key: 'landCheckMethodType',
        label: t('view360.fields.checkMethod'),
        parameterGroup: 'CheckBy',
      },
      { key: 'street', label: t('view360.fields.street') },
      { key: 'soi', label: t('view360.fields.soi') },
      {
        key: 'distanceFromMainRoad',
        label: t('view360.fields.distanceFromMainRoad'),
        isNumber: true,
      },
      { key: 'village', label: t('view360.fields.village') },
      { key: 'addressLocation', label: t('view360.fields.addressLocation') },
      { key: 'landShapeType', label: t('view360.fields.landShape'), parameterGroup: 'LandShape' },
      {
        key: 'urbanPlanningType',
        label: t('view360.fields.urbanPlanning'),
        parameterGroup: 'TypeOfUrbanPlanning',
      },
      { key: 'landZoneType', label: t('view360.fields.landZone'), parameterGroup: 'Location' },
    ],
  },
  {
    title: t('view360.sections.plot&Landfill'),
    fields: [
      {
        key: 'plotLocationType',
        label: t('view360.fields.plotLocation'),
        parameterGroup: 'PlotLocation',
      },
      { key: 'landFillType', label: t('view360.fields.landfillType'), parameterGroup: 'Landfill' },
      { key: 'landFillPercent', label: t('view360.fields.landfillPercent'), isNumber: true },
      { key: 'soilLevel', label: t('view360.fields.soilLevel') },
    ],
  },
  {
    title: t('view360.sections.road&Access'),
    fields: [
      {
        key: 'accessRoadWidth',
        label: t('view360.fields.accessRoadWidth'),
        isNumber: true,
        decimalPlaces: 2,
      },
      { key: 'rightOfWay', label: t('view360.fields.rightOfWay') },
      {
        key: 'roadFrontage',
        label: t('view360.fields.roadFrontage'),
        isNumber: true,
        decimalPlaces: 2,
      },
      {
        key: 'numberOfSidesFacingRoad',
        label: t('view360.fields.sidesFacingRoad'),
        isNumber: true,
      },
      { key: 'roadPassInFrontOfLand', label: t('view360.fields.roadPassInFront') },
      {
        key: 'landAccessibilityType',
        label: t('view360.fields.accessibility'),
        parameterGroup: 'LandAccessibility',
      },
      {
        key: 'roadSurfaceType',
        label: t('view360.fields.roadSurface'),
        parameterGroup: 'RoadSurface',
      },
    ],
  },
  {
    title: t('view360.sections.infrastructure'),
    fields: [
      {
        key: 'publicUtilityType',
        label: t('view360.fields.publicUtility'),
        parameterGroup: 'PublicUtility',
      },
      { key: 'landUseType', label: t('view360.fields.landUse'), parameterGroup: 'LandUse' },
      {
        key: 'landEntranceExitType',
        label: t('view360.fields.entrancePerExit'),
        parameterGroup: 'LandEntranceExit',
      },
      {
        key: 'transportationAccessType',
        label: t('view360.fields.transportation'),
        parameterGroup: 'Transportation',
      },
      { key: 'hasElectricity', label: t('view360.fields.hasElectricity'), isBoolean: true },
      {
        key: 'electricityDistance',
        label: t('view360.fields.electricityDistance'),
        isNumber: true,
      },
    ],
  },
  {
    title: t('view360.sections.legal&Limitation'),
    fields: [
      { key: 'isExpropriated', label: t('view360.fields.expropriated'), isBoolean: true },
      {
        key: 'isInExpropriationLine',
        label: t('view360.fields.inExpropriationLine'),
        isBoolean: true,
      },
      { key: 'royalDecree', label: t('view360.fields.royalDecree') },
      { key: 'expropriationRemark', label: t('view360.fields.expropriationRemark') },
      { key: 'isEncroached', label: t('view360.fields.encroached'), isBoolean: true },
      { key: 'encroachmentArea', label: t('view360.fields.encroachmentArea'), isNumber: true },
      { key: 'encroachmentRemark', label: t('view360.fields.encroachmentRemark') },
      { key: 'isLandlocked', label: t('view360.fields.landlocked'), isBoolean: true },
      { key: 'landlockedRemark', label: t('view360.fields.landlockedRemark') },
      { key: 'isForestBoundary', label: t('view360.fields.forestBoundary'), isBoolean: true },
      { key: 'forestBoundaryRemark', label: t('view360.fields.forestBoundaryRemark') },
      { key: 'otherLegalLimitations', label: t('view360.fields.otherLegalLimitations') },
    ],
  },
  {
    title: t('view360.sections.assessment'),
    fields: [
      {
        key: 'propertyAnticipationType',
        label: t('view360.fields.anticipationOfProsperity'),
        parameterGroup: 'AnticipationOfProsperity',
      },
      { key: 'evictionType', label: t('view360.fields.eviction'), parameterGroup: 'Eviction' },
      {
        key: 'allocationType',
        label: t('view360.fields.allocation'),
        parameterGroup: 'Allocation',
      },
    ],
  },
  {
    title: t('view360.sections.size&Boundary'),
    fields: [
      {
        key: 'totalLandAreaInSqWa',
        label: t('view360.fields.totalArea'),
        isNumber: true,
        decimalPlaces: 2,
      },
      { key: 'northAdjacentArea', label: t('view360.fields.northAdjacent') },
      {
        key: 'northBoundaryLength',
        label: t('view360.fields.northBoundaryLength'),
        isNumber: true,
        decimalPlaces: 2,
      },
      { key: 'southAdjacentArea', label: t('view360.fields.southAdjacent') },
      {
        key: 'southBoundaryLength',
        label: t('view360.fields.southBoundaryLength'),
        isNumber: true,
        decimalPlaces: 2,
      },
      { key: 'eastAdjacentArea', label: t('view360.fields.eastAdjacent') },
      {
        key: 'eastBoundaryLength',
        label: t('view360.fields.eastBoundaryLength'),
        isNumber: true,
        decimalPlaces: 2,
      },
      { key: 'westAdjacentArea', label: t('view360.fields.westAdjacent') },
      {
        key: 'westBoundaryLength',
        label: t('view360.fields.westBoundaryLength'),
        isNumber: true,
        decimalPlaces: 2,
      },
    ],
  },
  {
    title: t('view360.sections.other'),
    fields: [
      { key: 'pondArea', label: t('view360.fields.pondArea'), isNumber: true },
      { key: 'pondDepth', label: t('view360.fields.pondDepth'), isNumber: true },
      { key: 'hasBuilding', label: t('view360.fields.hasBuilding'), isBoolean: true },
      { key: 'remark', label: t('view360.fields.remark') },
    ],
  },
];

const buildingSections = (t: T): SectionDef[] => [
  {
    title: t('view360.sections.buildingInformation'),
    fields: [
      { key: 'propertyName', label: t('view360.fields.propertyName') },
      { key: 'buildingNumber', label: t('view360.fields.buildingNo') },
      { key: 'houseNumber', label: t('view360.fields.houseNo') },
      { key: 'modelName', label: t('view360.fields.modelName') },
      { key: 'builtOnTitleNumber', label: t('view360.fields.builtOnTitleNo') },
      { key: 'isOwnerVerified', label: t('view360.fields.ownerVerified'), isBoolean: true },
      { key: 'ownerName', label: t('view360.fields.ownerName') },
      { key: 'hasObligation', label: t('view360.fields.hasObligation'), isBoolean: true },
      { key: 'obligationDetails', label: t('view360.fields.obligationDetails') },
      {
        key: 'buildingConditionType',
        label: t('view360.fields.buildingCondition'),
        parameterGroup: 'BuildingCondition',
      },
      { key: 'isUnderConstruction', label: t('view360.fields.underConstruction'), isBoolean: true },
      {
        key: 'constructionCompletionPercent',
        label: t('view360.fields.constructionCompletionPercent'),
        isNumber: true,
      },
      { key: 'isAppraisable', label: t('view360.fields.appraisable'), isBoolean: true },
    ],
  },
  {
    title: t('view360.sections.buildingType&Decoration'),
    fields: [
      {
        key: 'buildingType',
        label: t('view360.fields.buildingType'),
        parameterGroup: 'BuildingType',
      },
      { key: 'numberOfFloors', label: t('view360.fields.floors'), isNumber: true },
      { key: 'buildingAge', label: t('view360.fields.buildingAge'), isNumber: true },
      {
        key: 'decorationType',
        label: t('view360.fields.decoration'),
        parameterGroup: 'Decoration',
      },
    ],
  },
  {
    title: t('view360.sections.material&Structure'),
    fields: [
      {
        key: 'buildingMaterialType',
        label: t('view360.fields.buildingMaterial'),
        parameterGroup: 'BuildingMaterial',
      },
      {
        key: 'buildingStyleType',
        label: t('view360.fields.buildingStyle'),
        parameterGroup: 'BuildingStyle',
      },
      {
        key: 'constructionStyleType',
        label: t('view360.fields.constructionStyle'),
        parameterGroup: 'ConstructionStyle',
      },
      {
        key: 'structureType',
        label: t('view360.fields.structure'),
        parameterGroup: 'GeneralStructure',
      },
      { key: 'roofFrameType', label: t('view360.fields.roofFrame'), parameterGroup: 'RoofFrame' },
      { key: 'roofType', label: t('view360.fields.roof'), parameterGroup: 'Roof' },
      { key: 'ceilingType', label: t('view360.fields.ceiling'), parameterGroup: 'Ceiling' },
      {
        key: 'interiorWallType',
        label: t('view360.fields.interiorWall'),
        parameterGroup: 'Interior',
      },
      {
        key: 'exteriorWallType',
        label: t('view360.fields.exteriorWall'),
        parameterGroup: 'Exterior',
      },
      { key: 'fenceType', label: t('view360.fields.fence'), parameterGroup: 'Fence' },
      {
        key: 'constructionType',
        label: t('view360.fields.constructionType'),
        parameterGroup: 'ConstructionType',
      },
    ],
  },
  {
    title: t('view360.sections.usage'),
    fields: [
      { key: 'isResidential', label: t('view360.fields.residential'), isBoolean: true },
      {
        key: 'utilizationType',
        label: t('view360.fields.utilization'),
        parameterGroup: 'Utilization',
      },
      {
        key: 'totalBuildingArea',
        label: t('view360.fields.totalBuildingArea'),
        isNumber: true,
        decimalPlaces: 2,
      },
    ],
  },
  {
    title: t('view360.sections.encroachment'),
    fields: [
      { key: 'isEncroachingOthers', label: t('view360.fields.encroachingOthers'), isBoolean: true },
      { key: 'encroachingOthersArea', label: t('view360.fields.encroachingArea'), isNumber: true },
      { key: 'encroachingOthersRemark', label: t('view360.fields.encroachingRemark') },
    ],
  },
  {
    title: t('view360.sections.pricing'),
    fields: [
      {
        key: 'buildingInsurancePrice',
        label: t('view360.fields.insurancePrice'),
        isNumber: true,
        decimalPlaces: 2,
      },
      {
        key: 'sellingPrice',
        label: t('view360.fields.sellingPrice'),
        isNumber: true,
        decimalPlaces: 2,
      },
      {
        key: 'forcedSalePrice',
        label: t('view360.fields.forcedSalePrice'),
        isNumber: true,
        decimalPlaces: 2,
      },
    ],
  },
  {
    title: t('view360.sections.remark'),
    fields: [{ key: 'remark', label: t('view360.fields.remark') }],
  },
];

const condoSections = (t: T): SectionDef[] => [
  {
    title: t('view360.sections.condominiumInformation'),
    fields: [
      { key: 'propertyName', label: t('view360.fields.propertyName') },
      { key: 'condoName', label: t('view360.fields.condoName') },
      { key: 'roomNumber', label: t('view360.fields.roomNo') },
      { key: 'floorNumber', label: t('view360.fields.floor') },
      { key: 'buildingNumber', label: t('view360.fields.buildingNo') },
      { key: 'modelName', label: t('view360.fields.modelName') },
      { key: 'builtOnTitleNumber', label: t('view360.fields.builtOnTitleNo') },
      { key: 'condoRegistrationNumber', label: t('view360.fields.condoRegistrationNo') },
      {
        key: 'usableArea',
        label: t('view360.fields.usableArea'),
        isNumber: true,
        decimalPlaces: 2,
      },
      { key: 'latitude', label: t('view360.fields.latitude'), isNumber: true, decimalPlaces: 6 },
      { key: 'longitude', label: t('view360.fields.longitude'), isNumber: true, decimalPlaces: 6 },
      { key: 'subDistrictName', label: t('view360.fields.subDistrict') },
      { key: 'districtName', label: t('view360.fields.district') },
      { key: 'provinceName', label: t('view360.fields.province') },
      { key: 'landOffice', label: t('view360.fields.landOffice'), parameterGroup: 'LandOffice' },
      { key: 'isOwnerVerified', label: t('view360.fields.ownerVerified'), isBoolean: true },
      { key: 'ownerName', label: t('view360.fields.ownerName') },
      {
        key: 'buildingConditionType',
        label: t('view360.fields.condition'),
        parameterGroup: 'CondoCondition',
      },
      { key: 'hasObligation', label: t('view360.fields.hasObligation'), isBoolean: true },
      { key: 'obligationDetails', label: t('view360.fields.obligationDetails') },
      {
        key: 'documentValidationResultType',
        label: t('view360.fields.documentValidation'),
        parameterGroup: 'DocumentValidation',
      },
    ],
  },
  {
    title: t('view360.sections.location'),
    fields: [
      {
        key: 'locationType',
        label: t('view360.fields.locationType'),
        parameterGroup: 'CondoLocation',
      },
      { key: 'street', label: t('view360.fields.street') },
      { key: 'soi', label: t('view360.fields.soi') },
      {
        key: 'distanceFromMainRoad',
        label: t('view360.fields.distanceFromMainRoad'),
        isNumber: true,
      },
      {
        key: 'accessRoadWidth',
        label: t('view360.fields.accessRoadWidth'),
        isNumber: true,
        decimalPlaces: 2,
      },
      { key: 'rightOfWay', label: t('view360.fields.rightOfWay') },
      {
        key: 'roadSurfaceType',
        label: t('view360.fields.roadSurface'),
        parameterGroup: 'Condo_RoadSurface',
      },
      {
        key: 'publicUtilityType',
        label: t('view360.fields.publicUtility'),
        parameterGroup: 'Condo_PublicUtility',
      },
      {
        key: 'urbanPlanningType',
        label: t('view360.fields.urbanPlanning'),
        parameterGroup: 'TypeOfUrbanPlanning',
      },
      { key: 'landFillType', label: t('view360.fields.landCondition'), parameterGroup: 'Landfill' },
      { key: 'landUseType', label: t('view360.fields.landUse'), parameterGroup: 'LandUse' },
      {
        key: 'landEntranceExitType',
        label: t('view360.fields.entrancePerExit'),
        parameterGroup: 'LandEntranceExit',
      },
    ],
  },
  {
    title: t('view360.sections.building&Decoration'),
    fields: [
      { key: 'buildingAge', label: t('view360.fields.buildingAge'), isNumber: true },
      { key: 'numberOfFloors', label: t('view360.fields.floors'), isNumber: true },
      {
        key: 'buildingFormType',
        label: t('view360.fields.buildingForm'),
        parameterGroup: 'BuildingForm',
      },
      {
        key: 'constructionMaterialType',
        label: t('view360.fields.constructionMaterial'),
        parameterGroup: 'ConstructionMaterials',
      },
      {
        key: 'decorationType',
        label: t('view360.fields.decoration'),
        parameterGroup: 'Decoration',
      },
    ],
  },
  {
    title: t('view360.sections.room&Floor'),
    fields: [
      {
        key: 'roomLayoutType',
        label: t('view360.fields.roomLayout'),
        parameterGroup: 'RoomLayout',
      },
      {
        key: 'locationViewType',
        label: t('view360.fields.locationView'),
        parameterGroup: 'LocationView',
      },
      {
        key: 'groundFloorMaterialType',
        label: t('view360.fields.groundFloorMaterial'),
        parameterGroup: 'GroundFlooringMaterials',
      },
      {
        key: 'upperFloorMaterialType',
        label: t('view360.fields.upperFloorMaterial'),
        parameterGroup: 'UpperFlooringMaterials',
      },
      {
        key: 'bathroomFloorMaterialType',
        label: t('view360.fields.bathroomFloorMaterial'),
        parameterGroup: 'BathroomFlooringMaterials',
      },
      { key: 'roofType', label: t('view360.fields.roof'), parameterGroup: 'Condo_Roof' },
    ],
  },
  {
    title: t('view360.sections.legal'),
    fields: [
      { key: 'isExpropriated', label: t('view360.fields.expropriated'), isBoolean: true },
      {
        key: 'isInExpropriationLine',
        label: t('view360.fields.inExpropriationLine'),
        isBoolean: true,
      },
      { key: 'isForestBoundary', label: t('view360.fields.forestBoundary'), isBoolean: true },
      { key: 'forestBoundaryRemark', label: t('view360.fields.forestBoundaryRemark') },
    ],
  },
  {
    title: t('view360.sections.facilities&Environment'),
    fields: [
      { key: 'facilityType', label: t('view360.fields.facilities'), parameterGroup: 'Facilities' },
      {
        key: 'environmentType',
        label: t('view360.fields.environment'),
        parameterGroup: 'Environment',
      },
    ],
  },
  {
    title: t('view360.sections.pricing'),
    fields: [
      {
        key: 'buildingInsurancePrice',
        label: t('view360.fields.insurancePrice'),
        isNumber: true,
        decimalPlaces: 2,
      },
      {
        key: 'sellingPrice',
        label: t('view360.fields.sellingPrice'),
        isNumber: true,
        decimalPlaces: 2,
      },
      {
        key: 'forceSellingPrice',
        label: t('view360.fields.forcedSalePrice'),
        isNumber: true,
        decimalPlaces: 2,
      },
      {
        key: 'governmentPricePerSqm',
        label: t('view360.fields.governmentPricePerSqM'),
        isNumber: true,
        decimalPlaces: 2,
      },
      {
        key: 'governmentPrice',
        label: t('view360.fields.governmentPrice'),
        isNumber: true,
        decimalPlaces: 2,
      },
    ],
  },
  {
    title: t('view360.sections.remark'),
    fields: [{ key: 'remark', label: t('view360.fields.remark') }],
  },
];

const machinerySections = (t: T): SectionDef[] => [
  {
    title: t('view360.sections.machineryInformation'),
    fields: [
      { key: 'propertyName', label: t('view360.fields.propertyName') },
      { key: 'isOwnerVerified', label: t('view360.fields.ownerVerified'), isBoolean: true },
      { key: 'ownerName', label: t('view360.fields.ownerName') },
      {
        key: 'conditionUse',
        label: t('view360.fields.conditionOfUse'),
        parameterGroup: 'ConditionUse',
      },
      { key: 'isOperational', label: t('view360.fields.operational'), isBoolean: true },
    ],
  },
  {
    title: t('view360.sections.identification'),
    fields: [
      { key: 'machineName', label: t('view360.fields.machineName') },
      { key: 'brand', label: t('view360.fields.brand') },
      { key: 'model', label: t('view360.fields.model') },
      { key: 'series', label: t('view360.fields.series') },
      { key: 'yearOfManufacture', label: t('view360.fields.yearOfManufacture'), isNumber: true },
      {
        key: 'countryOfManufacture',
        label: t('view360.fields.country'),
        parameterGroup: 'Country',
      },
      { key: 'engineNo', label: t('view360.fields.engineNo') },
      { key: 'chassisNo', label: t('view360.fields.chassisNo') },
      { key: 'registrationNumber', label: t('view360.fields.registrationNo') },
    ],
  },
  {
    title: t('view360.sections.specifications'),
    fields: [
      { key: 'capacity', label: t('view360.fields.capacity') },
      { key: 'quantity', label: t('view360.fields.quantity'), isNumber: true },
      { key: 'width', label: t('view360.fields.width'), isNumber: true, decimalPlaces: 2 },
      { key: 'length', label: t('view360.fields.length'), isNumber: true, decimalPlaces: 2 },
      { key: 'height', label: t('view360.fields.height'), isNumber: true, decimalPlaces: 2 },
      { key: 'machineDimensions', label: t('view360.fields.dimensions') },
      { key: 'energyUse', label: t('view360.fields.energyUse') },
    ],
  },
  {
    title: t('view360.sections.purchase'),
    fields: [
      { key: 'purchaseDate', label: t('view360.fields.purchaseDate'), isDate: true },
      {
        key: 'purchasePrice',
        label: t('view360.fields.purchasePrice'),
        isNumber: true,
        decimalPlaces: 2,
      },
      { key: 'location', label: t('view360.fields.location') },
    ],
  },
  {
    title: t('view360.sections.condition&Usage'),
    fields: [
      { key: 'machineCondition', label: t('view360.fields.condition') },
      { key: 'machineAge', label: t('view360.fields.machineAge'), isNumber: true },
      { key: 'machineEfficiency', label: t('view360.fields.efficiency') },
      { key: 'machineTechnology', label: t('view360.fields.technology') },
      { key: 'usagePurpose', label: t('view360.fields.usagePurpose') },
      { key: 'machineParts', label: t('view360.fields.machineParts') },
    ],
  },
  {
    title: t('view360.sections.valuation'),
    fields: [
      {
        key: 'replacementValue',
        label: t('view360.fields.replacementValue'),
        isNumber: true,
        decimalPlaces: 2,
      },
      {
        key: 'conditionValue',
        label: t('view360.fields.conditionValue'),
        isNumber: true,
        decimalPlaces: 2,
      },
    ],
  },
  {
    title: t('view360.sections.other'),
    fields: [
      { key: 'appraiserOpinion', label: t('view360.fields.appraiserOpinion') },
      { key: 'other', label: t('view360.fields.other') },
      { key: 'remark', label: t('view360.fields.remark') },
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
  'Lease Agreement Condo': 'condo',
  Machine: 'machinery',
  Machinery: 'machinery',
  Vehicle: 'machinery',
  Vessel: 'machinery',
  L: 'land',
  B: 'building',
  U: 'condo',
  LB: 'land-building',
  M: 'machinery',
  MAC: 'machinery',
  VEH: 'machinery',
  VES: 'machinery',
  LSL: 'land',
  LSB: 'building',
  LS: 'land-building',
  LSU: 'condo',
};

export function getSectionsForType(propertyType: string, t: T): SectionDef[] {
  const key = PROPERTY_TYPE_TO_QUERY_KEY[propertyType] ?? 'land';

  switch (key) {
    case 'building':
      return buildingSections(t);
    case 'condo':
      return condoSections(t);
    case 'land-building':
      // Prefixes interpolate an already-resolved title, so they translate too.
      return [
        ...landSections(t).map(s => ({
          ...s,
          title: t('view360.sections.landPrefix', { title: s.title }),
        })),
        ...buildingSections(t).map(s => ({
          ...s,
          title: t('view360.sections.buildingPrefix', { title: s.title }),
        })),
      ];
    case 'machinery':
      return machinerySections(t);
    case 'land':
    default:
      return landSections(t);
  }
}
