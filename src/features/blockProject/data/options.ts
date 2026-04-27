import type { CheckboxOption } from '@/shared/components/inputs/CheckboxGroup';
import type { RadioOption } from '@/shared/components/inputs/RadioGroup';
import type { ListBoxItem } from '@/shared/components/inputs/Dropdown';

/** LB facility option — uses `key` instead of `value` for historical reasons.
 * TODO(Phase 2): Normalize to CheckboxOption ({value, label}) when migrating village facility form. */
export interface LbFacilityOption {
  key: string;
  label: string;
}

// =============================================================================
// Shared options (used by both Condo and LandAndBuilding)
// =============================================================================

export const FLOOR_MATERIAL_OPTIONS: RadioOption[] = [
  { value: 'PolishedConcrete', label: 'Polished concrete' },
  { value: 'GlazedTiles', label: 'Glazed tiles' },
  { value: 'Parquet', label: 'Parquet' },
  { value: 'Marble', label: 'Marble' },
  { value: 'Granite', label: 'Granite' },
  { value: 'Laminate', label: 'Laminate' },
  { value: 'RubberTiles', label: 'Rubber tiles' },
  { value: 'Other', label: 'Other' },
];

export const DECORATION_OPTIONS: RadioOption[] = [
  { value: 'ReadyToMoveIn', label: 'Ready to move in' },
  { value: 'Partially', label: 'Partially' },
  { value: 'None', label: 'None' },
  { value: 'Other', label: 'Other' },
];

export const ROAD_SURFACE_OPTIONS: RadioOption[] = [
  { value: 'Concrete', label: 'Concrete' },
  { value: 'Asphalt', label: 'Asphalt' },
  { value: 'GravelCrushedStone', label: 'Gravel/crushed stone' },
  { value: 'Soil', label: 'Soil' },
  { value: 'Other', label: 'Other' },
];

export const QUALITY_OPTIONS: RadioOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Good', label: 'Good' },
  { value: 'VeryGood', label: 'Very Good' },
];

export const DOCUMENT_VALIDATION_OPTIONS: RadioOption[] = [
  { value: 'CorrectlyMatched', label: 'Correctly Matched' },
  { value: 'NotConsistent', label: 'Not Consistent' },
];

export const UTILITY_OPTIONS: CheckboxOption[] = [
  { value: 'PermanentElectricity', label: 'Permanent Electricity' },
  { value: 'TapWater', label: 'Tap Water / Groundwater' },
  { value: 'StreetElectricity', label: 'Street Electricity' },
  { value: 'DrainagePipe', label: 'Drainage Pipe / Manhole' },
  { value: 'Other', label: 'Other' },
];

export const LOCATION_METHOD_OPTIONS: RadioOption[] = [
  { value: 'AdjustPriceSqm', label: 'Adjust Price (Baht/sq.m.)' },
  { value: 'AdjustPricePercentage', label: 'Adjust Price (%)' },
];

// =============================================================================
// Condo-specific options (prefixed CONDO_)
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

export const CONDO_ROOF_OPTIONS: CheckboxOption[] = [
  { value: 'ReinforcedConcrete', label: 'Reinforced Concrete' },
  { value: 'Tiles', label: 'Tiles' },
  { value: 'CorrugatedTiles', label: 'Corrugated Tiles' },
  { value: 'Duplex', label: 'Duplex' },
  { value: 'MetalSheet', label: 'Metal sheet' },
  { value: 'Vinyl', label: 'Vinyl' },
  { value: 'TerracottaTiles', label: 'Terracotta Tiles' },
  { value: 'Zinc', label: 'Zinc' },
  { value: 'UnableToVerify', label: 'Unable to verify' },
  { value: 'Other', label: 'Other' },
];

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

