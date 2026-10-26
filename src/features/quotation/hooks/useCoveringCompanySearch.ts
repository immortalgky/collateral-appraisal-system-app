import { useMemo } from 'react';

import { filterCoveringCompanies, searchCompanies } from '../utils/segmentCoverage';

interface PickableCompany {
  companyName: string;
  companyNameLocal?: string | null;
  loanTypes: string[];
}

/**
 * Company-picker list: companies covering the whole Segment Set, then the name search on top.
 * `noCoverage` (the set is non-empty and nobody covers it) tells that empty state apart from
 * "the search matched nothing". `covering` is the list before the search, for `getSelectAllState`.
 * The API's Send guard stays authoritative.
 */
export function useCoveringCompanySearch<T extends PickableCompany>(
  companies: ReadonlyArray<T>,
  segmentSet: ReadonlyArray<string>,
  query: string,
) {
  const covering = useMemo(
    () => filterCoveringCompanies(companies, segmentSet),
    [companies, segmentSet],
  );
  const filtered = useMemo(() => searchCompanies(covering, query), [covering, query]);
  return { covering, filtered, noCoverage: segmentSet.length > 0 && covering.length === 0 };
}

/**
 * State of the picker's select-all header. `hiddenSelected` are the selected companies missing from
 * the pre-search list (no longer covering, deactivated, excluded...), whatever the cause: they are not
 * visible, so the header must not claim "all" while any remain, and Clear all must drop them too.
 * While a search is active the header only acts on the visible matches, so `hiddenSelected` is empty
 * then (searching never widens Clear all). An empty visible list is never "all selected".
 */
export function getSelectAllState<T extends { id: string }>(
  visible: ReadonlyArray<T>,
  covering: ReadonlyArray<T>,
  selected: ReadonlyArray<T>,
  query: string,
) {
  const selectedIds = new Set(selected.map(c => c.id));
  const coveringIds = new Set(covering.map(c => c.id));
  const hiddenSelected = query.trim() ? [] : selected.filter(c => !coveringIds.has(c.id));
  const allVisibleSelected = visible.length > 0 && visible.every(c => selectedIds.has(c.id));
  const allChecked = allVisibleSelected && hiddenSelected.length === 0;
  const someChecked = visible.some(c => selectedIds.has(c.id)) || hiddenSelected.length > 0;
  return {
    allVisibleSelected,
    allChecked,
    indeterminate: !allChecked && someChecked,
    hiddenSelected,
  };
}
