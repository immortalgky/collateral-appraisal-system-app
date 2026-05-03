import type { ListBoxItem } from '@/shared/components/inputs/Dropdown';
import type { ProjectType } from '../types';

// ─── Project Type Discriminator Labels ───────────────────────────────────────

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  Condo: 'Condo',
  LandAndBuilding: 'Land & Building',
};

// =============================================================================
// Shared options (no matching parameter group on the BE — keep local)
// =============================================================================

export const LOCATION_METHOD_OPTIONS = [
  { value: 'AdjustPriceSqm', label: 'Adjust Price (Baht/sq.m.)' },
  { value: 'AdjustPricePercentage', label: 'Adjust Price (%)' },
  { value: 'Lumpsum', label: 'Lumpsum (flat Baht)' },
];

// =============================================================================
// Condo-specific options (no matching parameter group)
// =============================================================================

// TODO: parameterize — values must stay in sync with backend
// GetProjectPricingAssumptionsQueryHandler.CoverageByCondition lookup.
export const CONDO_FIRE_INSURANCE_CONDITION_OPTIONS: ListBoxItem[] = [
  { id: 'LessThan8Floors', value: 'LessThan8Floors', label: 'Condo height < 8 floors' },
  { id: 'GreaterThan8Floors', value: 'GreaterThan8Floors', label: 'Condo height > 8 floors' },
  {
    id: 'LessThan8FloorsWithMezzanine',
    value: 'LessThan8FloorsWithMezzanine',
    label: 'Condo height < 8 floors and with mezzanine floor',
  },
  {
    id: 'GreaterThan8FloorsWithMezzanine',
    value: 'GreaterThan8FloorsWithMezzanine',
    label: 'Condo height > 8 floors and with mezzanine floor',
  },
];

export const CONDO_FIRE_INSURANCE_CONDITION_LABEL_BY_VALUE: Record<string, string> =
  Object.fromEntries(
    CONDO_FIRE_INSURANCE_CONDITION_OPTIONS.map((o) => [o.value, o.label]),
  );

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

export const LB_FIRE_INSURANCE_OPTIONS = [
  { value: 'WithInsurance', label: 'With insurance' },
  { value: 'WithoutInsurance', label: 'Without insurance' },
  { value: 'Unknown', label: 'Unknown' },
];

export const LB_FIRE_INSURANCE_LABEL_BY_VALUE: Record<string, string> =
  Object.fromEntries(LB_FIRE_INSURANCE_OPTIONS.map((o) => [o.value, o.label]));

export const LB_DEPRECIATION_METHOD_OPTIONS = [
  { value: 'Period', label: 'Period' },
  { value: 'Gross', label: 'Gross' },
];