export const CONDO_FACILITY_OPTIONS: CheckboxOption[] = [
  { value: 'PassengerElevator', label: 'Passenger Elevator' },
  { value: 'Hallway', label: 'Hallway' },
  { value: 'Parking', label: 'Parking' },
  { value: 'FireEscape', label: 'Fire Escape' },
  { value: 'FireExtinguishingSystem', label: 'Fire Extinguishing System' },
  { value: 'SwimmingPool', label: 'Swimming Pool' },
  { value: 'FitnessRoom', label: 'Fitness Room' },
  { value: 'Garden', label: 'Garden' },
  { value: 'OutdoorStadium', label: 'Outdoor Stadium' },
  { value: 'Club', label: 'Club' },
  { value: 'SteamRoom', label: 'Steam Room' },
  { value: 'SecurityRoom', label: 'Security Room' },
  { value: 'KeyCardSystem', label: 'Key Card System' },
  { value: 'LegalEntity', label: 'Legal Entity' },
  { value: 'Kindergarten', label: 'Kindergarten' },
  { value: 'GarbageDisposalPoint', label: 'Garbage Disposal Point' },
  { value: 'WasteDisposalSystem', label: 'Waste Disposal System' },
  { value: 'Other', label: 'Other' },
];

export const CONDO_ROOM_LAYOUT_OPTIONS: RadioOption[] = [
  { value: 'Studio', label: 'Studio' },
  { value: '1Bedroom', label: '1 Bedroom' },
  { value: '2Bedroom', label: '2 Bedroom' },
  { value: 'Duplex', label: 'Duplex' },
  { value: 'Penthouse', label: 'Penthouse' },
  { value: 'Other', label: 'Other' },
];

export const CONDO_TOWER_CONDITION_OPTIONS: RadioOption[] = [
  { value: 'New', label: 'New' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Old', label: 'Old' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Dilapidated', label: 'Dilapidated' },
];

// =============================================================================
// LandAndBuilding-specific options (prefixed LB_)
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

export const LB_FACILITY_OPTIONS: LbFacilityOption[] = [
  { key: 'ClubHouse', label: 'Club House' },
  { key: 'Garden', label: 'Garden / Park' },
  { key: 'SwimmingPool', label: 'Swimming Pool' },
  { key: 'FitnessRoom', label: 'Fitness Room' },
  { key: 'Playground', label: 'Playground' },
  { key: 'SecurityRoom', label: 'Security Room' },
  { key: 'KeyCardSystem', label: 'Key Card System' },
  { key: 'CCTV', label: 'CCTV' },
  { key: 'GarbageDisposalPoint', label: 'Garbage Disposal Point' },
  { key: 'WasteDisposalSystem', label: 'Waste Disposal System' },
  { key: 'Parking', label: 'Parking' },
  { key: 'Other', label: 'Other' },
];

export const LB_BUILDING_TYPE_OPTIONS = [
  { value: 'DetachedHouse', label: 'Detached House' },
  { value: 'TownHouse', label: 'Town House' },
  { value: 'TwinHouse', label: 'Twin House' },
  { value: 'ShopHouse', label: 'Shop House' },
  { value: 'Other', label: 'Other' },
];

export const LB_DECORATION_TYPE_OPTIONS = [
  { value: 'FullyFurnished', label: 'Fully Furnished' },
  { value: 'PartlyFurnished', label: 'Partly Furnished' },
  { value: 'Unfurnished', label: 'Unfurnished' },
  { value: 'Other', label: 'Other' },
];

export const LB_BUILDING_MATERIAL_TYPE_OPTIONS = [
  { value: 'ReinforcedConcrete', label: 'Reinforced Concrete' },
  { value: 'Masonry', label: 'Masonry' },
  { value: 'Steel', label: 'Steel' },
  { value: 'Wood', label: 'Wood' },
  { value: 'Other', label: 'Other' },
];

export const LB_BUILDING_STYLE_TYPE_OPTIONS = [
  { value: 'Modern', label: 'Modern' },
  { value: 'Contemporary', label: 'Contemporary' },
  { value: 'Traditional', label: 'Traditional' },
  { value: 'Colonial', label: 'Colonial' },
  { value: 'Other', label: 'Other' },
];

export const LB_CONSTRUCTION_STYLE_TYPE_OPTIONS = [
  { value: 'StandardConstruction', label: 'Standard Construction' },
  { value: 'SteelFrame', label: 'Steel Frame' },
  { value: 'PrecastConcrete', label: 'Precast Concrete' },
  { value: 'Other', label: 'Other' },
];

