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
  area: string;
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
  machineName?: string;
  brand?: string;
  model?: string;
  registrationNumber?: string;
  dimension?: string;
}

export interface PropertyGroup {
  id: string;
  name: string;
  items: PropertyItem[];
  description?: string | null;
  groupNumber?: number;
  pricingAnalysisId?: string | null;
}

export interface PropertyClipboardStore {
  clipboard: PropertyItem | null;
  copyProperty: (property: PropertyItem) => void;
  clearClipboard: () => void;
}
