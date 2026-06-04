import { z } from 'zod';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

// Land Detail Table Item Schema
export const LandDetailItemSchema = z.object({
  id: z.string().optional(),
  titleDeedNo: z.string(),
  bookNo: z.string(),
  pageNo: z.string(),
  landNo: z.string(),
  surveyNo: z.string(),
  sheetNo: z.string(),
  raiNganWa: z.string(),
  sqWa: z.string(),
  documentType: z.string(),
  rawang: z.string(),
  aerialPhotoNo: z.string(),
  boundaryMarker: z.string(),
  documentValidate: z.string(),
  pricePerSqWa: z.string(),
  governmentPrice: z.string(),
});

export type LandDetailItem = z.infer<typeof LandDetailItemSchema>;

/**
 * Factory that builds the land detail form schema with translated validation messages.
 * Use `makeLandDetailFormSchema(t)` in components; the static export below is a
 * type-only stand-in so callers can derive `LandDetailFormType` without a `t` instance.
 */
export const makeLandDetailFormSchema = (t: TFunction<'appraisal'>) =>
  buildLandDetailFormSchema(
    t('landDetailSchema.latitudeRequired'),
    t('landDetailSchema.longitudeRequired'),
    t('landDetailSchema.subDistrictRequired'),
    t('landDetailSchema.districtRequired'),
    t('landDetailSchema.provinceRequired'),
    t('landDetailSchema.landOfficeRequired'),
  );

/** Hook to resolve the schema per render (for zodResolver). */
export const useLandDetailFormSchema = () => {
  const { t } = useTranslation('appraisal');
  return makeLandDetailFormSchema(t);
};

function buildLandDetailFormSchema(
  latitudeMsg: string,
  longitudeMsg: string,
  subDistrictMsg: string,
  districtMsg: string,
  provinceMsg: string,
  landOfficeMsg: string,
) {
  return z.object({
  // Group selection
  groupId: z.string(),

  // Land Detail Table
  landDetails: z.array(LandDetailItemSchema),

  // Land Information
  propertyName: z.string().optional(),
  latitude: z.string().min(1, latitudeMsg),
  longitude: z.string().min(1, longitudeMsg),
  subDistrict: z.string().min(1, subDistrictMsg),
  district: z.string().min(1, districtMsg),
  province: z.string().min(1, provinceMsg),
  landOffice: z.string().min(1, landOfficeMsg),
  landDescription: z.string().optional(),

  // Check Owner
  checkOwner: z.enum(['can', 'cannot']),
  owner: z.string().optional(),

  // Is Obligation
  isObligation: z.enum(['noObligations', 'mortgageAsSecurity']),
  obligation: z.string().optional(),

  // Land Location
  landLocationCorrect: z.enum(['correct', 'incorrect']),
  checkBy: z.array(z.enum(['plot', 'rawang', 'other'])),
  checkByOther: z.string().optional(),
  street: z.string().optional(),
  soi: z.string().optional(),
  distance: z.string().optional(),
  village: z.string().optional(),
  addressLocation: z.string().optional(),
  landShape: z.string().optional(),
  urbanPlanningType: z.string().optional(),

  // Location
  location: z.array(
    z.enum(['sanitaryZone', 'municipality', 'subdivisionAdminOrg', 'bangkokMetropolitan']),
  ),

  // Plot Location
  plotLocation: z.array(
    z.enum([
      'showHouse',
      'cornerPlot',
      'nearClubhouse',
      'houseNotFacingAnother',
      'edgePlot',
      'cornerWithWindow',
      'cornerWithoutWindow',
      'cornerWithUTurn',
      'adjacentToMainRoad',
      'adjacentToPark',
      'nearParkOppositePark',
      'adjacentToClubhouse',
      'adjacentToLake',
      'oppositeLake',
      'frontZoneOfProject',
      'houseNotFacingEmpire',
      'privateZone',
      'adjacentToTransformer',
      'highVoltagePowerLines',
      'adjacentToSewageTreatment',
      'garbageDisposalArea',
      'other',
    ]),
  ),
  plotLocationOther: z.string().optional(),

  // Landfill
  landfill: z.enum(['emptyLand', 'filled', 'notFilledYet', 'partiallyFilled', 'other']),
  landfillOther: z.string().optional(),
  landfillHeight: z.string().optional(),

  // Road
  roadWidth: z.string().optional(),
  rightOfWay: z.string().optional(),
  roadFrontage: z.string().optional(),
  numberOrSidesFacingRoad: z.string().optional(),
  roadRunningInFrontOfLand: z.string().optional(),

  // Land Accessibility
  landAccessibility: z.enum(['able', 'unable', 'inAllocation']),
  landAccessibilityDescription: z.string().optional(),

  // Road Surface
  roadSurface: z.array(
    z.enum(['reinforcedConcrete', 'gravelCrushedStone', 'soil', 'paved', 'other']),
  ),
  roadSurfaceOther: z.string().optional(),

  // Public Utility
  publicUtility: z.array(
    z.enum([
      'permanentElectricity',
      'tapWaterGroundwater',
      'drainagePipeStone',
      'streetlight',
      'other',
    ]),
  ),
  publicUtilityOther: z.string().optional(),

  // Land Use
  landUse: z.array(z.enum(['residence', 'agriculture', 'commercial', 'industry', 'other'])),
  landUseOther: z.string().optional(),

  // Land Entrance-Exit
  landEntranceExit: z.array(
    z.enum(['publicInterest', 'insideAllocationProject', 'personal', 'servitude', 'other']),
  ),
  landEntranceExitOther: z.string().optional(),

  // Transportation
  transportation: z.array(z.enum(['car', 'bus', 'ship', 'footpath', 'other'])),
  transportationOther: z.string().optional(),

  // Anticipation of Property
  anticipationOfProperty: z.enum([
    'veryProspective',
    'moderate',
    'likelyToProsperInFuture',
    'littleChanceOfProsperity',
  ]),

  // Limitation
  limitation: z.object({
    isExpropriate: z.boolean(),
    inLineExpropriate: z.boolean(),
    royalDecree: z.boolean(),
    isEncroached: z.boolean(),
    areaSqWa: z.string().optional(),
    electricity: z.boolean(),
    distanceValue: z.string().optional(),
    isLandlocked: z.boolean(),
    isForestBoundary: z.boolean(),
  }),

  // Eviction
  eviction: z.array(z.enum(['permanentElectricity', 'subwayLine', 'other'])),
  evictionOther: z.string().optional(),

  // Allocation
  allocation: z.enum(['allocateNewProject', 'allocateOldProject', 'notAllocate']),

  // Size and Boundary of Land
  sizeAndBoundary: z.object({
    north: z.object({
      contactArea: z.string().optional(),
      estimateLength: z.string().optional(),
    }),
    south: z.object({
      contactArea: z.string().optional(),
      estimateLength: z.string().optional(),
    }),
    east: z.object({
      contactArea: z.string().optional(),
      estimateLength: z.string().optional(),
    }),
    west: z.object({
      contactArea: z.string().optional(),
      estimateLength: z.string().optional(),
    }),
  }),

  // Other Information
  frontArea: z.string().optional(),
  depthOfPlot: z.string().optional(),

  // Has Building
  hasBuilding: z.enum(['yes', 'no', 'other']),
  hasBuildingOther: z.string().optional(),

  // Remark
  remark: z.string().optional(),
  }); // end buildLandDetailFormSchema return
} // end buildLandDetailFormSchema

