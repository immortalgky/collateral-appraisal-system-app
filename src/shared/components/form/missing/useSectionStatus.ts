import { useCallback } from 'react';
import { useMissingFields } from './missingFieldsContext';
import { sectionCount } from './types';
import { useJumpToMissing } from './useJumpToMissing';

/**
 * What the form is missing in one section, by the section's DOM id: how many, and a `jump` to the
 * first one. `null` for every section until the page has a missing-fields summary.
 */
export function useSectionStatus() {
  const summary = useMissingFields()?.summary;
  const jump = useJumpToMissing();
  return useCallback(
    (id: string) => {
      if (!summary) return null;
      const section = summary.sections.find(s => s.id === id);
      return {
        count: section ? sectionCount(section) : 0,
        jump: () => section && jump(section.items[0], id),
      };
    },
    [summary, jump],
  );
}
