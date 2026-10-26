import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen, waitFor, within } from '@/test/test-utils';
import AppraisalListPage from './AppraisalListPage';

// Wording comes from the same keys the page uses, so the test does not depend on the language.
const L = (key: string) => i18n.t(`appraisal:list.${key}` as never) as string;

const useAppraisalSearch = vi.fn();
const useAppraisalGroups = vi.fn();
const exportAppraisals = vi.fn();

// The Export button is for users with APPRAISAL_VIEW.
vi.mock('@/shared/hooks/useHasPermission', () => ({ useHasPermission: () => true }));

vi.mock('../api/appraisalSearch', () => ({
  MAX_EXPORT_ROWS: 10000,
  exportAppraisals: (...args: unknown[]) => exportAppraisals(...args),
  useAppraisalSearch: (params: unknown) => useAppraisalSearch(params),
  useAppraisalGroups: (groupBy: unknown, params: unknown) => useAppraisalGroups(groupBy, params),
  useAppraisalSearchCounts: () => ({}),
  useSmartViews: () => ({ data: [] }),
  useSavedSearches: () => ({ data: [] }),
  useCreateSavedSearch: () => ({ mutate: vi.fn() }),
  useDeleteSavedSearch: () => ({ mutate: vi.fn() }),
}));

const item = {
  id: '1',
  appraisalNumber: '69105467',
  status: 'Pending',
  appraisalType: 'New',
  priority: 'Normal',
  customerName: 'Somchai',
  customerCount: 1,
  slaStatus: 'OnTrack',
  slaDueDate: null,
};

const groups = {
  groups: [
    { key: 'Pending', count: 120, breached: 7, atRisk: 3 },
    { key: 'InProgress', count: 80, breached: 0, atRisk: 0 },
    { key: '', count: 5, breached: 0, atRisk: 0 },
  ],
  total: 205,
};

const lastGroupCall = () => useAppraisalGroups.mock.calls.at(-1)!;
const lastListParams = () => useAppraisalSearch.mock.calls.at(-1)![0];

const pickGroupBy = async (user: ReturnType<typeof render>['user'], name: string) => {
  await user.click(screen.getByRole('button', { name: L('groupBy.label') }));
  await user.click(await screen.findByRole('menuitem', { name }));
};

