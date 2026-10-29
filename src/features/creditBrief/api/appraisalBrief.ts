import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

/**
 * One collateral item on the brief.
 *
 * There is no per-item value on purpose — see the remarks on `BriefAsset` in the backend.
 * `AppraisalProperties.SellingPrice` is written on 6 of 105,660 rows, because pricing in this
 * system hangs off a property group, not a property.
 */
export interface BriefAsset {
  id: string;
  sequenceNumber: number;
  propertyType: string | null;
  title: string | null;
  area: string | null;
  location: string | null;
  /** Building type CODE — render through `ParameterDisplay group="BuildingType"`. */
  buildingType: string | null;
  numberOfFloors: number | null;
  /** Land area components. Raw, because rai-ngan-wa carry at 4 and 100 — totals need the parts. */
  areaRai: number | null;
  areaNgan: number | null;
  areaSquareWa: number | null;
  /** A machine's own name — it has no title, area or location to identify it by. */
  machineName: string | null;
  /** Free text behind `buildingType` '99' (อื่นๆ) — for that code this, not the label, is the answer. */
  buildingTypeOther: string | null;
  /** Storeys in the condo building this unit is in. */
  condoFloors: number | null;
  /** The floor the unit is on, as stored — nvarchar, and '-' on rows nobody filled in. Parse defensively. */
  condoFloorNumber: string | null;

  // ── descriptive fields the 3D scene draws from. Null when the property has no such detail. ──
  /** LandShape code. */
  landShapeType: string | null;
  /** The appraiser's own words behind LandShape code 99. Absent on an older API. */
  landShapeTypeOther?: string | null;
  /** Metres. */
  roadFrontage: number | null;
  /** Centimetres. */
  soilLevel: number | null;
  /** Landfill code. */
  landFillType: string | null;
  /** The appraiser's own words behind Landfill code 99. Absent on an older API. */
  landFillTypeOther?: string | null;
  /** LandUse codes. */
  landUseType: string[];
  /** The system records no unit for either pond figure. */
  pondArea: number | null;
  pondDepth: number | null;
  /** TRUE = the land is FAR from the electricity line (the FE label is "Far from Electricity"). */
  farFromElectricity: boolean | null;
  /** Metres. */
  electricityDistance: number | null;
  /** Metres. */
  accessRoadWidth: number | null;
  /** RoadSurface code. */
  roadSurfaceType: string | null;
  /** Only the directions that carry a text or a number. */
  boundaries: BriefBoundary[];
  isLandlocked: boolean | null;
  isExpropriated: boolean | null;
  isInExpropriationLine: boolean | null;
  isEncroached: boolean | null;
  isForestBoundary: boolean | null;
  /** Square metres. */
  totalBuildingArea: number | null;
  /** Roof MATERIAL codes (multi-select), not a roof form. */
  roofType: string[];
  fenceType: string[];
  isUnderConstruction: boolean | null;
  /** No house number AND depreciation rows exist AND every row is an improvement: nothing to draw as a building. */
  isDevelopmentOnly: boolean;
  /** Development item rows (`BuildingDepreciationDetails` where `IsBuilding = 0`), in row order. */
  improvements: BriefImprovement[];
  /** Condo unit usable area, m². */
  usableArea: number | null;
  /** Facilities codes. */
  facilityType: string[];
  /** LocationView codes. */
  locationViewType: string[];

