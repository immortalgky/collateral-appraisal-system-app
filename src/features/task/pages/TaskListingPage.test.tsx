import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { cleanup } from '@testing-library/react';
import { render, screen, waitFor, within } from '@/test/test-utils';

const useGetTasks = vi.fn();
const useTaskGroupCounts = vi.fn();
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

vi.mock('../api', () => ({
  useGetTasks: (params: unknown, options: unknown) => useGetTasks(params, options),
  useTaskGroupCounts: (...args: unknown[]) => useTaskGroupCounts(...args),
  useGetTaskCounts: () => ({
    data: new Map([
      [
        'int-appraisal-execution',
        { activityId: 'int-appraisal-execution', myCount: 7, poolCount: 2 },
      ],
    ]),
  }),
}));
vi.mock('@features/menuFavorites', () => ({ FavoritesRow: () => null }));
// What the mocked Pool list starts as, and every value it has reported (to the page) in order
const pool = vi.hoisted(() => ({
  startLoading: false,
  reports: [] as boolean[],
  props: {} as { visibleColumns?: string[]; colWidths?: Record<string, number> },
}));
vi.mock('./PoolTaskListPage', async () => {
  const { useLayoutEffect, useState } = await import('react');
  return {
    // as the real page reports it: a layout effect on the loading value, cleared when it goes away
    default: (p: {
      onLoadingChange?: (l: boolean) => void;
      visibleColumns?: string[];
      colWidths?: Record<string, number>;
    }) => {
      const { onLoadingChange } = p;
      pool.props = p;
      const [loading, setLoading] = useState(pool.startLoading);
      useLayoutEffect(() => {
        pool.reports.push(loading);
        onLoadingChange?.(loading);
        return () => {
          pool.reports.push(false);
          onLoadingChange?.(false);
        };
      }, [loading, onLoadingChange]);
      return <button onClick={() => setLoading(false)}>pool list</button>;
    },
  };
});
vi.mock('../components/TaskKanbanBoard', () => ({ TaskKanbanBoard: () => <div>kanban</div> }));

import TaskListingPage from './TaskListingPage';

const items = [
  {
    id: 't1',
    activityId: 'int-appraisal-execution',
    appraisalNumber: '69000001',
    customerName: 'Somchai Jaidee',
    status: 'InProgress',
    slaStatus: 'Breached',
  },
];

const proto = HTMLElement.prototype;
const original = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
const contentWidth = (px: number) =>
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      // the page's own box; everything else measures 0 as it does without a layout engine
      return this.className.includes('flex-col gap-4') ? px : 0;
    },
  });

beforeEach(() => {
  useTaskGroupCounts.mockReset();
  useTaskGroupCounts.mockReturnValue({ data: [{ value: 'int-appraisal-execution', count: 7 }] });
  useGetTasks.mockReturnValue({ data: { items, count: 1 }, isLoading: false, isError: false });
});
afterEach(() => {
  if (original) Object.defineProperty(proto, 'clientWidth', original);
});