describe('AppraisalListPage group rail', () => {
  beforeEach(() => {
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count: 1, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
  });

  it('shows no rail until a group-by field is picked, then lists the groups with their counts', async () => {
    const { user } = render(<AppraisalListPage />);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(lastGroupCall()[0]).toBeNull();

    await pickGroupBy(user, L('columns.status'));
    const rail = screen.getByRole('complementary');
    expect(lastGroupCall()[0]).toBe('status');
    // status labels come from the list's own keys; the empty key reads "ไม่ระบุ"
    expect(within(rail).getByText(L('status.Pending'))).toBeTruthy();
    expect(within(rail).getByText('120')).toBeTruthy();
    expect(within(rail).getByText(L('groupBy.empty'))).toBeTruthy();
    // totals only: no red breached count, even for the group the response gives one for
    expect(within(rail).queryAllByTitle(/7/)).toHaveLength(0);
    expect(within(rail).queryByText('7')).toBeNull();
    // nothing is pre-selected: the list is not filtered
    expect(lastListParams().status).toBeUndefined();
  });

  it('filters the list through the field’s own filter, and clears it on a second click', async () => {
    const { user } = render(<AppraisalListPage />);
    await pickGroupBy(user, L('columns.status'));
    const rail = screen.getByRole('complementary');

    await user.click(within(rail).getByText(L('status.Pending')));
    expect(lastListParams().status).toBe('Pending');
    // counted without the grouped field's own filter, so the rail keeps its other groups
    expect(lastGroupCall()[1]).not.toHaveProperty('status');

    await user.click(within(screen.getByRole('complementary')).getByText(L('status.Pending')));
    expect(lastListParams().status).toBeUndefined();
  });

  it('marks every group named by a multi-value filter, and a click narrows to that one', async () => {
    const { user } = render(<AppraisalListPage />, {
      initialEntries: ['/appraisals/search?status=Pending,InProgress'],
    });
    await pickGroupBy(user, L('columns.status'));
    const rail = screen.getByRole('complementary');
    const row = (name: string) => within(rail).getByText(name).closest('button')!;
    expect(row(L('status.Pending'))).toHaveAttribute('aria-pressed', 'true');
    expect(row(L('status.InProgress'))).toHaveAttribute('aria-pressed', 'true');
    expect(within(rail).getByText('80').closest('button')).toBeTruthy();

    await user.click(row(L('status.Pending')));
    expect(lastListParams().status).toBe('Pending');
    // now it is the only one: a second click clears the filter
    await user.click(within(screen.getByRole('complementary')).getByText(L('status.Pending')));
    expect(lastListParams().status).toBeUndefined();
  });

  it('shows a short error line when the counts fail, while the table keeps its rows', async () => {
    useAppraisalGroups.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { user } = render(<AppraisalListPage />);
    await pickGroupBy(user, L('columns.status'));
    const rail = screen.getByRole('complementary');
    expect(within(rail).getByText(L('groupBy.error'))).toBeTruthy();
    expect(within(rail).queryByText(L('empty'))).toBeNull();
    expect(screen.getByText('69105467')).toBeTruthy();
  });

  it('gives the group and column buttons beside the filter bar the keyboard ring, and none after the mouse', async () => {
    const { user } = render(<AppraisalListPage />);
    const group = screen.getByRole('button', { name: L('groupBy.label') });
    const columns = screen.getByTitle(i18n.t('common:columns.toggleColumns'));
    for (const b of [group, columns]) {
      // the global :focus-visible outline can only be switched off inline
      expect(b.style.outlineStyle).toBe('none');
      expect(b.className).toContain('data-focus:ring-2');
    }
    await user.click(group); // a pointer press on the row switches the ring off
    await user.keyboard('{Escape}');
    expect(group.className).not.toContain('data-focus:ring-2');
    expect(columns.className).not.toContain('data-focus:ring-2');
    expect(columns.style.outlineStyle).toBe('none');
    await user.tab();
    expect(columns.className).toContain('data-focus:ring-2');
  });

  it('counts "none" but cannot filter to it', async () => {
    const { user } = render(<AppraisalListPage />);
    await pickGroupBy(user, L('columns.status'));
    const none = within(screen.getByRole('complementary'))
      .getByText(L('groupBy.empty'))
      .closest('button');
    expect(none).toBeDisabled();
  });

  it('keeps the user’s own sort: grouping no longer sorts', async () => {
    const { user } = render(<AppraisalListPage />);
    await pickGroupBy(user, L('columns.province'));
    expect(lastListParams().sortBy).toBeUndefined();
  });
});

