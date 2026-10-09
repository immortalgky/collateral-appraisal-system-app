import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FailedMessagesPage from './FailedMessagesPage';

type ListState = { data?: { items: unknown[]; count: number }; isPlaceholderData: boolean };

// What the (mocked) list hooks return — each test sets it, then rerenders.
const state = vi.hoisted(() => ({
  list: { data: undefined, isPlaceholderData: false } as ListState,
  lastParams: undefined as { search?: string } | undefined,
}));

const listQuery = () => ({
  ...state.list,
  isLoading: !state.list.data,
  isError: false,
  refetch: vi.fn(),
});

vi.mock('../api/failedMessages', () => ({
  failedMessageKeys: { detail: () => [] },
  useGetFailedMessages: (params: { search?: string }) => {
    state.lastParams = params;
    return listQuery();
  },
  useGetFailedMessagesSummary: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    dataUpdatedAt: 0,
  }),
}));
vi.mock('../api/outboxMessages', () => ({
  outboxMessageKeys: { detail: () => [] },
  useGetOutboxMessages: () => ({ ...listQuery(), data: undefined }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@shared/hooks/useHasPermission', () => ({ useHasPermission: () => true }));
vi.mock('@shared/hooks/useMenuLabel', () => ({ useMenuLabel: () => undefined }));
vi.mock('@shared/components/sections/SectionHeader', () => ({ default: () => null }));
// Stand-ins that expose just the props this feature's wiring is about.
vi.mock('@shared/components/Pagination', () => ({
  default: (p: {
    currentPage: number;
    totalCount: number;
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="pager" data-page={p.currentPage} data-total={p.totalCount}>
      <button onClick={() => p.onPageChange(p.currentPage + 1)}>next</button>
    </div>
  ),
}));
vi.mock('../components/ConsumerFailuresTable', () => ({
  default: (p: {
    isLoading: boolean;
    selectionDisabled?: boolean;
    items: unknown[];
    onToggleRow: (item: unknown) => void;
  }) => (
    <div
      data-testid="table"
      data-loading={String(p.isLoading)}
      data-selection-disabled={String(!!p.selectionDisabled)}
    >
      <button onClick={() => p.onToggleRow(p.items[0])}>select-first</button>
    </div>
  ),
}));
vi.mock('../components/OutboxFailuresTable', () => ({ default: () => null }));
vi.mock('../components/BulkActionBar', () => ({
  default: (p: { disabled?: boolean }) => (
    <div data-testid="bulk" data-disabled={String(!!p.disabled)} />
  ),
}));
type SummaryFlags = { isLoading: boolean; isError: boolean };
vi.mock('../components/SummaryStrip', () => ({
  default: (p: SummaryFlags) => (
    <div data-testid="strip" data-loading={String(p.isLoading)} data-error={String(p.isError)} />
  ),
}));
vi.mock('../components/QueueHealthPanel', () => ({
  default: (p: SummaryFlags) => (
    <div data-testid="health" data-loading={String(p.isLoading)} data-error={String(p.isError)} />
  ),
}));
vi.mock('../components/TopGroupChips', () => ({ default: () => null }));
vi.mock('../components/SourceSwitch', () => ({ default: () => null }));
vi.mock('../components/FailedMessageDrawer', () => ({ default: () => null }));
vi.mock('../components/OutboxMessageDrawer', () => ({ default: () => null }));
vi.mock('../components/ConfirmActionDialog', () => ({ default: () => null }));

const page = (count: number, isPlaceholderData = false): ListState => ({
  data: { items: [], count },
  isPlaceholderData,
});

const pageWithRow = (): ListState => ({
  data: { items: [{ id: 'row-1', status: 'Pending' }], count: 1 },
  isPlaceholderData: false,
});

const renderPage = () => {
  const client = new QueryClient();
  // A fresh element each time — re-rendering the identical element would bail out of the update.
  const ui = () => (
    <QueryClientProvider client={client}>
      <FailedMessagesPage />
    </QueryClientProvider>
  );
  const view = render(ui());
  return { container: view.container, rerenderPage: () => view.rerender(ui()) };
};

const pager = () => screen.getByTestId('pager');

describe('FailedMessagesPage list placeholder data', () => {
  beforeEach(() => {
    state.list = page(100); // 5 pages
  });

  it('keeps the pager and table mounted, and locks selection, while a page change is in flight', () => {
    const { rerenderPage } = renderPage();
    expect(screen.getByTestId('table').dataset.selectionDisabled).toBe('false');

    // The click moves to page 2; the list then reports the previous page's data as placeholder.
    act(() => screen.getByText('next').click());
    state.list = page(100, true);
    rerenderPage();

    expect(pager().dataset.total).toBe('100');
    expect(pager().dataset.page).toBe('1');
    expect(screen.getByTestId('table').dataset.loading).toBe('false');
    expect(screen.getByTestId('table').dataset.selectionDisabled).toBe('true');
    expect(screen.getByTestId('bulk').dataset.disabled).toBe('true');

    state.list = page(100);
    rerenderPage();
    expect(screen.getByTestId('table').dataset.selectionDisabled).toBe('false');
    expect(screen.getByTestId('bulk').dataset.disabled).toBe('false');
  });

  it('never clamps the page against placeholder totals, only against fresh ones', () => {
    const { rerenderPage } = renderPage();
    for (let i = 0; i < 3; i++) act(() => screen.getByText('next').click()); // page 4 (index 3)
    expect(pager().dataset.page).toBe('3');

    // Stale placeholder says there is only 1 page — clamping on it would wrongly yank to page 1.
    state.list = page(5, true);
    rerenderPage();
    expect(pager().dataset.page).toBe('3');

    // The same total as fresh data does clamp.
    state.list = page(5);
    rerenderPage();
    expect(pager().dataset.page).toBe('0');
  });
});

describe('FailedMessagesPage bulk bar clearance', () => {
  it('adds bottom padding for the fixed bulk bar only while rows are selected', () => {
    state.list = pageWithRow();
    const { container } = renderPage();
    const root = container.firstElementChild!;
    expect(root).toHaveClass('pb-8');
    expect(root).not.toHaveClass('pb-32');

    act(() => screen.getByText('select-first').click());
    expect(root).toHaveClass('pb-32');

    act(() => screen.getByText('select-first').click()); // toggled off
    expect(root).toHaveClass('pb-8');
  });
});

describe('FailedMessagesPage selection vs search', () => {
  it('does not bring a selection back when the search returns to its old term', async () => {
    state.list = pageWithRow();
    const { container } = renderPage();
    const root = container.firstElementChild!;
    const search = screen.getByLabelText('filters.searchLabel');

    act(() => screen.getByText('select-first').click());
    expect(root).toHaveClass('pb-32');

    fireEvent.change(search, { target: { value: 'abc' } });
    await waitFor(() => expect(state.lastParams?.search).toBe('abc'));
    expect(root).toHaveClass('pb-8');

    fireEvent.change(search, { target: { value: '' } });
    await waitFor(() => expect(state.lastParams?.search).toBeUndefined());
    expect(root).toHaveClass('pb-8');
    expect(root).not.toHaveClass('pb-32');
  });
});

describe('FailedMessagesPage active tab', () => {
  it('keeps the page and the selection when the already-active tab is clicked', () => {
    state.list = {
      data: { items: [{ id: 'row-1', status: 'Pending' }], count: 100 },
      isPlaceholderData: false,
    };
    const { container } = renderPage();
    const root = container.firstElementChild!;
    act(() => screen.getByText('next').click());
    act(() => screen.getByText('select-first').click());
    expect(pager().dataset.page).toBe('1');
    expect(root).toHaveClass('pb-32');

    act(() => screen.getByRole('tab', { name: /^tabs\.pending/ }).click()); // already active
    expect(pager().dataset.page).toBe('1');
    expect(root).toHaveClass('pb-32');

    act(() => screen.getByRole('tab', { name: /^tabs\.all/ }).click()); // a different tab resets
    expect(pager().dataset.page).toBe('0');
    expect(root).toHaveClass('pb-8');
  });
});

describe('FailedMessagesPage summary with no data and no error (paused query)', () => {
  it('tells the strip and the health panel it is loading, not failed', () => {
    state.list = page(0);
    renderPage();
    for (const id of ['strip', 'health']) {
      expect(screen.getByTestId(id).dataset.loading).toBe('true');
      expect(screen.getByTestId(id).dataset.error).toBe('false');
    }
  });
});
