import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import RequestListingPage from './RequestListingPage';

const useGetRequests = vi.fn();
const navigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

vi.mock('../api', () => ({
  useGetRequests: (params: unknown) => useGetRequests(params),
  useDeleteRequest: () => ({ mutate: vi.fn() }),
}));

const row = (over: Record<string, unknown>) => ({
  id: 'id-1',
  requestNumber: 'REQ-1',
  status: 'Draft',
  priority: 'Normal',
  channel: 'Manual',
  purpose: null,
  customerName: 'Somchai',
  contactNumber: '0812345678',
  createdAt: '2026-10-09T10:00:00',
  ...over,
});

const respond = (items: unknown[], count = items.length) =>
  useGetRequests.mockReturnValue({
    data: { items, count },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  });

const lastParams = () => useGetRequests.mock.calls.at(-1)![0];

describe('RequestListingPage', () => {
  beforeEach(() => {
    useGetRequests.mockReset();
    navigate.mockReset();
  });

  it('shows created date descending as the active sort and sends no sort params', () => {
    respond([row({})]);
    render(<RequestListingPage />);
    expect(screen.getByRole('columnheader', { name: /Created At/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(lastParams().sortBy).toBeUndefined();
  });

  it('only offers sorting on columns the API can order by', () => {
    respond([row({})]);
    render(<RequestListingPage />);
    expect(screen.queryByRole('columnheader', { name: 'Priority' })).toBeNull();
    for (const name of ['Channel', 'Actions']) {
      const th = screen.getByRole('columnheader', { name });
      expect(within(th).queryByRole('button')).toBeNull();
    }
  });

  it('cycles a column asc -> desc -> default, and the header always matches the params', async () => {
    respond([row({})]);
    const { user } = render(<RequestListingPage />);
    const th = () => screen.getByRole('columnheader', { name: /Request #/ });

    await user.click(within(th()).getByRole('button'));
    expect(lastParams()).toMatchObject({ sortBy: 'requestNumber', sortDirection: 'asc' });
    expect(th()).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(th()).getByRole('button'));
    expect(lastParams()).toMatchObject({ sortBy: 'requestNumber', sortDirection: 'desc' });

    await user.click(within(th()).getByRole('button'));
    expect(lastParams().sortBy).toBeUndefined();
    expect(th()).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: /Created At/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('flips created date to ascending instead of clearing into the same order', async () => {
    respond([row({})]);
    const { user } = render(<RequestListingPage />);
    const th = () => screen.getByRole('columnheader', { name: /Created At/ });

    await user.click(within(th()).getByRole('button'));
    expect(lastParams()).toMatchObject({ sortBy: 'createdAt', sortDirection: 'asc' });
    expect(th()).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(th()).getByRole('button'));
    expect(lastParams().sortBy).toBeUndefined();
    expect(th()).toHaveAttribute('aria-sort', 'descending');
  });

  it('segments apply the status filter, and counts are exact', async () => {
    respond([row({}), row({ id: 'id-2', status: 'New' }), row({ id: 'id-3', status: 'Draft' })]);
    const { user } = render(<RequestListingPage />);
    const group = screen.getByRole('group', { name: 'Filter by status' });
    expect(within(group).getByRole('button', { name: /All/ })).toHaveTextContent('3');
    expect(within(group).getByRole('button', { name: /Draft/ })).toHaveTextContent('2');
    expect(within(group).getByRole('button', { name: /New/ })).toHaveTextContent('1');

    await user.click(within(group).getByRole('button', { name: /Draft/ }));
    expect(lastParams().status).toBe('Draft');
    expect(within(group).getByRole('button', { name: /Draft/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Only the selected segment keeps a count once the result is filtered.
    expect(within(group).getByRole('button', { name: /New/ })).not.toHaveTextContent('1');
  });

  it('flags only urgent requests and offers delete only on pre-submit ones', () => {
    respond([
      row({ priority: 'High' }),
      row({ id: 'id-2', requestNumber: 'REQ-2', status: 'Submitted' }),
    ]);
    render(<RequestListingPage />);
    expect(screen.getAllByText('Urgent')).toHaveLength(1);
    // The badge sits beside the request number, in the same cell.
    expect(screen.getByRole('link', { name: 'REQ-1' }).closest('td')).toHaveTextContent('Urgent');
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
  });

  it('opens the request from the row, not only from the number', async () => {
    respond([row({})]);
    const { user } = render(<RequestListingPage />);
    expect(screen.getByRole('link', { name: 'REQ-1' })).toHaveAttribute('href', '/requests/id-1');
    await user.click(screen.getByText('Somchai'));
    expect(navigate).toHaveBeenCalledWith('/requests/id-1');

    navigate.mockReset();
    screen.getByText('Somchai').closest('tr')!.focus();
    await user.keyboard('{Enter}');
    expect(navigate).toHaveBeenCalledWith('/requests/id-1');
  });

  it('offers to clear the filters when nothing matches', async () => {
    respond([], 0);
    const { user } = render(<RequestListingPage />);
    expect(screen.getByText('No requests found')).toBeInTheDocument();

    await user.click(
      within(screen.getByRole('group', { name: 'Filter by status' })).getByRole('button', {
        name: /Draft/,
      }),
    );
    expect(lastParams().status).toBe('Draft');
    expect(screen.getByText('No requests match the filters')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Clear filters' }).at(-1)!);
    expect(lastParams().status).toBeUndefined();
    expect(screen.getByText('No requests found')).toBeInTheDocument();
  });
});