describe('AppraisalListPage search scope chips', () => {
  beforeEach(() => {
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count: 1, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
  });

  const openBox = async (user: ReturnType<typeof render>['user']) => {
    const box = screen.getByRole('search').querySelector('input')!;
    await user.click(box);
    const chips = within(screen.getByRole('group', { name: L('suggest.scope') }));
    return { box, chips };
  };

  it('shows one chip per scope when the box is focused, the current one pressed, above the recent searches', async () => {
    const { user } = render(<AppraisalListPage />);
    const { chips } = await openBox(user);
    const all = chips.getAllByRole('button');
    expect(all).toHaveLength(4);
    expect(chips.getByRole('button', { name: L('searchFieldOptions.all') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      chips.getByRole('button', { name: L('searchFieldOptions.customerName') }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches scope on click, keeping the panel, the typed text and the focus in the box', async () => {
    const { user } = render(<AppraisalListPage />);
    const { box, chips } = await openBox(user);
    await user.type(box, 'somchai');

    await user.click(chips.getByRole('button', { name: L('searchFieldOptions.customerName') }));

    expect(box).toHaveFocus();
    expect(box).toHaveValue('somchai');
    // panel still open, new chip pressed
    const after = within(screen.getByRole('group', { name: L('suggest.scope') }));
    expect(
      after.getByRole('button', { name: L('searchFieldOptions.customerName') }),
    ).toHaveAttribute('aria-pressed', 'true');
    // and the search re-runs with the new scope once the debounce settles: the typed text goes to
    // the customer filter instead of the broad search
    await waitFor(() => expect(lastListParams().customerName).toBe('somchai'));
    expect(lastListParams().search).toBeUndefined();
    // no ring on a mouse pick
    expect(
      after.getByRole('button', { name: L('searchFieldOptions.customerName') }).className,
    ).not.toContain('focus-visible:ring-2');
  });

  it('is reachable by keyboard: Tab to the chips, Left/Right between them, Enter picks, Esc returns to the box', async () => {
    const { user } = render(<AppraisalListPage />);
    const { box, chips } = await openBox(user);
    await user.type(box, 'abc');
    await user.tab(); // clear button
    await user.tab(); // first chip
    const first = chips.getByRole('button', { name: L('searchFieldOptions.all') });
    expect(first).toHaveFocus();
    expect(first.className).toContain('focus-visible:ring-2');
    await user.keyboard('{ArrowRight}');
    const second = chips.getByRole('button', { name: L('searchFieldOptions.appraisalNumber') });
    expect(second).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(box).toHaveValue('abc');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: L('suggest.scope') })).toBeNull();
    expect(box).toHaveFocus();
  });

  it('closes the panel on Esc from a result row too, and returns the focus to the box', async () => {
    const { user } = render(<AppraisalListPage />);
    const { box } = await openBox(user);
    await user.type(box, 'somchai');
    await waitFor(() => expect(document.querySelector('[data-suggest-item]')).not.toBeNull());
    // Tab past the clear button and the chips to the first result row
    for (let i = 0; i < 10 && !document.activeElement?.hasAttribute('data-suggest-item'); i++) {
      await user.tab();
    }
    expect(document.activeElement).toHaveAttribute('data-suggest-item');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: L('suggest.scope') })).toBeNull();
    expect(box).toHaveFocus();
  });

  it('draws the green keyboard ring, not the blue outline, on the clear button and the result rows', async () => {
    const { user } = render(<AppraisalListPage />);
    const { box } = await openBox(user);
    await user.type(box, 'somchai');
    const clear = screen.getByRole('button', { name: i18n.t('common:actions.clear') });
    // the mouse click that opened the box switched the ring off until the next Tab
    expect(clear.className).not.toContain('focus-visible:ring-2');
    await waitFor(() => expect(document.querySelector('[data-suggest-item]')).not.toBeNull());
    await user.tab();
    expect(clear).toHaveFocus();
    expect(clear.style.outlineStyle).toBe('none');
    expect(clear.className).toContain('focus-visible:ring-2');
    for (let i = 0; i < 10 && !document.activeElement?.hasAttribute('data-suggest-item'); i++) {
      await user.tab();
    }
    const row = document.activeElement as HTMLElement;
    expect(row).toHaveAttribute('data-suggest-item');
    expect(row.style.outlineStyle).toBe('none');
    expect(row.className).toContain('focus-visible:ring-2');
  });
});

describe('AppraisalListPage SLA sort and default columns', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count: 1, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
  });

  it('reads a link or saved search that sorts by the old slaStatus as the due-date sort', () => {
    render(<AppraisalListPage />, {
      initialEntries: ['/appraisals/search?sortBy=slaStatus&sortDir=asc'],
    });
    expect(lastListParams().sortBy).toBe('slaDueDate');
    expect(lastListParams().sortDir).toBe('asc');
    expect(screen.getByRole('columnheader', { name: L('columns.sla') })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('starts without the Priority column, which stays in the picker', () => {
    render(<AppraisalListPage />);
    expect(screen.queryByRole('columnheader', { name: L('columns.priority') })).toBeNull();
    expect(screen.getByRole('columnheader', { name: L('columns.sla') })).toBeTruthy();
  });
});

describe('AppraisalListPage export past the row cap', () => {
  beforeEach(() => {
    exportAppraisals.mockReset().mockResolvedValue(undefined);
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
  });

  const withCount = (count: number) =>
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });

  const exportAs = async (user: ReturnType<typeof render>['user'], label: string) => {
    await user.click(screen.getByRole('button', { name: new RegExp(L('export')) }));
    await user.click(await screen.findByRole('button', { name: label }));
  };

  // ConfirmDialog is a <dialog class="modal-open"> without the `open` attribute, which happy-dom
  // leaves out of the accessibility tree: it is found by its title instead.
  const findDialog = async () =>
    (await screen.findByText(L('exportTruncatedTitle'))).closest('dialog') as HTMLElement;

  it('asks in an in-app dialog, not window.confirm, and exports nothing until confirmed', async () => {
    withCount(25000);
    // happy-dom has no window.confirm to spy on: a stub stands in, to prove it is never reached
    const confirmSpy = vi.fn();
    vi.stubGlobal('confirm', confirmSpy);
    const { user } = render(<AppraisalListPage />);
    await exportAs(user, L('exportCsv'));

    const dialog = await findDialog();
    // the body names both the matches and the cap
    expect(dialog.textContent).toContain('25,000');
    expect(dialog.textContent).toContain('10,000');
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(exportAppraisals).not.toHaveBeenCalled();

    await user.click(within(dialog).getByText(i18n.t('common:actions.confirm')));
    expect(exportAppraisals).toHaveBeenCalledTimes(1);
    expect(exportAppraisals.mock.calls[0][1]).toBe('csv');
    expect(screen.queryByText(L('exportTruncatedTitle'))).toBeNull();
    vi.unstubAllGlobals();
  });

  it('cancelling closes the dialog and exports nothing', async () => {
    withCount(25000);
    const { user } = render(<AppraisalListPage />);
    await exportAs(user, L('exportXlsx'));
    const dialog = await findDialog();
    await user.click(within(dialog).getByText(i18n.t('common:actions.cancel')));
    expect(screen.queryByText(L('exportTruncatedTitle'))).toBeNull();
    expect(exportAppraisals).not.toHaveBeenCalled();
  });

  it('exports straight away when the result fits under the cap', async () => {
    withCount(500);
    const { user } = render(<AppraisalListPage />);
    await exportAs(user, L('exportXlsx'));
    expect(screen.queryByText(L('exportTruncatedTitle'))).toBeNull();
    expect(exportAppraisals).toHaveBeenCalledTimes(1);
    expect(exportAppraisals.mock.calls[0][1]).toBe('xlsx');
  });
});