  // ── raw fields behind the report's property sentences (see scene3d/summaryText.ts). ──
  // Zero and blank arrive as null where the report omits them. No appraised price is ever here.
  /** Every land title of the property, in entry order. `[]` for non-land assets. */
  landTitles?: BriefLandTitle[];
  /** The deed address as names (Title masters): what the report's title clause prints. */
  deedSubDistrictName?: string | null;
  deedDistrictName?: string | null;
  deedProvinceName?: string | null;
  /** The property's location as names (DOPA masters): the report's property location. Can differ from the deed's. */
  dopaSubDistrictName?: string | null;
  dopaDistrictName?: string | null;
  dopaProvinceName?: string | null;
  /** The building's type label, or the free text behind type '99', else the property's own name. */
  buildingDisplayName?: string | null;
  /** Years; null when not entered. */
  buildingAge?: number | null;
  /** A Thai label (code '99' resolves to its remark). */
  buildingCondition?: string | null;
  /** 0 up to 100 (exclusive) while an inspection says work is under way; null otherwise. */
  constructionProgressPercent?: number | null;
  // condo only
  roomNumber?: string | null;
  buildingNumber?: string | null;
  condoName?: string | null;
  condoRegistrationNumber?: string | null;
  builtOnTitleNumber?: string | null;
  condoAreas?: BriefCondoArea[];
  /** Government rate per square metre, as stored. */
  governmentPricePerSqm?: number | null;
  /** The appraiser's ตกสำรวจ flag: the report prints that word instead of the rate. */
  isMissingFromSurvey?: boolean | null;
  /** The free text behind code '99' (อื่นๆ) of the matching code list. May hold a raw '-': filter it. */
  landUseTypeOther?: string | null;
  /** The free text behind road surface code '99'. */
  roadSurfaceTypeOther?: string | null;
  roofTypeOther?: string | null;
  fenceTypeOther?: string | null;
  facilityTypeOther?: string | null;
  locationViewTypeOther?: string | null;
}

/** One land title (deed). `titleTypeLabel` / `titleNumberPrefix` follow the report's TitleDeedLabel. */
export interface BriefLandTitle {
  titleType: string | null;
  titleTypeLabel: string;
  titleNumberPrefix: string;
  titleNumber: string | null;
  bookNumber: string | null;
  pageNumber: string | null;
  landParcelNumber: string | null;
  surveyNumber: string | null;
  rawang: string | null;
  areaRai: number | null;
  areaNgan: number | null;
  areaSquareWa: number | null;
  /** Government rate per square wa, as stored (the report prints a stored 0 too). */
  governmentPricePerSqWa: number | null;
  isMissingFromSurvey: boolean;
}

/** One area component of a condo unit; `description` is the appraiser's own label. */
export interface BriefCondoArea {
  description: string | null;
  size: number;
}

/** One machine, with the fields the summary report describes it by. */
export interface BriefMachine {
  assetId: string;
  groupNumber: number | null;
  /** 'registered' | 'notRegistered' | 'notInstalled'. */
  section: string;
  machineName: string | null;
  brand: string | null;
  model: string | null;
  registrationNumber: string | null;
  serialNumber: string | null;
  yearOfManufacture: number | null;
  /** A Thai label. */
  machineCondition: string | null;
  /** '03' = surveyed but not found. */
  conditionUse: string | null;
  /** Null while the appraisal is not released to the caller: not shown, as with the appraised value. */
  isPriceCertified: boolean | null;
  registrationStatus: boolean;
  /** '2' = under procurement. */
  installationStatus: string | null;
}

/** What one side of the parcel adjoins. `distance` is the distance TO that neighbour, not the side's length. */
export interface BriefBoundary {
  direction: 'north' | 'south' | 'east' | 'west';
  adjacentArea: string | null;
  distance: number | null;
}

/** A free-text development item (fence, guard house, water tank…). No type code exists. */
export interface BriefImprovement {
  description: string | null;
  area: number | null;
}

/** A person to contact. `department` rides along because IntAdmin is not scoped to one desk. */
export interface BriefContact {
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  department: string | null;
  /** The bank code they log in with. Credit asks for desk staff by code as often as by name. */
  userName: string | null;
}

export interface BriefDocument {
  documentId: string;
  typeCode: string;
  typeName: string | null;
  typeNameTh: string | null;
  /** D042/D043 Appraisal Summary and D001 Appraisal Report — the ones credit actually files. */
  isPrimary: boolean;
  fileName: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string | null;
  /** Where the file is attached: the appraisal itself, its request, or one collateral title. */
  source: 'Appraisal' | 'Request' | 'Title';
  /** Title rows only. */
  titleNumber: string | null;
  /** Thai collateral type name, title rows only. */
  collateralTypeName: string | null;
  /** Set on a request/title file carried over from the previous appraisal of the same collateral. */
  carriedFromAppraisalNumber: string | null;
}

/**
 * Who the appraisal is sitting with right now.
 *
 * External work is assigned to a FIRM, not a named person — `assignedTo`/`name` are then null
 * and the `company*` fields carry the contact. Render whichever side is populated rather than
 * assuming there is always a person.
 *
 * `pendingCount > 1` means the step fanned out to a group (a committee review). This object
 * describes the most recently assigned of them, so say so rather than presenting the one name
 * as the only person involved.
 */
