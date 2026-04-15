import type { DCFSection } from '../../types/dcf';

export function resolveRefTarget(
  sections: DCFSection[],
  refTargetId: DcfRefTargetId | null | undefined,
) {
  if (!refTargetId) return null;

  const [kind, id] = refTargetId.split(':');

  if (kind === 'section') {
    const section = sections.find(s => s.clientId === id);
    return section ? section.totalSectionValues : null;
  }

  if (kind === 'category') {
    const category = sections.flatMap(s => s.categories ?? []).find(c => c.clientId === id);
    return category ? category.totalCategoryValues : null;
  }

  const assumption = sections
    .flatMap(s => s.categories ?? [])
    .flatMap(c => c.assumptions ?? [])
    .find(a => a.clientId === id);

  return assumption ? assumption.totalAssumptionValues : null;
}
