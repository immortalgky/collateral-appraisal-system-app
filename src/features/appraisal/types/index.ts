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

export interface PropertyItem {
  id: string;
  type: PropertyType;
  image?: string;
  address: string;
  area: string;
  priceRange: string;
  location: string;
}

export interface PropertyGroup {
  id: string;
  name: string;
  items: PropertyItem[];
}

export interface PropertyStore {
  groups: PropertyGroup[];
  clipboard: PropertyItem | null;
  addGroup: () => void;
  deleteGroup: (groupId: string) => void;
  addPropertyToGroup: (groupId: string, property: Omit<PropertyItem, 'id'>) => void;
  updateProperty: (groupId: string, propertyId: string, updates: Partial<PropertyItem>) => void;
  deleteProperty: (groupId: string, propertyId: string) => void;
  movePropertyToGroup: (fromGroupId: string, toGroupId: string, propertyId: string) => void;
  reorderPropertiesInGroup: (groupId: string, oldIndex: number, newIndex: number) => void;
  copyProperty: (property: PropertyItem) => void;
  pasteProperty: (groupId: string) => void;
}
