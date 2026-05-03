/**
 * flattenPricingContext — collapses the three-level pricing context
 * (Project + Tower + Model) into a single flat Record that the subject
 * column of scoring forms can index by factor.fieldName.
 *
 * Canonical flat keys (source-of-truth — must match MarketComparableFactor.FieldName seeds):
 *
 * Project-level (always from context.project):
 *   latitude, longitude, province, district, subDistrict, road,
 *   developer, projectName, landOffice, projectLandAreaSquareWa
 *
 * Building-level (disjoint by ProjectType — no prefix needed):
 *   For Condo  → sourced from context.tower  (null for Village)
 *   For Village→ sourced from context.model  (null for Condo)
 *   constructionYear, numberOfFloors, decorationType, roofType,
 *   structureType, roadWidth, distance, rightOfWay, roadSurfaceType
 *
 * Model-level (always from context.model, both types):
 *   modelName, usableAreaMin, usableAreaMax, standardUsableArea,
 *   hasMezzanine, roomLayoutType, fireInsuranceCondition,
 *   groundFloorMaterialType, upperFloorMaterialType, bathroomFloorMaterialType,
 *   buildingAge (LB only), utilizationType (LB only),
 *   startingPriceMin, startingPriceMax,
 *   landAreaSquareWa (LB per-model plot — distinct from projectLandAreaSquareWa)
 */

export type FlatContext = Record<string, string | number | boolean | null>;

export interface ProjectContextDto {
  projectName?: string | null;
  developer?: string | null;
  landOffice?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  province?: string | null;
  district?: string | null;
  subDistrict?: string | null;
  road?: string | null;
  /** Project-total land area in wa (camelCase matches C# ProjectLandAreaSquareWa serialization). */
  projectLandAreaSquareWa?: number | null;
}

export interface TowerContextDto {
  buildingAge?: number | null;
  numberOfFloors?: number | null;
  decorationType?: string[] | string | null;
  roofType?: string[] | string | null;
  structureType?: string[] | string | null;
  roadWidth?: number | null;
  distance?: number | null;
  rightOfWay?: number | null;
  roadSurfaceType?: string | null;
}

export interface ModelContextDto {
  modelName?: string | null;
  usableAreaMin?: number | null;
  usableAreaMax?: number | null;
  standardUsableArea?: number | null;
  hasMezzanine?: boolean | null;
  /** May arrive as a string[] from the backend on the LB model side. */
  roomLayoutType?: string[] | string | null;
  fireInsuranceCondition?: string | null;
  groundFloorMaterialType?: string | null;
  upperFloorMaterialType?: string | null;
  bathroomFloorMaterialType?: string | null;
  // LB-only on model side
  buildingAge?: number | null;
  utilizationType?: string | null;
  startingPriceMin?: number | null;
  startingPriceMax?: number | null;
  /**
   * Representative per-model plot land area in sq.wa for pricing (LB only).
   * Sourced from `ProjectModel.standardLandArea` on the BE — NOT the literal
   * min/max range. Key name preserved for factor-seed compatibility.
   */
  landAreaSquareWa?: number | null;
  // Building-level fields for Village (null for Condo — backend sets these)
  constructionYear?: number | null;
  numberOfFloors?: number | null;
  decorationType?: string[] | string | null;
  roofType?: string[] | string | null;
  structureType?: string[] | string | null;
  roadWidth?: number | null;
  distance?: number | null;
  rightOfWay?: number | null;
  roadSurfaceType?: string | null;
}

export interface ProjectModelPricingContextDto {
  project: ProjectContextDto;
  /** Populated for Condo; null for Village. */
  tower: TowerContextDto | null;
  model: ModelContextDto;
}

/**
 * Normalise a value that may arrive as a string array (e.g. multi-select fields
 * serialised as List<string> in C#) to a single display string suitable for the
 * flat context.  Array items are comma-joined.
 *
 * Keeps the FlatContext value type as `string | number | boolean | null`.
 */
function toDisplayString(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length === 0 ? null : (v as string[]).join(', ');
  return String(v);
}

/**
 * Flatten the three-level context into a single Record<string, value>.
 *
 * Building-level fields (constructionYear etc.) are always un-prefixed.
 * For Condo they come from tower; for Village from model.
 * Backend guarantees the unused side is null — we just pick the non-null one.
 */
export function flattenPricingContext(context: ProjectModelPricingContextDto): FlatContext {
  const { project, tower, model } = context;

  // Building-level: prefer tower (Condo), fall back to model (Village).
  // For any given appraisal exactly one side will be non-null per §5 of the plan.
  const buildingSource = tower ?? model;

  const flat: FlatContext = {
    // ── Project ──────────────────────────────────────────────────────────
    projectName: project.projectName ?? null,
    developer: project.developer ?? null,
    landOffice: project.landOffice ?? null,
    latitude: project.latitude ?? null,
    longitude: project.longitude ?? null,
    province: project.province ?? null,
    district: project.district ?? null,
    subDistrict: project.subDistrict ?? null,
    road: project.road ?? null,
    // Blocker 1 fix: read from the correct field (projectLandAreaSquareWa, not landAreaSquareWa)
    projectLandAreaSquareWa: project.projectLandAreaSquareWa ?? null,

    // ── Building (tower for Condo, model for Village) ─────────────────
    constructionYear: model.constructionYear ?? null,
    buildingAge: tower?.buildingAge ?? model.buildingAge ?? null,
    numberOfFloors: buildingSource?.numberOfFloors ?? null,
    // Blocker 3 fix: normalise potential arrays to comma-joined strings
    decorationType: toDisplayString(buildingSource?.decorationType),
    roofType: toDisplayString(buildingSource?.roofType),
    structureType: toDisplayString(buildingSource?.structureType),
    roadWidth: buildingSource?.roadWidth ?? null,
    distance: buildingSource?.distance ?? null,
    rightOfWay: buildingSource?.rightOfWay ?? null,
    roadSurfaceType: buildingSource?.roadSurfaceType ?? null,

    // ── Model ─────────────────────────────────────────────────────────
    modelName: model.modelName ?? null,
    usableAreaMin: model.usableAreaMin ?? null,
    usableAreaMax: model.usableAreaMax ?? null,
    standardUsableArea: model.standardUsableArea ?? null,
    hasMezzanine: model.hasMezzanine ?? null,
    roomLayoutType: toDisplayString(model.roomLayoutType),
    fireInsuranceCondition: model.fireInsuranceCondition ?? null,
    groundFloorMaterialType: model.groundFloorMaterialType ?? null,
    upperFloorMaterialType: model.upperFloorMaterialType ?? null,
    bathroomFloorMaterialType: model.bathroomFloorMaterialType ?? null,
    utilizationType: model.utilizationType ?? null,
    startingPriceMin: model.startingPriceMin ?? null,
    startingPriceMax: model.startingPriceMax ?? null,
    landAreaSquareWa: model.landAreaSquareWa ?? null,
  };

  return flat;
}

/**
 * Resolve a factor's subject value from the flat context.
 *
 * Returns null when:
 *   - fieldName is null/undefined/empty string (legacy factor — no derivation configured)
 *   - the key is present but the value is null/undefined
 *
 * Callers should treat a null return as "fall back to editable input".
 */
export function resolveFactorValue(
  flat: FlatContext | undefined,
  fieldName: string | null | undefined,
): string | number | boolean | null {
  if (!fieldName || !flat) return null;
  const value = flat[fieldName];
  return value !== undefined ? value : null;
}
