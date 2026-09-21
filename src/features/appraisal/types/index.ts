import type { AreaUnit } from '../utils/areaFormat';

export const PropertyType = {
  BUILDING: 'Building',
  CONDOMINIUM: 'Condominium',
  LAND_AND_BUILDING: 'Land and building',
  LANDS: 'Lands',
  LEASE_AGREEMENT_BUILDING: 'Lease Agreement Building',
  LEASE_AGREEMENT_CONDO: 'Lease Agreement Condo',
  LEASE_AGREEMENT_LAND_AND_BUILDING: 'Lease Agreement Land and building',
  LEASE_AGREEMENT_LANDS: 'Lease Agreement Lands',
  MACHINE: 'Machine',
  VEHICLE: 'Vehicle',
  VESSEL: 'Vessel',
} as const;

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export interface PropertyPhoto {
  documentId: string;
  isThumbnail: boolean;
  mappingId?: string;
}

export interface LandTitleInfo {
  id?: string | null;
  titleNumber?: string | null;
  titleType?: string | null;
  bookNumber?: string | null;
  pageNumber?: string | null;
  landParcelNumber?: string | null;
  surveyNumber?: string | null;
  mapSheetNumber?: string | null;
  rawang?: string | null;
  aerialMapName?: string | null;
  aerialMapNumber?: string | null;
  rai?: number | null;
  ngan?: number | null;
  squareWa?: number | null;
  boundaryMarkerType?: string | null;
  documentValidationResultType?: string | null;
  governmentPricePerSqWa?: number | null;
  governmentPrice?: number | null;
  remark?: string | null;
}

export interface PropertyItem {
  id: string;
  type: PropertyType;
  image?: string;
  photos?: PropertyPhoto[];
  address: string;
  /** Display string, e.g. `1-2-30.00 (630 Sq.Wa)` or `33 Sq.M`. Machines carry dimensions here. */
  area: string;
  /** Raw area behind `area`. Absent for machines. See utils/areaFormat.ts. */
  areaValue?: number;
  areaUnit?: AreaUnit;
  latitude?: number;
  longitude?: number;
  priceRange: string;
  location: string;
  /** Title deed no(s) — comma-joined land titles, or condo unit deed. */
  titleNo?: string;
  /** Full land titles (land/land-and-building only). */
  titles?: LandTitleInfo[];
  sequenceNumber?: number;
  detailId?: string;
  brand?: string;
  model?: string;
  registrationNumber?: string;
  dimension?: string;
  /** Machinery only: ownership registered with the authorities. */
  registrationStatus?: boolean;
  /** Machinery only: the appraiser appraises a value for this machine (see FieldHelp on the form). */
  isPriceCertified?: boolean;
  /** Machinery only: ConditionUse parameter code — '01' in use, '02' not in use, '03' not found. */
  conditionUse?: string;
  /**
   * Building only: BuildingType parameter code. Older rows hold free text ('SingleHouse'), which
   * has no match in the master and is printed as it stands.
   */
  buildingType?: string;
  /** Building only: the appraiser's free-text type, filled in when `buildingType` is '99' (other). */
  buildingTypeOther?: string;
  /** Building only: storeys. Can be fractional — a mezzanine is recorded as half a floor. */
  numberOfFloors?: number;
}

export interface PropertyGroup {
  id: string;
  name: string;
  items: PropertyItem[];
  description?: string | null;
  groupNumber?: number;
  pricingAnalysisId?: string | null;
  /** Final appraised value of the group, once its pricing analysis has one. */
  appraisedValue?: number | null;
  /**
   * Whether the pricing analysis holds at least one method. The analysis itself is created as
   * soon as the screen is opened, so its existence alone does not mean anyone has started.
   */
  hasPricingMethods?: boolean;
}

export interface PropertyClipboardStore {
  clipboard: PropertyItem | null;
  copyProperty: (property: PropertyItem) => void;
  clearClipboard: () => void;
}
