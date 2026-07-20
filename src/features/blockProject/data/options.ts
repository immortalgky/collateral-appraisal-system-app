import type { ListBoxItem } from '@/shared/components/inputs/Dropdown';

// =============================================================================
// Shared options (no matching parameter group on the BE — keep local)
// NOTE: ProjectType labels are now sourced from useParameterDescription('ProjectType', code).
// =============================================================================

export const LOCATION_METHOD_OPTIONS = [
  { value: 'AdjustPriceSqm', label: 'Adjust Price (Baht/sq.m.)' },
  { value: 'AdjustPricePercentage', label: 'Adjust Price (%)' },
  { value: 'Lumpsum', label: 'Lumpsum (flat Baht)' },
];

// =============================================================================
// Condo-specific options (no matching parameter group)
// =============================================================================

// Fire-insurance condition options are sourced from the API — see
// useFireInsuranceOptions in @/shared/api/pricingParameters.

/**
 * "Project Type" dropdown on the Condo project info form.
 * Refers to the condo product category (Condominium / Apartment / etc.),
 * NOT the Project.projectType discriminator (Condo | LandAndBuilding).
 */
export const CONDO_PROJECT_TYPE_OPTIONS: ListBoxItem[] = [
  { id: 'Condominium', value: 'Condominium', label: 'Condominium' },
  { id: 'Apartment', value: 'Apartment', label: 'Apartment' },
  { id: 'ServicedApartment', value: 'ServicedApartment', label: 'Serviced Apartment' },
];

// =============================================================================
// LandAndBuilding-specific options (no matching parameter group)
// =============================================================================

/**
 * "Project Type" dropdown on the LB project info form.
 * Refers to the village/housing product category, NOT the discriminator.
 */
export const LB_PROJECT_TYPE_OPTIONS: ListBoxItem[] = [
  { id: 'VillageHousing', value: 'VillageHousing', label: 'Village Housing' },
  { id: 'TownHouseProject', value: 'TownHouseProject', label: 'Town House Project' },
  { id: 'DetachedHouseProject', value: 'DetachedHouseProject', label: 'Detached House Project' },
  { id: 'MixedProject', value: 'MixedProject', label: 'Mixed Project' },
];

export const LB_PROJECT_STATUS_OPTIONS: ListBoxItem[] = [
  { id: 'Active', value: 'Active', label: 'Active' },
  { id: 'Completed', value: 'Completed', label: 'Completed' },
  { id: 'OnHold', value: 'OnHold', label: 'On Hold' },
  { id: 'Cancelled', value: 'Cancelled', label: 'Cancelled' },
];

export const LB_FLOOR_SURFACE_TYPE_OPTIONS = [
  { value: 'PolishedConcrete', label: 'Polished Concrete' },
  { value: 'GlazedTiles', label: 'Glazed Tiles' },
  { value: 'Parquet', label: 'Parquet' },
  { value: 'Marble', label: 'Marble' },
  { value: 'Granite', label: 'Granite' },
  { value: 'Laminate', label: 'Laminate' },
  { value: 'Other', label: 'Other' },
];

export const LB_FLOOR_STRUCTURE_TYPE_OPTIONS = [
  { value: 'ReinforcedConcrete', label: 'Reinforced Concrete' },
  { value: 'WoodJoist', label: 'Wood Joist' },
  { value: 'SteelDeck', label: 'Steel Deck' },
  { value: 'Other', label: 'Other' },
];

// Fire-insurance condition options are sourced from the API — see
// useFireInsuranceOptions in @/shared/api/pricingParameters.

export const LB_DEPRECIATION_METHOD_OPTIONS = [
  { value: 'Period', label: 'Period' },
  { value: 'Gross', label: 'Gross' },
];
