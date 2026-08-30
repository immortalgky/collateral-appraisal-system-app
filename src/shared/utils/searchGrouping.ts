import type { SearchGroup } from '@shared/types/search';

/**
 * A group is an "exact hit" when the user typed a whole document number: one appraisal, matched on
 * a document field, and the matched value equals the query. Those are pinned above the rest.
 */
export function isExactHit(group: SearchGroup, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    group.matchKind === 'document' &&
    group.appraisals.length === 1 &&
    group.matchLabel.trim().toLowerCase() === q
  );
}

export function groupKey(group: SearchGroup): string {
  return `${group.matchField}:${group.matchLabel}`;
}

/**
 * Render order, which keyboard navigation has to agree with exactly: exact hits first, then the
 * server's ranking. Splitting this differently in the hook and in the component is how the
 * highlight ends up one row off.
 */
export function orderGroups(groups: SearchGroup[], query: string) {
  const exact = groups.filter(g => isExactHit(g, query));
  const rest = groups.filter(g => !isExactHit(g, query));
  return { exact, rest, ordered: [...exact, ...rest] };
}
