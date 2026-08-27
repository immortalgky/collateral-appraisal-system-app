/**
 * Pure derivations over a `MeetingDetailDto`.
 *
 * Kept out of the components so the progress ring, KPI strip, value bar and item tables all
 * agree on the same numbers — previously each place counted rows for itself.
 *
 * Value handling rule: `appraisedValue` may be `null` (never valued) or `0` (zeroed by an
 * unverified decision-summary save). These are different facts. Sums therefore skip `null`
 * entirely and report how many items were skipped, so the UI can qualify a total rather than
 * silently understating it.
 */
import type { ItemDecision, MeetingDetailDto, MeetingItemDto } from '../api/types';

export interface ValueTotal {
  /** Sum over items that actually have a value. */
  total: number;
  /** How many items contributed. */
  counted: number;
  /** How many items were skipped because their value is unknown (null). */
  unknown: number;
}

export interface MeetingStats {
  decisionItems: MeetingItemDto[];
  ackItems: MeetingItemDto[];
  totalDecision: number;
  totalAck: number;
  totalItems: number;
  /** Decision-item counts keyed by decision state. Always has all three keys. */
  decisionCounts: Record<ItemDecision, number>;
  /** Released / total decision items, 0–1. `0` when there are no decision items. */
  progress: number;
  appraisedValue: ValueTotal;
  /**
   * Appraised value per group, ordered by descending value. Covers BOTH decision groups
   * (keyed by appraisal type) and acknowledgement groups (keyed by the raw '1'/'2' wire value),
   * so the distribution bar totals the same figure as the headline value tile. `kind` tells the
   * caller which label/colour map to use, since the two key spaces are unrelated.
   */
  valueByGroup: {
    group: string;
    kind: 'decision' | 'acknowledgement';
    value: number;
    count: number;
  }[];
  /** First decision item still awaiting a decision — the "now deciding" candidate. */
  firstPendingItem: MeetingItemDto | null;
  /** True once every decision item has been released. Mirrors the backend's auto-end rule. */
  allDecisionsReleased: boolean;
}

const sumValues = (
  items: MeetingItemDto[],
  pick: (i: MeetingItemDto) => number | null | undefined,
): ValueTotal => {
  let total = 0;
  let counted = 0;
  let unknown = 0;

  for (const item of items) {
    const value = pick(item);
    if (value == null || !Number.isFinite(value)) {
      unknown += 1;
      continue;
    }
    total += value;
    counted += 1;
  }

  return { total, counted, unknown };
};

export const flattenGroups = (
  groups: { group: string; items: MeetingItemDto[] }[],
): MeetingItemDto[] => groups.flatMap(g => g.items);

export const computeMeetingStats = (meeting: MeetingDetailDto): MeetingStats => {
  const decisionGroups = meeting.items.decisionItems;
  const decisionItems = flattenGroups(decisionGroups);
  const ackItems = flattenGroups(meeting.items.acknowledgementItems);
  const allItems = [...decisionItems, ...ackItems];

  const decisionCounts: Record<ItemDecision, number> = {
    Pending: 0,
    Released: 0,
    RoutedBack: 0,
  };
  for (const item of decisionItems) {
    // Guard against an unexpected decision value from a newer backend rather than
    // incrementing `undefined` into NaN.
    if (item.itemDecision in decisionCounts) decisionCounts[item.itemDecision] += 1;
  }

  const toValueGroup =
    (kind: 'decision' | 'acknowledgement') => (g: { group: string; items: MeetingItemDto[] }) => ({
      group: g.group,
      kind,
      value: sumValues(g.items, i => i.appraisedValue).total,
      count: g.items.length,
    });

  const valueByGroup = [
    ...decisionGroups.map(toValueGroup('decision')),
    ...meeting.items.acknowledgementItems.map(toValueGroup('acknowledgement')),
  ]
    .filter(g => g.count > 0)
    .sort((a, b) => b.value - a.value);

  return {
    decisionItems,
    ackItems,
    totalDecision: decisionItems.length,
    totalAck: ackItems.length,
    totalItems: allItems.length,
    decisionCounts,
    progress: decisionItems.length > 0 ? decisionCounts.Released / decisionItems.length : 0,
    appraisedValue: sumValues(allItems, i => i.appraisedValue),
    valueByGroup,
    firstPendingItem: decisionItems.find(i => i.itemDecision === 'Pending') ?? null,
    allDecisionsReleased:
      decisionItems.length > 0 && decisionCounts.Released === decisionItems.length,
  };
};
