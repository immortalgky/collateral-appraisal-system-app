import { describe, it, expect } from 'vitest';
import { getSelectAllState } from './useCoveringCompanySearch';

const a = { id: 'a' };
const b = { id: 'b' };
const gone = { id: 'gone' }; // selected earlier, no longer in the covering list

describe('getSelectAllState', () => {
  it('is checked when every visible company is selected and nothing is hidden', () => {
    const s = getSelectAllState([a, b], [a, b], [a, b], '');
    expect(s).toMatchObject({ allVisibleSelected: true, allChecked: true, indeterminate: false });
    expect(s.hiddenSelected).toEqual([]);
  });

  it('is never "all selected" for an empty visible list', () => {
    const s = getSelectAllState([], [], [], '');
    expect(s).toMatchObject({ allVisibleSelected: false, allChecked: false, indeterminate: false });
  });

  it('is indeterminate when only some visible companies are selected', () => {
    const s = getSelectAllState([a, b], [a, b], [a], '');
    expect(s).toMatchObject({ allChecked: false, indeterminate: true });
  });

  it('does not claim "all" while a selected company is hidden, and reports it for Clear all', () => {
    const s = getSelectAllState([a, b], [a, b], [a, b, gone], '');
    expect(s).toMatchObject({ allVisibleSelected: true, allChecked: false, indeterminate: true });
    expect(s.hiddenSelected).toEqual([gone]);
  });

  it('is indeterminate when only hidden companies are selected', () => {
    const s = getSelectAllState([a, b], [a, b], [gone], '');
    expect(s).toMatchObject({ allVisibleSelected: false, allChecked: false, indeterminate: true });
    expect(s.hiddenSelected).toEqual([gone]);
  });

  it('ignores hidden selections while a search is active (Clear all stays on the matches)', () => {
    const s = getSelectAllState([a], [a, b], [a, gone], ' a ');
    expect(s).toMatchObject({ allVisibleSelected: true, allChecked: true, indeterminate: false });
    expect(s.hiddenSelected).toEqual([]);
  });
});
