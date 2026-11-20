/**
 * Fields that read as one measurement and are drawn as ONE Compact row: one label, the controls
 * side by side. Standard is unchanged (its 12-column spans already put them on one row).
 *
 * A group joins only where its fields sit next to each other, in any order, in one field list, and
 * none of them has a `showWhen` / `hideWhen` (a joined row cannot half-hide). The controls are drawn
 * in the order declared here. Anywhere else the fields stay separate pairs, so no form has to change.
 *
 * Each control keeps its own unit inside its box. `separator`: drawn between the controls and in the
 * label ("width × length × height"); without one the label joins with " / ".
 */
export interface CompactPair {
  names: string[];
  separator?: string;
}

export const COMPACT_PAIRS: CompactPair[] = [
  { names: ['latitude', 'longitude'] },
  { names: ['soi', 'distanceFromMainRoad'] },
  { names: ['numberOfFloors', 'totalBuildingArea'] },
  { names: ['width', 'length', 'height'], separator: '×' },
  // The road: widths and lanes, and what the plot faces it with.
  { names: ['carriagewayWidth', 'rightOfWayWidth', 'numberOfLanes'] },
  { names: ['numberOfSidesFacingRoad', 'roadFrontage'] },
];

type Joinable = { name: string; showWhen?: unknown; hideWhen?: unknown };

/**
 * The groups of `fields` to join, keyed by the name of the group's first field in the list; `fields`
 * of a group are in the declared order.
 */
export function compactJoins<T extends Joinable>(
  fields: T[],
): Map<string, { fields: T[]; separator?: string }> {
  const joins = new Map<string, { fields: T[]; separator?: string }>();
  fields.forEach((f, i) => {
    for (const { names, separator } of COMPACT_PAIRS) {
      const run = fields.slice(i, i + names.length);
      if (
        run.length === names.length &&
        names.every(n => run.some(r => r.name === n)) &&
        run.every(r => !r.showWhen && !r.hideWhen)
      )
        joins.set(f.name, {
          fields: names.map(n => run.find(r => r.name === n)!),
          separator,
        });
    }
  });
  return joins;
}

/**
 * Fields that always take a whole Compact row, whatever span the form gives them: the ones after
 * them then pair up from the start of the next row (the road in front of the land, then the
 * carriageway and right-of-way widths side by side; the lease contract number, then lessor | lessee).
 * Standard is unchanged.
 */
export const COMPACT_FULL_ROW = new Set(['roadPassInFrontOfLand', 'contractNo']);