describe('AppraisalListPage search pill and tool buttons', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count: 1, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
  });

  const pill = () =>
    within(screen.getByRole('search')).getByRole('button', {
      name: new RegExp(L('searchFieldOptions.all')),
    });

  it('opens the big suggestion panel from the pill, with focus in the box and no menu', async () => {
    const { user } = render(<AppraisalListPage />);
    expect(screen.queryByRole('group', { name: L('suggest.scope') })).toBeNull();
    await user.click(pill());
    expect(screen.getByRole('group', { name: L('suggest.scope') })).toBeTruthy();
    expect(screen.getByRole('search').querySelector('input')).toHaveFocus();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('opens the same panel from the keyboard: Enter on the pill, then the box has the focus', async () => {
    const { user } = render(<AppraisalListPage />);
    pill().focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('group', { name: L('suggest.scope') })).toBeTruthy();
    expect(screen.getByRole('search').querySelector('input')).toHaveFocus();
  });

  it('keeps the pill showing the current scope, and a chip in the panel changes it', async () => {
    const { user } = render(<AppraisalListPage />);
    await user.click(pill());
    await user.click(
      within(screen.getByRole('group', { name: L('suggest.scope') })).getByRole('button', {
        name: L('searchFieldOptions.customerName'),
      }),
    );
    expect(
      within(screen.getByRole('search')).getAllByRole('button', {
        name: L('searchFieldOptions.customerName'),
      })[0],
    ).toBeTruthy();
  });

  it('draws group by, columns and density as the same plain neutral button', () => {
    render(<AppraisalListPage />);
    const group = screen.getByRole('button', { name: L('groupBy.label') });
    const columns = screen.getByTitle(i18n.t('common:columns.toggleColumns'));
    const density = screen.getByRole('button', { name: L('density.compact') });
    for (const b of [group, columns, density]) {
      expect(b.className).toContain('border-(--palette-line)');
      expect(b.className).toContain('bg-(--palette-surface)');
      expect(b.className).not.toMatch(/violet|indigo/);
      expect(b.style.outlineStyle).toBe('none');
    }
  });

  it('switches the row density with the button, and keeps it under the stored key', async () => {
    const { user } = render(<AppraisalListPage />);
    const density = () => screen.getByRole('button', { name: L('density.compact') });
    expect(density()).toHaveAttribute('aria-pressed', 'false');
    await user.click(density());
    expect(density()).toHaveAttribute('aria-pressed', 'true');
    expect(density().getAttribute('title')).toContain(L('density.compact'));
    // the persisted key is unchanged, so a user's saved density carries over
    expect(localStorage.getItem('appraisal-list-columns-density')).toBe('"compact"');
    await user.click(density());
    expect(density()).toHaveAttribute('aria-pressed', 'false');
  });

  it('lists the columns with checkboxes, and no density switch inside the panel', async () => {
    const { user } = render(<AppraisalListPage />);
    await user.click(screen.getByTitle(i18n.t('common:columns.toggleColumns')));
    expect(await screen.findByRole('checkbox', { name: L('columns.status') })).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByText(L('density.comfortable'))).toBeNull();
  });
});

