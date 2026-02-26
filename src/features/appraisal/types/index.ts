export const PropertyType = {
  BUILDING: 'Building',
  CONDOMINIUM: 'Condominium',
  LAND_AND_BUILDING: 'Land and building',
  LANDS: 'Lands',
  LEASE_AGREEMENT_BUILDING: 'Lease Agreement Building',
  LEASE_AGREEMENT_LAND_AND_BUILDING: 'Lease Agreement Land and building',
  LEASE_AGREEMENT_LANDS: 'Lease Agreement Lands',
  MACHINE: 'Machine',
  VEHICLE: 'Vehicle',
  VESSEL: 'Vessel',
} as const;

export type PropertyType = typeof PropertyType[keyof typeof PropertyType];

export interface PropertyPhoto {
  documentId: string;
  isThumbnail: boolean;
}

export interface PropertyItem {
  id: string;
  type: PropertyType;
  image?: string;
  photos?: PropertyPhoto[];
  address: string;
  area: string;
  priceRange: string;
  location: string;
  sequenceNumber?: number;
  detailId?: string;
}

export interface PropertyGroup {
  id: string;
  name: string;
  items: PropertyItem[];
  description?: string | null;
  groupNumber?: number;
  useSystemCalc?: boolean;
  pricingAnalysisId?: string | null;
}

export interface PropertyClipboardStore {
  clipboard: PropertyItem | null;
  copyProperty: (property: PropertyItem) => void;
  clearClipboard: () => void;
}
