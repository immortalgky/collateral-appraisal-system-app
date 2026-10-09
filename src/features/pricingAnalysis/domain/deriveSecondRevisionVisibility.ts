/**
 * Which halves of the "2nd Revision" block a group should show.
 *
 * Deliberately separate from deriveGroupCollateralType: that one collapses the group to a
 * single code by priority (U > LSU > LB > LS > L > LSL > first) and is also what filters the
 * market surveys in MethodSectionRenderer. Asking it "does this group have land?" gives the
 * wrong answer twice — an L-only group resolves to L and was shown nothing, and a group holding
 * both LB and U resolves to U and lost its land rows. Here every property is inspected instead.
 */
/** Matches the code half of appraisal/utils/areaFormat.ts's LAND_TYPES — the set that already
 *  decides a property is measured in sq.wa, which is the unit of the land row here. */
const LAND_TYPES = new Set(['L', 'LB', 'LS', 'LSL']);
/** Wider on purpose than appraisal/utils/propertyTypeConfig.ts's BUILDING_TYPE_CODES, which omits
 *  U/LSU because a condo unit has no building *detail* record. The building row here is driven by
 *  usable area (sq.m), and a condo unit has that — so units belong in this set. */
const BUILDING_TYPES = new Set(['B', 'LB', 'LS', 'U', 'LSU', 'LSB']);

export function deriveSecondRevisionVisibility(
  properties: Array<{ propertyType?: string | null }>,
): { showLand: boolean; showBuilding: boolean } {
  const types = properties.map(p => p.propertyType ?? '');

  return {
    showLand: types.some(type => LAND_TYPES.has(type)),
    showBuilding: types.some(type => BUILDING_TYPES.has(type)),
  };
}