export interface BriefHolder {
  activityName: string | null;
  activityId: string | null;
  assignedTo: string | null;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  department: string | null;
  position: string | null;
  companyName: string | null;
  companyNameLocal: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyContactPerson: string | null;
  heldSince: string | null;
  pendingCount: number;
  /** The group a queued task waits in when no individual holds it — "IntAdmin", or
   *  "ExtAdmin:Team_<companyId>" when the pool was scoped to a team. Null when a person holds it. */
  poolName: string | null;
}

/** A committee sitting the appraisal is tabled at. Titles already name the committee and the sitting. */
export interface BriefMeeting {
  title: string | null;
  startAt: string | null;
  status: string | null;
}

/** An outside valuation firm and its admin — who credit actually rings about external work. */
export interface BriefExternalCompany {
  name: string | null;
  nameLocal: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  adminName: string | null;
  adminPhone: string | null;
  adminEmail: string | null;
}

/**
 * The project a BLOCK appraisal values.
 *
 * A block appraisal has zero `assets` — it values a whole project rather than a
 * list of properties — so this is its collateral, and the section must render it
 * or the panel claims the application has no security at all.
 */
export interface BriefProject {
  projectName: string | null;
  /** Shares the PropertyType wire format — 'U', 'LB', 'L'. */
  projectType: string | null;
  developer: string | null;
  unitForSaleCount: number | null;
  landAreaRai: number | null;
  landAreaNgan: number | null;
  landAreaSquareWa: number | null;
  subDistrict: string | null;
  numberOfPhase: number | null;
  /** Towers in the project. 0 for a horizontal project (houses, shophouses). */
  towerCount: number;
  /** Storeys in the tallest tower, or null when the project records none. */
  maxFloor: number | null;
  /** Units actually uploaded. Stands in for `unitForSaleCount`, which is often unset. */
  unitCount: number;
  /** Storeys of a house on a horizontal project — NOT the floor a condo unit is on. */
  unitStoreys: number | null;
  /** Condo projects only: real towers, `[]` for a horizontal project. */
  towers: BriefTower[];
  /** Units recorded with no tower. Counted in the totals, never drawn as a building. */
  unassignedUnits: number;
  unassignedSoldUnits: number;

  // ── horizontal (LB) project: the picture is a village of plots and houses ──
  isUnderConstruction: boolean | null;
  /** 0-100; null when none is recorded. */
  constructionProgressPercent: number | null;
  /** Facilities codes of the project's common area. */
  facilities: string[];
  /** The project parcel's descriptive fields; null when none is recorded. */
  land: BriefProjectLand | null;
  /** House models. `[]` for a condo project. */
  houseModels: BriefHouseModel[];
  /** Plots with their houses, in sequence order, at most 500 (`unitCount` is how many there are). `[]` for a condo project. */
  plots: BriefPlot[];

  // ── raw fields behind the report's project description ──
  houseNumber?: string | null;
  soi?: string | null;
  road?: string | null;
  /** Location as names (the `subDistrict` column is a geocode). */
  subDistrictName?: string | null;
  districtName?: string | null;
  provinceName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Partial Gregorian date as typed: "YYYY", "YYYY-MM" or "YYYY-MM-DD". */
  projectSaleLaunchDate?: string | null;
  /** PublicUtility labels (an unmapped code stays as the code). */
  utilities?: string[];
  utilitiesOther?: string | null;
  /** Facilities as labels; `facilities` holds the codes. */
  facilityLabels?: string[];
  facilitiesOther?: string | null;
}

export interface BriefProjectLand {
  landShapeType: string | null;
  /** Metres. */
  roadFrontage: number | null;
  accessRoadWidth: number | null;
  roadSurfaceType: string | null;
  landUseType: string[];
  isLandlocked: boolean | null;
  isExpropriated: boolean | null;
  isInExpropriationLine: boolean | null;
  isEncroached: boolean | null;
  isForestBoundary: boolean | null;
  landUseTypeOther?: string | null;
}

