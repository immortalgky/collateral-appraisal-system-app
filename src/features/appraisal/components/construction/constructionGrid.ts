import { formatNumber } from '@shared/utils/formatUtils';

/** Shared by the construction inspection grid (detail and summary modes) and the tab's toolbar. */

export interface ComputedItem {
  _index: number;
  /** Stable identity of the row (useFieldArray id); `_index` shifts when rows are added or removed. */
  _key: string;
  constructionWorkGroupId: string;
  constructionWorkItemId?: string | null;
  workItemName: string;
  proportionPct: number;
  constructionValue: number;
  previousProgressPct: number;
  currentProgressPct: number;
  currentProportionPct: number;
  previousPropertyValue: number;
  currentPropertyValue: number;
}

export interface WorkTotals {
  constructionValue: number;
  proportion: number;
  /** Σ proportion × progress / 100 — how much of the whole building is done (the server's figure). */
  previousShare: number;
  currentShare: number;
  /**
   * Progress of the listed work, weighted by proportion: Σ(proportion × progress) / Σ proportion.
   * Reads 100 for a job finished on every item even when the proportions only add up to 80; the
   * share above would read 80. The two agree once the split reaches 100%.
   */
  previousProgress: number;
  currentProgress: number;
  previousValue: number;
  currentValue: number;
}

/** What a grid row prints, whether it is one work item or a total. */
export type RowFigures = Pick<
  WorkTotals,
  | 'constructionValue'
  | 'previousProgress'
  | 'currentProgress'
  | 'currentShare'
  | 'previousValue'
  | 'currentValue'
>;

/** Weighted by proportion, not a plain average: 40% done at 100 plus 10% at 0 is 80, not 50. */
export function sumWork(items: ComputedItem[]): WorkTotals {
  const sum = (f: (i: ComputedItem) => number) => items.reduce((s, i) => s + f(i), 0);
  const proportion = sum(i => i.proportionPct);
  const weighted = (f: (i: ComputedItem) => number) =>
    proportion > 0 ? sum(i => i.proportionPct * f(i)) / proportion : 0;
  return {
    constructionValue: sum(i => i.constructionValue),
    proportion,
    previousShare: sum(i => (i.proportionPct * i.previousProgressPct) / 100),
    currentShare: sum(i => i.currentProportionPct),
    previousProgress: weighted(i => i.previousProgressPct),
    currentProgress: weighted(i => i.currentProgressPct),
    previousValue: sum(i => i.previousPropertyValue),
    currentValue: sum(i => i.currentPropertyValue),
  };
}

// Pixel values on purpose: the app's root font-size is 13px, so rem utilities (text-xs, px-2)
// render smaller than the pricing grids this table matches.
export const TH =
  'px-[8px] py-[5px] leading-[14px] align-top whitespace-nowrap bg-[#f8fafa] font-medium text-[#55636f] border-b border-b-[#e3e9e8] border-r border-r-[#eef2f2]';
/** A cell's rules without its padding, for cells that set their own (p-0 would lose to px-[8px]). */
export const CELL =
  'py-0 whitespace-nowrap border-b border-b-[#eef2f2] border-r border-r-[#eef2f2]';
export const TD = `px-[8px] ${CELL}`;
// The frozen column draws its own edge: `pa-sticky-edge` only has a rule inside the pricing
// screen's ScrollableTableContainer, which this table does not use.
export const NAME =
  'sticky left-0 z-10 w-[220px] min-w-[220px] max-w-[220px] overflow-hidden text-ellipsis shadow-[1px_0_0_#e3e9e8]';
export const RO = 'text-[#8a96a0] bg-[#f8fafa]';
export const INPUT_TD = `px-[3px] ${CELL}`;
export const REGRESSED = 'border-[#dc2626]! bg-[#fef2f2]! text-[#dc2626]!';

export const pct = (n: number) => formatNumber(n, 2);
export const baht = (n: number) => formatNumber(n, 0);

/*
 * A new round starts every carried-over row at 0, and the data cannot tell that untouched 0 from one
 * the inspector typed (it would take the server storing null for "not entered"). So a 0 against a
 * previous figure is never flagged as a drop: while editing it reads "not entered yet — saves as
 * 0%"; read-only (`final`) prints the change in neutral grey. Read-only is not "round finished" —
 * a viewer without edit rights sees an open round too — so it must not raise an alarm either.
 */

/** This round is below the previous one, and has a figure of its own. */
export const isRegressedProgress = (previous: number, current: number, showPrevious: boolean) =>
  showPrevious && current > 0 && current < previous;

/** Carried over with progress but still at 0 this round, while editing — saved as is, it reads 0%. */
export const isPendingProgress = (
  previous: number,
  current: number,
  showPrevious: boolean,
  final = false,
) => showPrevious && previous > 0 && current === 0 && !final;

interface ConstructionFormValues {
  constructionSubItems?: unknown[] | null;
  constructionSummary?: {
    summaryDetail?: string | null;
    summaryCurrentProgressPct?: number | null;
    summaryPreviousProgressPct?: number | null;
    documentId?: string | null;
  } | null;
  constructionRemark?: string | null;
}

/** Anything recorded for the inspection — what saving as "not under construction" would delete. */
export const hasConstructionData = (v: ConstructionFormValues) =>
  (v.constructionSubItems?.length ?? 0) > 0 ||
  !!v.constructionSummary?.summaryDetail ||
  !!v.constructionSummary?.summaryCurrentProgressPct ||
  !!v.constructionSummary?.summaryPreviousProgressPct ||
  !!v.constructionSummary?.documentId ||
  !!String(v.constructionRemark ?? '').trim();