describe('TaskListingPage', () => {
  it('uses chips where the content area is narrower than 1280px, with no panel', async () => {
    contentWidth(1100);
    render(<TaskListingPage />, { initialEntries: ['/tasks'] });

    expect(screen.getByRole('heading', { name: 'All Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveAttribute(
      'placeholder',
      'Search number or customer…',
    );
    // the pinned chips are on show, unset
    expect(screen.getByRole('button', { name: /^Task type/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Request status/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Appointment date/ })).toBeInTheDocument();
    // (the table headers are buttons too: look in the toolbar only)
    const toolbar = screen.getByRole('search').parentElement!;
    expect(within(toolbar).queryByRole('button', { name: /^Purpose/ })).toBeNull();
    expect(within(toolbar).queryByRole('button', { name: /^Channel/ })).toBeNull();
    expect(screen.queryByRole('complementary', { name: 'Filters' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Filter panel/ })).toBeNull();
    // the row: number over customer
    expect(screen.getByText('69000001')).toBeInTheDocument();
    expect(screen.getByText('Somchai Jaidee')).toBeInTheDocument();
  });

  it('pins five chips on the Pool tab and gives it a subtitle of its own', () => {
    contentWidth(1100);
    render(<TaskListingPage />, { initialEntries: ['/tasks?tab=pool'] });
    const toolbar = screen.getByRole('search').parentElement!;
    for (const name of [
      /^Task type/,
      /^Request status/,
      /^Purpose/,
      /^Channel/,
      /^Appointment date/,
    ])
      expect(within(toolbar).getByRole('button', { name })).toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: /^SLA status/ })).toBeNull();
    expect(screen.getByText('Team tasks waiting to be picked up')).toBeInTheDocument();
  });

  it('gives the Pool its pickup column right after the number, with a width, and My none', () => {
    contentWidth(1100);
    render(<TaskListingPage />, { initialEntries: ['/tasks?tab=pool'] });
    expect(pool.props.visibleColumns?.slice(0, 2)).toEqual(['appraisalNumber', 'lockState']);
    expect(pool.props.colWidths?.lockState).toBeGreaterThan(0);

    cleanup();
    render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    expect(screen.queryByRole('columnheader', { name: /Pickup/ })).toBeNull();
  });

  it('switches list and board with two square segments in a bordered box, the chosen one tinted', async () => {
    contentWidth(1100);
    const { user } = render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    const group = screen.getByRole('group', { name: 'Display' });
    expect(group.className).toContain('border-gray-200');
    const table = within(group).getByRole('button', { name: 'Table' });
    const board = within(group).getByRole('button', { name: 'Board' });
    expect(table).toHaveAttribute('aria-pressed', 'true');
    expect(table.className).toContain('bg-primary/10');
    expect(board).toHaveAttribute('aria-pressed', 'false');
    expect(board).toHaveAttribute('title', 'Board');
    await user.click(board);
    expect(board).toHaveAttribute('aria-pressed', 'true');
    expect(table).toHaveAttribute('aria-pressed', 'false');
  });

  it('counts the task types under the search and the other filters, not under the task type itself', async () => {
    contentWidth(1400);
    render(<TaskListingPage />, {
      initialEntries: ['/tasks?tab=personal&myActivityId=x&status=Pending&search=abc'],
    });
    // (the search settles after its debounce)
    await waitFor(() =>
      expect(useTaskGroupCounts).toHaveBeenLastCalledWith(
        'activity',
        expect.objectContaining({ status: 'Pending', search: 'abc' }),
        'me',
        { enabled: true },
      ),
    );
    const base = useTaskGroupCounts.mock.calls.at(-1)![1];
    expect(base.activityId).toBeUndefined();
  });

  it("does not put the signed-in user's task type counts on another user's list", () => {
    contentWidth(1400);
    // as the real hook: a query that is switched off has no data
    useTaskGroupCounts.mockImplementation((...a: unknown[]) => ({
      data: (a[3] as { enabled: boolean }).enabled
        ? [{ value: 'int-appraisal-execution', count: 7 }]
        : undefined,
    }));
    render(<TaskListingPage />, { initialEntries: ['/tasks?tab=personal&assigneeUserId=u2'] });
    expect(useTaskGroupCounts).toHaveBeenLastCalledWith('activity', expect.anything(), 'me', {
      enabled: false,
    });
    // the panel still lists the task types, with no numbers
    const taskType = within(screen.getByRole('complementary', { name: 'Filters' })).getByRole(
      'group',
      { name: 'Task type' },
    );
    expect(within(taskType).getAllByRole('checkbox').length).toBeGreaterThan(1);
    expect(within(taskType).queryByText('7')).toBeNull();
  });

  it("counts the Pool's task types from the Pool, and only while the panel is open", () => {
    contentWidth(1100);
    render(<TaskListingPage />, { initialEntries: ['/tasks?tab=pool'] });
    expect(useTaskGroupCounts).toHaveBeenLastCalledWith('activity', expect.anything(), 'pool', {
      enabled: false,
    });
  });

  it('first asks for the most urgent first: due date ascending', () => {
    contentWidth(1100);
    useGetTasks.mockClear();
    render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    expect(useGetTasks.mock.calls[0][0]).toMatchObject({ sortBy: 'dueAt', sortDir: 'asc' });
    expect(screen.getByRole('columnheader', { name: /SLA Due/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('shows the filter panel at 1280px and over, and edits the same filters the query reads', async () => {
    contentWidth(1400);
    const { user } = render(<TaskListingPage />, { initialEntries: ['/tasks'] });

    const panel = screen.getByRole('complementary', { name: 'Filters' });
    expect(screen.getByRole('button', { name: /Filter panel/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // the chip row gives way to the panel
    expect(screen.queryByRole('button', { name: /^Task type/ })).toBeNull();
    // the task type count is the API's; the other facets show none
    const taskType = within(panel).getByRole('group', { name: 'Task type' });
    expect(within(taskType).getByText('7')).toBeInTheDocument();
    const status = within(panel).getByRole('group', { name: 'Request status' });
    expect(within(status).queryByText(/^\d+$/)).toBeNull();

    // several values of one facet go to the query as one comma-joined value
    await user.click(within(status).getByRole('checkbox', { name: 'Pending' }));
    await user.click(within(status).getByRole('checkbox', { name: 'In Progress' }));
    await waitFor(() =>
      expect(useGetTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'Pending,InProgress' }),
        expect.anything(),
      ),
    );
    // and the summary row lists what is filtered
    const summary = screen.getByText('Filtering:').parentElement!;
    expect(within(summary).getByText('Pending +1')).toBeInTheDocument();

    // the panel can be closed: the chips come back, holding the same filter
    await user.click(screen.getByRole('button', { name: 'Close filter panel' }));
    expect(screen.queryByRole('complementary', { name: 'Filters' })).toBeNull();
    expect(
      screen.getByRole('button', { name: /^Request status: Pending \+1/ }),
    ).toBeInTheDocument();
  });

  it('lists only the task types that have tasks (and ticked ones) until asked for the rest', async () => {
    contentWidth(1400);
    const { user } = render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    const taskType = within(screen.getByRole('complementary', { name: 'Filters' })).getByRole(
      'group',
      { name: 'Task type' },
    );
    // the counts mock holds one type with tasks
    expect(within(taskType).getAllByRole('checkbox')).toHaveLength(1);
    expect(
      within(taskType).getByRole('checkbox', { name: /Internal Appraisal Execution/ }),
    ).toBeTruthy();

    await user.click(within(taskType).getByRole('button', { name: /^Show all \(\d+\)$/ }));
    expect(within(taskType).getAllByRole('checkbox').length).toBeGreaterThan(10);
    await user.click(within(taskType).getByRole('button', { name: 'Show only types with tasks' }));
    expect(within(taskType).getAllByRole('checkbox')).toHaveLength(1);
  });

  it('shows the rows as soon as a fast response lands, not skeletons for good', () => {
    contentWidth(1100);
    useGetTasks.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { rerender } = render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    expect(screen.queryByText('69000001')).toBeNull();

    // the answer arrives at once (localhost): the table must follow without any timer firing
    useGetTasks.mockReturnValue({ data: { items, count: 1 }, isLoading: false, isError: false });
    rerender(<TaskListingPage />);
    expect(screen.getByText('69000001')).toBeInTheDocument();
  });

  it('sends the three date ranges as their own query keys', async () => {
    contentWidth(1400);
    render(<TaskListingPage />, {
      initialEntries: ['/tasks?assignedFrom=2026-10-01&appointmentTo=2026-10-31'],
    });
    await waitFor(() =>
      expect(useGetTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ assignedFrom: '2026-10-01', appointmentTo: '2026-10-31' }),
        expect.anything(),
      ),
    );
    const summary = screen.getByText('Filtering:').parentElement!;
    expect(within(summary).getByText('Assigned date:')).toBeInTheDocument();
    expect(within(summary).getByText('Appointment date:')).toBeInTheDocument();
  });

  it('keeps the header, the switch and the Pool tab when the My query fails: only the table is lost', () => {
    contentWidth(1100);
    useGetTasks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    });
    render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    expect(screen.getByRole('heading', { name: 'All Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pool/ })).toBeInTheDocument();
    expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    // no data is no count: not a 0
    const count = screen.getByRole('button', { name: /My Tasks/ });
    expect(count).not.toHaveTextContent(/\d/);
  });

  it('brings the panel back after an error view (the page box is observed whenever it mounts)', () => {
    contentWidth(1400);
    useGetTasks.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    expect(screen.getByRole('button', { name: /Filter panel/ })).toBeInTheDocument();
  });

  it('does not query My while the Pool tab or the board is showing', async () => {
    contentWidth(1100);
    useGetTasks.mockClear();
    render(<TaskListingPage />, { initialEntries: ['/tasks?tab=pool'] });
    expect(screen.getByText('pool list')).toBeInTheDocument();
    expect(useGetTasks).toHaveBeenLastCalledWith(expect.anything(), {
      enabled: false,
    });

    cleanup();
    useGetTasks.mockClear();
    const { user } = render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    expect(useGetTasks).toHaveBeenLastCalledWith(expect.anything(), {
      enabled: true,
    });
    await user.click(screen.getByRole('button', { name: 'Board' }));
    expect(screen.getByText('kanban')).toBeInTheDocument();
    expect(useGetTasks).toHaveBeenLastCalledWith(expect.anything(), {
      enabled: false,
    });
  });

  it('offers Copy only when there is a number, and says so when the clipboard is not there', async () => {
    contentWidth(1100);
    useGetTasks.mockReturnValue({
      data: {
        items: [
          ...items,
          { ...items[0], id: 't2', appraisalNumber: null, customerName: 'No Number' },
        ],
        count: 2,
      },
      isLoading: false,
      isError: false,
    });
    {
      const { user } = render(<TaskListingPage />, { initialEntries: ['/tasks'] });
      // after render: user-event's setup installs a clipboard stub of its own
      vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(undefined as never);
      const rows = screen.getAllByRole('row');
      const withNumber = rows.find(r => within(r).queryByText('69000001'))!;
      const without = rows.find(r => within(r).queryByText('No Number'))!;

      await user.click(within(without).getByRole('button', { name: 'Actions' }));
      expect(screen.queryByRole('menuitem', { name: 'Copy appraisal number' })).toBeNull();
      await user.keyboard('{Escape}');

      await user.click(within(withNumber).getByRole('button', { name: 'Actions' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Copy appraisal number' }));
      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Could not copy the appraisal number'),
      );
    }
  });

  it('keeps the count and dims the rows while the next result loads', () => {
    contentWidth(1100);
    // react-query's keepPreviousData: the last result, flagged as a placeholder
    useGetTasks.mockReturnValue({
      data: { items, count: 60 },
      isLoading: false,
      isPlaceholderData: true,
      isError: false,
    });
    render(<TaskListingPage />, { initialEntries: ['/tasks'] });
    expect(screen.getByRole('button', { name: /My Tasks/ })).toHaveTextContent('60');
    expect(screen.getByText('69000001')).toBeInTheDocument();
    expect(screen.getByText('69000001').closest('div[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    // the pager still has its total: not a collapsed "no results"
    expect(screen.queryByText('No results')).toBeNull();
  });

  it('spins the search only while a search is actually running, not for a kept page', () => {
    contentWidth(1100);
    // a page change with the search unchanged: the last page's rows are the placeholder
    useGetTasks.mockReturnValue({
      data: { items, count: 60 },
      isLoading: false,
      isPlaceholderData: true,
      isError: false,
    });
    render(<TaskListingPage />, { initialEntries: ['/tasks?search=abc'] });
    expect(document.querySelector('[role=search] svg.animate-spin')).toBeNull();
    cleanup();

    // first load of the search: the spinner
    useGetTasks.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<TaskListingPage />, { initialEntries: ['/tasks?search=abc'] });
    expect(document.querySelector('[role=search] svg.animate-spin')).not.toBeNull();
  });

  it('spins the search on the Pool tab while a typed term is still settling, like My', async () => {
    contentWidth(1100);
    const { user } = render(<TaskListingPage />, { initialEntries: ['/tasks?tab=pool'] });
    expect(document.querySelector('[role=search] svg.animate-spin')).toBeNull();
    await user.type(screen.getByRole('searchbox'), 'abc');
    expect(document.querySelector('[role=search] svg.animate-spin')).not.toBeNull();
  });

  it('spins the Pool search while the pool loads for a search term, stops when it finishes, and clears on leaving the tab', async () => {
    contentWidth(1100);
    pool.startLoading = true;
    pool.reports.length = 0;
    const spinner = () => document.querySelector('[role=search] svg.animate-spin');
    try {
      const { user } = render(<TaskListingPage />, {
        initialEntries: ['/tasks?tab=pool&search=abc'],
      });
      expect(await screen.findByText('pool list')).toBeInTheDocument();
      expect(spinner()).not.toBeNull();

      // the pool answers
      await user.click(screen.getByText('pool list'));
      expect(spinner()).toBeNull();

      // loading again, then leaving the tab: the last thing it reported is "not loading"
      pool.startLoading = true;
      await user.click(screen.getByRole('button', { name: /My Tasks/ }));
      expect(screen.queryByText('pool list')).toBeNull();
      expect(pool.reports.at(-1)).toBe(false);
      await user.click(screen.getByRole('button', { name: /Pool/ }));
      expect(spinner()).not.toBeNull();
      await user.click(screen.getByRole('button', { name: /My Tasks/ }));
      expect(pool.reports.at(-1)).toBe(false);
    } finally {
      pool.startLoading = false;
    }
  });
});
