import { typeToBase } from '@features/appraisal/utils/propertyTypeConfig';
import type { Method, MethodRole } from '../types/selection';

/** The Cost approach's non-`LandAndBuilding` roles — what a group can require a method to cover. */
export type RequiredComponent = Exclude<MethodRole, 'LandAndBuilding'>;
const REQUIRED_ORDER: RequiredComponent[] = ['Land', 'Building', 'Machinery'];

/**
 * Required components come from the properties in the group, not a stored group type — there
 * isn't one in the data model (mock:3146, "มาจากทรัพย์ในกลุ่ม"). Land/building/land-and-building
 * property types require the matching component; machinery (`MAC`) requires Machinery. Condo
 * properties require nothing — their Cost methods (WQS/SAG/DC/LH/PR) already price the whole
 * unit, same as mock GTYPES.U (`need: []`). Vehicle/vessel properties (`typeToBase` = 'other',
 * same bucket as MAC) have no Cost-approach method of their own to require — they are
 * deliberately left out rather than folded into the Machinery requirement.
 *
 * Shared by PricingAnalysisCostFormulaRow (the formula chain) and PricingAnalysisMethodBoardRow
 * (the role `<select>`'s gate/options) — a second copy of this derivation is how the two would
 * drift.
 */
export function requiredComponents(
  properties: { propertyType?: string | null }[],
): RequiredComponent[] {
  const found = new Set<RequiredComponent>();
  properties.forEach(p => {
    const base = typeToBase[p.propertyType ?? ''];
    if (base === 'land') found.add('Land');
    else if (base === 'building') found.add('Building');
    else if (base === 'landBuilding') {
      found.add('Land');
      found.add('Building');
    } else if (p.propertyType === 'MAC') found.add('Machinery');
  });
  return REQUIRED_ORDER.filter(c => found.has(c));
}

/** Which required component(s) a role covers. A `LandAndBuilding` method already covers
 *  Building, so pairing it with a separate Building-role method double-counts — mock:3145. */
export const ROLE_COVERS: Record<MethodRole, RequiredComponent[]> = {
  Land: ['Land'],
  Building: ['Building'],
  Machinery: ['Machinery'],
  LandAndBuilding: ['Land', 'Building'],
};

/** What is wrong with a Cost approach's current ticks, if anything. */
export interface CostSelectionIssues {
  /** Required components nobody covers — the approach's total would be short. */
  missing: RequiredComponent[];
  /** Components (required or not) covered by more than one ticked method — counted twice. */
  duplicated: RequiredComponent[];
  /** Ticked methods with no role — they cover nothing checkable, so the total is unknowable. */
  roleless: Method[];
  /** Ticked methods with a role but no value yet. */
  pending: Method[];
}

/**
 * The Cost approach's selection integrity, in one place.
 *
 * Extracted from PricingAnalysisCostFormulaRow so the Save button can gate on exactly what the
 * formula row warns about. Two copies of this arithmetic would be how the banner and the button
 * come to disagree — the user seeing a red warning above a happily enabled Save, or the reverse.
 *
 * Note which of the four are *errors* and which are *unfinished work*: `duplicated` and
 * `roleless` mean any total produced would be WRONG or undefined, while `missing` and `pending`
 * are the normal state of an approach still being filled in. Callers that block on all four
 * would stop an appraiser from saving halfway through.
 */
export function costSelectionIssues(
  methods: Method[],
  required: RequiredComponent[],
): CostSelectionIssues {
  const picks = methods.filter(m => m.isSelected);
  const coverCount = (c: RequiredComponent) =>
    picks.filter(p => p.role && ROLE_COVERS[p.role].includes(c)).length;

  return {
    missing: required.filter(c => coverCount(c) === 0),
    // Every component, not only the required ones: the backend (FindDoubleCountedComponent)
    // rejects any component counted twice — a condo group requires nothing, yet LandAndBuilding
    // + Land ticked together is still a 400. Checking only `required` let Save stay enabled.
    duplicated: REQUIRED_ORDER.filter(c => coverCount(c) > 1),
    // Only where the role picker is shown (the board hides it when the group requires nothing,
    // e.g. a condo group). Blocking there would disable Save with nothing on screen to fix.
    roleless: required.length > 0 ? picks.filter(p => !p.role) : [],
    pending: picks.filter(p => p.role && !(p.appraisalValue > 0)),
  };
}

/** The subset of {@link costSelectionIssues} that must stop a save — see the note there. */
export function blocksSave(issues: CostSelectionIssues): boolean {
  return issues.duplicated.length > 0 || issues.roleless.length > 0;
}

/** Role `<select>` options for a group, filtered to what its composition can actually need —
 *  mock's `GT().roles` (mock:3286/3296/3303), derived here from `requiredComponents` instead of
 *  a stored group type. Order follows the mock's `ROLE_TH` iteration (land, building, machinery,
 *  land+building). */
const ROLE_ORDER: MethodRole[] = ['Land', 'Building', 'Machinery', 'LandAndBuilding'];

export function availableRoles(required: RequiredComponent[]): MethodRole[] {
  const has = (c: RequiredComponent) => required.includes(c);
  return ROLE_ORDER.filter(role =>
    role === 'LandAndBuilding' ? has('Land') && has('Building') : has(role as RequiredComponent),
  );
}