export interface BriefHouseModel {
  id: string;
  modelName: string | null;
  /** BuildingType code; null in the dev data. */
  buildingType: string | null;
  buildingTypeOther: string | null;
  numberOfFloors: number | null;
  /** Square wa. */
  standardLandArea: number | null;
  /** Square metres. */
  standardUsableArea: number | null;
  roofType: string[];
  fenceType: string[];
  units: number | null;
  soldUnits: number | null;
  /** Houses of this model; null when not entered. */
  numberOfHouse?: number | null;
  /** The building type's Thai label, or the free text behind type '99'. */
  buildingTypeDisplay?: string | null;
  /** ProjectModels.UsableAreaMin, null when not entered; the report's model area is `standardUsableArea ?? usableAreaMin`. */
  usableAreaMin?: number | null;
  roofTypeOther?: string | null;
  fenceTypeOther?: string | null;
}

export interface BriefPlot {
  plotNumber: string | null;
  houseNumber: string | null;
  modelId: string | null;
  modelType: string | null;
  numberOfFloors: number | null;
  /** Square wa. */
  landArea: number | null;
  /** Square metres. */
  usableArea: number | null;
  isSold: boolean | null;
}

export interface BriefTower {
  towerName: string | null;
  numberOfFloors: number | null;
  numberOfUnits: number | null;
  /** Units grouped by floor. `floor: null` collects units recorded with no floor. */
  floors: BriefTowerFloor[];
}

export interface BriefTowerFloor {
  floor: number | null;
  units: number;
  soldUnits: number;
}

export interface AppraisalBrief {
  id: string;
  appraisalNumber: string | null;
  requestNumber: string | null;
  loanApplicationNumber: string | null;
  status: string;
  appraisalType: string | null;
  purpose: string | null;
  channel: string | null;
  propertyTypes: string | null;

  customerName: string | null;
  customerCount: number;
  customerContactNumber: string | null;

  requestedBy: string | null;
  requestedByName: string | null;
  requestedAt: string | null;
  appointmentDateTime: string | null;
  completedAt: string | null;

  /**
   * The date the appraisal is due. A TARGET, not a forecast: the server stamps it once at
   * intake (requestedAt + the SLA policy's hours, counted in business hours) and never moves
   * it, so a late job keeps a date in the past rather than sliding. Render it as the commitment
   * it is, and once `completedAt` exists show that instead.
   */
  dueDate: string | null;

  facilityLimit: number | null;

  /**
   * The single flag the locked/unlocked rendering keys off. Do NOT re-derive it from `status`
   * in the client: the server owns the rule, and everything below arrives null while it is false.
   */
  isReleased: boolean;
  /** Looser than `isReleased`: the folder is withheld from a credit reader before approval, but an
   *  internal caller gets it whatever the status — including a cancelled appraisal, whose files
   *  they can already see on the Documents tab. Cannot be derived from `isReleased`. */
  documentsReleased: boolean;

  appraisalValue: number | null;
  forcedSaleValue: number | null;
  insuranceValue: number | null;
  valuationDate: string | null;
  /** Committee CODE (SUB_COMMITTEE / COMMITTEE / ...) — resolve it through `committeeNames.ts`. */
  approvedByCommittee: string | null;

  /** Null once nothing is pending — the work is finished or cancelled, so there is nobody to chase. */
  currentHolder: BriefHolder | null;

  /** Null when the appraisal has never been tabled — including one approved off the meeting path. */
  meeting: BriefMeeting | null;

  /** Null for an appraisal done in-house. */
  externalCompany: BriefExternalCompany | null;

  /** The appraisal department's admins — the same desk for every appraisal. */
  appraisalAdmins: BriefContact[];

  /** Set only for a block appraisal; `assets` is empty in that case. */
  project: BriefProject | null;

  assets: BriefAsset[];
  /** The machines, in the order the report prints them; each is also an entry in `assets`. */
  machines?: BriefMachine[];
  documents: BriefDocument[];
  /** Which code this appraisal's summary files under: D042 (progressive inspection) or D043. */
  summaryTypeCode: string;
  summaryTypeName: string | null;
  summaryTypeNameTh: string | null;
}

export const appraisalBriefKey = (id: string | undefined) => ['appraisal-brief', id] as const;

export function useGetAppraisalBrief(appraisalId: string | undefined) {
  return useQuery({
    queryKey: appraisalBriefKey(appraisalId),
    enabled: !!appraisalId,
    queryFn: async (): Promise<AppraisalBrief> => {
      const { data } = await axios.get<AppraisalBrief>(`/appraisals/${appraisalId}/brief`);
      return data;
    },
  });
}