export const LB_STRUCTURE_TYPE_OPTIONS = [
  { value: 'ReinforcedConcreteFrame', label: 'Reinforced Concrete Frame' },
  { value: 'SteelFrame', label: 'Steel Frame' },
  { value: 'Masonry', label: 'Masonry' },
  { value: 'TimberFrame', label: 'Timber Frame' },
  { value: 'Other', label: 'Other' },
];

export const LB_ROOF_FRAME_TYPE_OPTIONS = [
  { value: 'WoodFrame', label: 'Wood Frame' },
  { value: 'SteelFrame', label: 'Steel Frame' },
  { value: 'ReinforcedConcrete', label: 'Reinforced Concrete' },
  { value: 'Other', label: 'Other' },
];

export const LB_ROOF_TYPE_OPTIONS = [
  { value: 'ReinforcedConcrete', label: 'Reinforced Concrete' },
  { value: 'Tiles', label: 'Tiles' },
  { value: 'CorrugatedTiles', label: 'Corrugated Tiles' },
  { value: 'MetalSheet', label: 'Metal Sheet' },
  { value: 'TerracottaTiles', label: 'Terracotta Tiles' },
  { value: 'Zinc', label: 'Zinc' },
  { value: 'Other', label: 'Other' },
];

export const LB_CEILING_TYPE_OPTIONS = [
  { value: 'Plaster', label: 'Plaster' },
  { value: 'Gypsum', label: 'Gypsum' },
  { value: 'WoodPanel', label: 'Wood Panel' },
  { value: 'Exposed', label: 'Exposed Concrete' },
  { value: 'Other', label: 'Other' },
];

export const LB_WALL_TYPE_OPTIONS = [
  { value: 'Masonry', label: 'Masonry / Brick' },
  { value: 'ReinforcedConcrete', label: 'Reinforced Concrete' },
  { value: 'Plaster', label: 'Plaster' },
  { value: 'Tile', label: 'Tile' },
  { value: 'Paint', label: 'Paint' },
  { value: 'Other', label: 'Other' },
];

export const LB_FENCE_TYPE_OPTIONS = [
  { value: 'BrickMasonry', label: 'Brick / Masonry' },
  { value: 'Concrete', label: 'Concrete' },
  { value: 'IronFence', label: 'Iron Fence' },
  { value: 'WoodFence', label: 'Wood Fence' },
  { value: 'NoFence', label: 'No Fence' },
  { value: 'Other', label: 'Other' },
];

export const LB_CONSTRUCTION_TYPE_OPTIONS = [
  { value: 'NewConstruction', label: 'New Construction' },
  { value: 'Renovation', label: 'Renovation' },
  { value: 'Extension', label: 'Extension' },
  { value: 'Other', label: 'Other' },
];

export const LB_UTILIZATION_TYPE_OPTIONS = [
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'MixedUse', label: 'Mixed Use' },
  { value: 'Other', label: 'Other' },
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

export const LB_LAND_TYPE_OPTIONS: ListBoxItem[] = [
  { id: 'NS3K', value: 'NS3K', label: 'นส.3ก' },
  { id: 'NS3', value: 'NS3', label: 'นส.3' },
  { id: 'Chanote', value: 'Chanote', label: 'โฉนด' },
  { id: 'SorKorNung', value: 'SorKorNung', label: 'สก.1' },
  { id: 'Other', value: 'Other', label: 'Other' },
];

export const LB_TITLE_TYPE_OPTIONS: ListBoxItem[] = [
  { id: 'Chanote', value: 'Chanote', label: 'Chanote (โฉนด)' },
  { id: 'NS3K', value: 'NS3K', label: 'นส.3ก' },
  { id: 'NS3', value: 'NS3', label: 'นส.3' },
  { id: 'Other', value: 'Other', label: 'Other' },
];

export const LB_DEPRECIATION_METHOD_OPTIONS = [
  { value: 'Period', label: 'Period' },
  { value: 'Gross', label: 'Gross' },
];