describe('AppraisalListPage scope tints', () => {
  beforeEach(() => {
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count: 1, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
  });

  const chip = (name: string) =>
    within(screen.getByRole('group', { name: L('suggest.scope') })).getByRole('button', { name });

  it('tints only the selected scope chip: every unselected chip is the same plain gray', async () => {
    const { user } = render(<AppraisalListPage />);
    await user.click(screen.getByRole('search').querySelector('input')!);
    const names = ['all', 'appraisalNumber', 'customerName', 'requestNumber'].map(f =>
      L(`searchFieldOptions.${f}`),
    );
    const hue = (name: string) => chip(name).className.match(/bg-(\w+)-\d+/)?.[1] ?? 'gray';
    // at rest only "all" is selected: it is the neutral selected style, the others plain gray
    expect(names.map(hue)).toEqual(['gray', 'gray', 'gray', 'gray']);
    expect(chip(names[1]).className).toBe(chip(names[2]).className);
    // select each scope in turn: it alone takes its own hue, and the rest stay gray
    const hues: Record<string, string> = {};
    for (const [i, f] of [
      [1, 'blue'],
      [2, 'purple'],
      [3, 'amber'],
    ] as const) {
      await user.click(chip(names[i]));
      expect(hue(names[i])).toBe(f);
      hues[f] = f;
      expect(names.filter((_, j) => j !== i).every(n => hue(n) === 'gray')).toBe(true);
    }
    expect(Object.keys(hues)).toHaveLength(3);
  });

  it('shows the selected chip in its hue, and the pill takes the same hue', async () => {
    const { user } = render(<AppraisalListPage />);
    await user.click(screen.getByRole('search').querySelector('input')!);
    const name = L('searchFieldOptions.customerName');
    const resting = chip(name).className;
    expect(resting).toContain('bg-(--palette-surface-2)');
    expect(resting).not.toContain('purple');
    await user.click(chip(name));
    const active = chip(name).className;
    expect(active).toContain('bg-purple-100');
    expect(active).toContain('ring-1');
    expect(active).not.toContain('bg-(--palette-surface-2)');
    const pillFor = (scope: string) =>
      screen.getByRole('button', { name: `${L('suggest.scope')}: ${scope}` });
    const pill = pillFor(name);
    expect(pill.className).toContain('bg-purple-100');
    // back to "all": the pill is the neutral gray again
    await user.click(chip(L('searchFieldOptions.all')));
    expect(pillFor(L('searchFieldOptions.all')).className).toContain('bg-(--palette-surface-3)');
  });
});

describe('AppraisalListPage "/" shortcut and hint', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count: 1, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
  });

  const box = () => screen.getByRole('search').querySelector('input')!;
  const hint = () =>
    [...screen.getByRole('search').querySelectorAll('kbd')].find(k => k.textContent === '/');

  it('shows the "/" hint in the box while it is empty and not focused', () => {
    render(<AppraisalListPage />);
    expect(hint()).toBeTruthy();
  });

  it('hides the hint on focus and while the box has text, so it never meets the clear button', async () => {
    const { user } = render(<AppraisalListPage />);
    await user.click(box());
    expect(hint()).toBeUndefined();
    await user.type(box(), 'somchai');
    expect(hint()).toBeUndefined();
    expect(screen.getByRole('button', { name: i18n.t('common:actions.clear') })).toBeTruthy();
    await user.tab(); // out of the box, but the text stays: still no hint
    expect(hint()).toBeUndefined();
  });

  it('focuses the box when "/" is pressed outside any field, and swallows that key', async () => {
    const { user } = render(<AppraisalListPage />);
    expect(box()).not.toHaveFocus();
    await user.keyboard('/');
    expect(box()).toHaveFocus();
    expect(box()).toHaveValue('');
  });

  it('works from a button that has the focus too, e.g. after clicking a quick view', async () => {
    const { user } = render(<AppraisalListPage />);
    screen.getByRole('button', { name: L('groupBy.label') }).focus();
    await user.keyboard('/');
    // inside a menu button's own overlay it would not, but a plain page button is fine
    expect(box()).toHaveFocus();
  });

  it('ignores "/" while a dialog is open, even a native <dialog> with no role', async () => {
    const { user } = render(<AppraisalListPage />);
    const dialog = document.createElement('dialog');
    dialog.className = 'modal modal-open';
    const cancel = document.createElement('button');
    dialog.appendChild(cancel);
    document.body.appendChild(dialog);
    try {
      // from inside the dialog, and from the body behind it (ConfirmDialog traps no focus)
      cancel.focus();
      await user.keyboard('/');
      expect(box()).not.toHaveFocus();
      cancel.blur();
      await user.keyboard('/');
      expect(box()).not.toHaveFocus();
    } finally {
      dialog.remove();
    }
    await user.keyboard('/');
    expect(box()).toHaveFocus();
  });

  it('is not blocked by a closed <dialog> that is merely in the DOM', async () => {
    const { user } = render(<AppraisalListPage />);
    const closed = document.createElement('dialog'); // no `open`, no modal-open: not showing
    document.body.appendChild(closed);
    try {
      await user.keyboard('/');
      expect(box()).toHaveFocus();
    } finally {
      closed.remove();
    }
  });

  it('ignores "/" while typing in a field, so it can be part of the text', async () => {
    const { user } = render(<AppraisalListPage />);
    await user.click(box());
    await user.type(box(), 'a/b');
    expect(box()).toHaveValue('a/b');
  });
});

