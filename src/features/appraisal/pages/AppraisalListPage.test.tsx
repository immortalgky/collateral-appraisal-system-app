import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen, waitFor, within } from '@/test/test-utils';
import AppraisalListPage from './AppraisalListPage';

// Wording comes from the same keys the page uses, so the test does not depend on the language.
const L = (key: string) => i18n.t(`appraisal:list.${key}` as never) as string;

const useAppraisalSearch = vi.fn();
const useAppraisalGroups = vi.fn();

vi.mock('../api/appraisalSearch', () => ({
  MAX_EXPORT_ROWS: 10000,
  exportAppraisals: vi.fn(),
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
