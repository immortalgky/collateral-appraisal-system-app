import type { ProjectUnitPrice } from '../types';
import { differsFromStored } from './recomputeUnitPrice';

/** What "Save and recalculate" did to the stored prices: the unit rows before it against those refetched after it. */
export interface RecalcSummary {
  /** Units whose stored figures differ now (a unit that had no row before counts as changed). */
  changed: number;
  units: number;
  /** Total appraisal value (rounded), summed over every unit, before and after. */
  valueBefore: number;
  valueAfter: number;
  /** Total forced-sale price, likewise. */
  forceBefore: number;
  forceAfter: number;
}

const sum = (rows: ProjectUnitPrice[], pick: (r: ProjectUnitPrice) => number | null | undefined) =>
  rows.reduce((s, r) => s + (pick(r) ?? 0), 0);

export function summarizeRecalc(
  before: ProjectUnitPrice[],
  after: ProjectUnitPrice[],
): RecalcSummary {
  const was = new Map(before.map(b => [b.projectUnitId, b]));
  const changed = after.reduce((n, row) => {
    const base = was.get(row.projectUnitId);
    return !base || differsFromStored([row], [base]) ? n + 1 : n;
  }, 0);
  return {
    changed,
    units: after.length,
    valueBefore: sum(before, r => r.totalAppraisalValueRounded),
    valueAfter: sum(after, r => r.totalAppraisalValueRounded),
    forceBefore: sum(before, r => r.forceSellingPrice),
    forceAfter: sum(after, r => r.forceSellingPrice),
  };
}