describe('AppraisalListPage filter bar placement', () => {
  const proto = HTMLElement.prototype;
  const originals = {
    offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
    clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
  };
  const rect = proto.getBoundingClientRect;
  const row = { width: 1600 };

  beforeEach(() => {
    localStorage.clear();
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count: 1, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
    // no layout in happy-dom: every chip is 100 wide, the "Add filter" tail 120, the tools 76
    Object.defineProperty(proto, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        const text = this.textContent ?? '';
        if (text.includes(L('filters.add'))) return 120;
        return this.className.includes('h-[2.5357rem]') ? 76 : 100;
      },
    });
    proto.getBoundingClientRect = function (this: HTMLElement) {
      const width = this.offsetWidth;
      return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0 } as DOMRect;
    };
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        // the page's row is the flex container holding the search, the filters and the tools
        return this.className.includes('items-start') ? row.width : 0;
      },
    });
  });
  afterEach(() => {
    proto.getBoundingClientRect = rect;
    for (const [k, d] of Object.entries(originals)) {
      if (d) Object.defineProperty(proto, k, d);
    }
  });

  const bar = () => document.querySelector<HTMLElement>('.content-center')!;
  const search = () => screen.getByRole('search');

  it('keeps the filter bar beside the search while its one line fits there', () => {
    row.width = 1600;
    render(<AppraisalListPage />);
    // the chips take the room they need, and the search grows to fill the rest
    expect(bar().classList.contains('grow-0')).toBe(true);
    expect(bar().classList.contains('basis-full')).toBe(false);
    expect(search().classList.contains('flex-1')).toBe(true);
    expect(search().classList.contains('min-w-[22rem]')).toBe(true);
    expect(search().classList.contains('order-1')).toBe(false);
  });

  it('moves the whole bar onto a full-width row below the search when it does not fit', () => {
    row.width = 1000;
    render(<AppraisalListPage />);
    expect(bar().classList.contains('basis-full')).toBe(true);
    expect(bar().classList.contains('order-3')).toBe(true);
    // the search takes its row (with the tools), not a width beside the filters
    expect(search().classList.contains('order-1')).toBe(true);
    expect(search().classList.contains('flex-1')).toBe(true);
  });
});

describe('AppraisalListPage accessible names', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppraisalSearch.mockReset().mockReturnValue({
      data: { result: { items: [item], count: 1, pageNumber: 0, pageSize: 25 } },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      error: null,
    });
    useAppraisalGroups.mockReset().mockReturnValue({ data: groups, isLoading: false });
  });

  it('names the density toggle by what pressing it means, and says its state with aria-pressed', async () => {
    const { user } = render(<AppraisalListPage />);
    const toggle = () => screen.getByRole('button', { name: L('density.compact') });
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle());
    // the name does not change with the state: aria-pressed carries it
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('names the scope pill "search in field: scope", a popup button whose expanded state follows the panel', async () => {
    const { user } = render(<AppraisalListPage />);
    const pill = () =>
      screen.getByRole('button', {
        name: `${L('suggest.scope')}: ${L('searchFieldOptions.all')}`,
      });
    expect(pill()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(pill()).toHaveAttribute('aria-expanded', 'false');
    await user.click(pill());
    expect(pill()).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(pill()).toHaveAttribute('aria-expanded', 'false');
  });
});