/** Static schema with English stand-in messages — use for type derivation only. */
export const LandDetailFormSchema = buildLandDetailFormSchema(
  'Latitude is required',
  'Longitude is required',
  'Sub-District is required',
  'District is required',
  'Province is required',
  'Land Office is required',
);

export type LandDetailFormType = z.infer<typeof LandDetailFormSchema>;

// Default values for form
export const landDetailFormDefaults: LandDetailFormType = {
  groupId: 'group1',
  landDetails: [],
  propertyName: '',
  latitude: '',
  longitude: '',
  subDistrict: '',
  district: '',
  province: '',
  landOffice: '',
  landDescription: '',
  checkOwner: 'can',
  owner: '',
  isObligation: 'noObligations',
  obligation: '',
  landLocationCorrect: 'correct',
  checkBy: [],
  checkByOther: '',
  street: '',
  soi: '',
  distance: '',
  village: '',
  addressLocation: '',
  landShape: '',
  urbanPlanningType: '',
  location: [],
  plotLocation: [],
  plotLocationOther: '',
  landfill: 'emptyLand',
  landfillOther: '',
  landfillHeight: '',
  roadWidth: '',
  rightOfWay: '',
  roadFrontage: '',
  numberOrSidesFacingRoad: '',
  roadRunningInFrontOfLand: '',
  landAccessibility: 'able',
  landAccessibilityDescription: '',
  roadSurface: [],
  roadSurfaceOther: '',
  publicUtility: [],
  publicUtilityOther: '',
  landUse: [],
  landUseOther: '',
  landEntranceExit: [],
  landEntranceExitOther: '',
  transportation: [],
  transportationOther: '',
  anticipationOfProperty: 'veryProspective',
  limitation: {
    isExpropriate: false,
    inLineExpropriate: false,
    royalDecree: false,
    isEncroached: false,
    areaSqWa: '',
    electricity: false,
    distanceValue: '',
    isLandlocked: false,
    isForestBoundary: false,
  },
  eviction: [],
  evictionOther: '',
  allocation: 'notAllocate',
  sizeAndBoundary: {
    north: { contactArea: '', estimateLength: '' },
    south: { contactArea: '', estimateLength: '' },
    east: { contactArea: '', estimateLength: '' },
    west: { contactArea: '', estimateLength: '' },
  },
  frontArea: '',
  depthOfPlot: '',
  hasBuilding: 'no',
  hasBuildingOther: '',
  remark: '',
};
