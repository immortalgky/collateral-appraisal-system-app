import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { act, fireEvent } from '@testing-library/react';
import { render, screen, within } from '@/test/test-utils';
import { useAuthStore } from '@features/auth/store';

const useGetPoolTasks = vi.fn();
const lockMutate = vi.hoisted(() => vi.fn());
const claimMutate = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock('../api', () => ({
  useGetPoolTasks: (params: unknown, options: unknown) => useGetPoolTasks(params, options),
  // pending from the moment mutate is called, as the real mutation is
  useLockTask: () => {
    const [isPending, setPending] = useState(false);
    return {
      mutate: (...args: unknown[]) => {
        lockMutate(...args);
        setPending(true);
      },
      isPending,
    };
  },
  useClaimTask: () => {
    const [isPending, setPending] = useState(false);
    return {
      mutate: (...args: unknown[]) => {
        claimMutate(...args);
        setPending(true);
      },
      isPending,
    };
  },
}));
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
const useWorkflowHub = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useWorkflowHub', () => ({ useWorkflowHub }));
vi.mock('../hooks/usePoolKanbanRealtime', () => ({ usePoolKanbanRealtime: vi.fn() }));
vi.mock('../components/TaskKanbanBoard', () => ({ TaskKanbanBoard: () => <div>kanban</div> }));

import PoolTaskListPage from './PoolTaskListPage';

const item = (over: Record<string, unknown>) => ({
  id: 't1',
  appraisalId: 'a1',
  activityId: 'int-appraisal-execution',
  appraisalNumber: '69000001',
  customerName: 'Somchai Jaidee',
  status: 'InProgress',
  slaStatus: null,
  workingBy: null,
  lockedAt: null,
  ...over,
});

const props = {
  visibleColumns: ['appraisalNumber', 'status'] as const,
  colWidths: { appraisalNumber: 200, status: 120 },
  onColWidthChange: vi.fn(),
  viewMode: 'list' as const,
  groupBy: 'status' as const,
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
const threeStates = () =>
  useGetPoolTasks.mockReturnValue({
    data: {
      items: [
        item({ id: 't1', appraisalNumber: '69000001', assignedDate: ago(120) }),
        item({ id: 't2', appraisalNumber: '69000002', workingBy: 'me', lockedAt: ago(5) }),
        item({ id: 't3', appraisalNumber: '69000003', workingBy: 'other.user', lockedAt: ago(5) }),
      ],
      count: 3,
    },
    isLoading: false,
    isError: false,
  });
const row = (n: string) => screen.getByText(n).closest('tr')!;

beforeEach(() => {
  lockMutate.mockClear();
  navigate.mockClear();
  claimMutate.mockClear();
  useAuthStore.setState({
    user: { username: 'me', roles: ['Admin'], groups: ['IntAdmin'], teams: ['t-1'] } as never,
  });
  useGetPoolTasks.mockReturnValue({ data: undefined, isLoading: true, isError: false });
});

describe('PoolTaskListPage', () => {
  it('reports no count while the pool loads, and its total once it has answered', () => {
    const onCountChange = vi.fn();
    const { rerender } = render(
      <PoolTaskListPage
        {...props}
        visibleColumns={[...props.visibleColumns]}
        onCountChange={onCountChange}
      />,
    );
    expect(onCountChange).toHaveBeenLastCalledWith(null);
    expect(onCountChange).not.toHaveBeenCalledWith(0);

    useGetPoolTasks.mockReturnValue({
      data: { items: [item({})], count: 6 },
      isLoading: false,
      isError: false,
    });
    rerender(
      <PoolTaskListPage
        {...props}
        visibleColumns={[...props.visibleColumns]}
        onCountChange={onCountChange}
      />,
    );
    expect(onCountChange).toHaveBeenLastCalledWith(6);
  });

  it('marks a lock with an icon after the number, and keeps the number whole', () => {
    useGetPoolTasks.mockReturnValue({
      data: {
        items: [
          item({ id: 't1', workingBy: 'other.user', lockedAt: new Date().toISOString() }),
          item({ id: 't2', appraisalNumber: '69000002' }),
        ],
        count: 2,
      },
      isLoading: false,
      isError: false,
    });
    render(<PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />);

    const locked = screen.getByText('69000001').closest('td')!;
    const mark = within(locked).getByRole('img', { name: /Locked by other\.user/ });
    expect(mark).toHaveAttribute('title', expect.stringContaining('< 1 min ago'));
    expect(mark).toHaveClass('text-amber-600');
    // an icon, not a pill: no text of its own beside the number
    expect(mark).toHaveTextContent('');
    expect(within(screen.getByText('69000002').closest('td')!).queryByRole('img')).toBeNull();
  });

  it('opens a task on a click and on Enter: lock then open when free, straight in when yours, view only when not', () => {
    threeStates();
    render(<PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />);
    expect(row('69000001').hasAttribute('aria-selected')).toBe(false);

    fireEvent.keyDown(row('69000002'), { key: 'Enter' });
    expect(navigate).toHaveBeenLastCalledWith('/tasks/t2/opening');
    fireEvent.click(row('69000003'));
    expect(navigate).toHaveBeenLastCalledWith('/appraisals/a1');
    expect(lockMutate).not.toHaveBeenCalled();

    fireEvent.click(row('69000001'));
    expect(lockMutate).toHaveBeenCalledWith('t1', expect.anything());
    // the lock lands: the task opens, and the page that opens it can release the lock again
    lockMutate.mock.calls[0][1].onSuccess();
    expect(navigate).toHaveBeenLastCalledWith('/tasks/t1/opening', {
      state: { lockedTaskId: 't1' },
    });
  });

  it('does nothing else while a lock is in flight: no other lock, and no navigating away from it', () => {
    threeStates();
    render(<PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />);
    fireEvent.click(row('69000001'));
    expect(lockMutate).toHaveBeenCalledTimes(1);

    // continue (mine) and view (someone else's) would unmount the page before the lock's onSuccess
    fireEvent.click(row('69000002'));
    fireEvent.click(row('69000003'));
    fireEvent.keyDown(row('69000002'), { key: 'Enter' });
    expect(navigate).not.toHaveBeenCalled();
    expect(lockMutate).toHaveBeenCalledTimes(1);

    // once it has settled, the rows work again
    act(() => lockMutate.mock.calls[0][1].onSettled());
    fireEvent.click(row('69000002'));
    expect(navigate).toHaveBeenLastCalledWith('/tasks/t2/opening');
    fireEvent.click(row('69000003'));
    expect(navigate).toHaveBeenLastCalledWith('/appraisals/a1');
  });

  it('does the same while a claim is in flight, until it settles', async () => {
    threeStates();
    const { user } = render(
      <PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />,
    );
    fireEvent.contextMenu(row('69000001'));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to my tasks' }));
    expect(claimMutate).toHaveBeenCalledTimes(1);

    fireEvent.click(row('69000002'));
    fireEvent.click(row('69000003'));
    expect(navigate).not.toHaveBeenCalled();
    expect(lockMutate).not.toHaveBeenCalled();

    act(() => claimMutate.mock.calls[0][1].onSettled());
    fireEvent.click(row('69000002'));
    expect(navigate).toHaveBeenLastCalledWith('/tasks/t2/opening');
  });

  it('locks once for two activations in the same tick, before anything has re-rendered', () => {
    threeStates();
    render(<PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />);
    const free = row('69000001');
    act(() => {
      free.click();
      free.click();
      fireEvent.keyDown(free, { key: 'Enter' });
    });
    expect(lockMutate).toHaveBeenCalledTimes(1);
    // and once it has settled, the next one goes through
    act(() => lockMutate.mock.calls[0][1].onSettled());
    fireEvent.click(free);
    expect(lockMutate).toHaveBeenCalledTimes(2);
  });

  it('locks once for a fast double-click, and the number does the same as its row', () => {
    threeStates();
    render(<PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />);
    // the number is the teal link, and its click does not also fire the row's
    const number = screen.getByRole('button', { name: '69000002' });
    expect(number).toHaveClass('text-primary');
    fireEvent.click(number);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenLastCalledWith('/tasks/t2/opening');

    fireEvent.click(row('69000001'));
    fireEvent.click(row('69000001'));
    expect(lockMutate).toHaveBeenCalledTimes(1);
  });

  it('shows the gray dash, never the request number, when there is no appraisal number', () => {
    useGetPoolTasks.mockReturnValue({
      data: {
        items: [item({ appraisalNumber: null, requestNumber: 'REQ-105583-2569' })],
        count: 1,
      },
      isLoading: false,
      isError: false,
    });
    render(<PoolTaskListPage {...props} visibleColumns={['appraisalNumber', 'status']} />);
    const cell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0];
    expect(cell).toHaveTextContent(/^—Somchai Jaidee$/);
    expect(cell).not.toHaveTextContent('REQ-');
    expect(within(cell).queryByRole('button')).toBeNull();
  });

  it('opens the row menu on a right-click, with an action per lock state', async () => {
    threeStates();
    const { user } = render(
      <PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />,
    );
    const labels = async (n: string) => {
      fireEvent.contextMenu(row(n));
      const items = (await screen.findAllByRole('menuitem')).map(i => i.textContent);
      await user.keyboard('{Escape}');
      return items;
    };
    expect(await labels('69000001')).toEqual(['Start', 'Move to my tasks']);
    expect(await labels('69000002')).toEqual(['Continue', 'Move to my tasks']);
    expect(await labels('69000003')).toEqual(['View only', 'Move to my tasks']);
    // a rule between the way in and the take-out
    fireEvent.contextMenu(row('69000001'));
    await screen.findAllByRole('menuitem');
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(lockMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('menuitem', { name: 'Start' }));
    expect(lockMutate).toHaveBeenCalledWith('t1', expect.anything());
  });

  it('takes one task out at a time: a second take-out or a lock waits for the first', async () => {
    threeStates();
    const { user } = render(
      <PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />,
    );
    fireEvent.contextMenu(row('69000001'));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to my tasks' }));
    expect(claimMutate).toHaveBeenCalledTimes(1);
    expect(claimMutate).toHaveBeenCalledWith('t1', expect.anything());

    // while it is in flight: another row's take-out and a lock do nothing, and t1's menu stays busy
    fireEvent.contextMenu(row('69000003'));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to my tasks' }));
    fireEvent.click(row('69000001'));
    expect(claimMutate).toHaveBeenCalledTimes(1);
    expect(lockMutate).not.toHaveBeenCalled();
    expect(within(row('69000001')).getByRole('button', { name: 'Actions' })).toBeDisabled();
    expect(within(row('69000003')).getByRole('button', { name: 'Actions' })).toBeEnabled();
  });

  it('knows whose lock it is whatever the case of the username, as the backend does', () => {
    useGetPoolTasks.mockReturnValue({
      data: {
        items: [item({ id: 't2', appraisalNumber: '69000002', workingBy: 'ME', lockedAt: ago(5) })],
        count: 1,
      },
      isLoading: false,
      isError: false,
    });
    render(
      <PoolTaskListPage {...props} visibleColumns={['appraisalNumber', 'lockState', 'status']} />,
    );
    expect(within(row('69000002')).getByText("You're working on it")).toBeInTheDocument();
    expect(row('69000002').className).toContain('bg-blue-50');
    // so a click continues the task (no new lock) rather than showing it read-only
    fireEvent.click(row('69000002'));
    expect(navigate).toHaveBeenLastCalledWith('/tasks/t2/opening');
    expect(lockMutate).not.toHaveBeenCalled();
  });

  it("listens to the pool channels of the user's groups, not of the roles", () => {
    threeStates();
    render(<PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />);
    expect(useWorkflowHub).toHaveBeenLastCalledWith(
      expect.objectContaining({ poolGroups: ['IntAdmin', 'IntAdmin:Team_t-1'] }),
    );
  });

  it('keeps only the SLA bars in the footer legend: the pickup column says who holds a task', () => {
    threeStates();
    render(<PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />);
    expect(screen.getByText('Over SLA')).toBeInTheDocument();
    expect(screen.getByText('At risk of SLA')).toBeInTheDocument();
    expect(screen.queryByText(/Click to open/)).toBeNull();
    expect(screen.queryByText("You're working on it")).toBeNull();
  });

  it('shows who holds each task in the pickup column: free, you, or someone else', () => {
    threeStates();
    render(
      <PoolTaskListPage {...props} visibleColumns={['appraisalNumber', 'lockState', 'status']} />,
    );
    const cell = (n: string) => within(row(n)).getAllByRole('cell')[1];

    expect(cell('69000001')).toHaveTextContent('FreeAdded to pool 2 hours ago');
    expect(cell('69000001').querySelector('.bg-green-600')).not.toBeNull();
    expect(cell('69000002')).toHaveTextContent("You're working on itLocked 5 minutes ago");
    expect(within(cell('69000002')).getByText("You're working on it").parentElement).toHaveClass(
      'text-blue-600',
    );
    expect(cell('69000003')).toHaveTextContent('other.user is working on itLocked 5 minutes ago');
    expect(
      within(cell('69000003')).getByText('other.user is working on it').parentElement,
    ).toHaveClass('text-amber-600');
    // someone else's task: no tint, the text is muted
    expect(row('69000003').className).not.toContain('amber');
    expect(cell('69000003').className).toContain('text-gray-500');
  });

  it('does not query the table while the board is showing', () => {
    render(
      <PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} viewMode="grid" />,
    );
    expect(useGetPoolTasks).toHaveBeenLastCalledWith(expect.anything(), {
      enabled: false,
    });
    expect(screen.getByText('kanban')).toBeInTheDocument();
  });

  it('loses only the table when the pool query fails: the board is still there', () => {
    useGetPoolTasks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    });
    const { rerender } = render(
      <PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} />,
    );
    expect(screen.getByText('Failed to load pool tasks')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();

    rerender(
      <PoolTaskListPage {...props} visibleColumns={[...props.visibleColumns]} viewMode="grid" />,
    );
    expect(screen.getByText('kanban')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load pool tasks')).toBeNull();
  });

  it('reports no count while the board is showing, even with table data cached', () => {
    useGetPoolTasks.mockReturnValue({
      data: { items: [item({})], count: 6 },
      isLoading: false,
      isError: false,
    });
    const onCountChange = vi.fn();
    render(
      <PoolTaskListPage
        {...props}
        visibleColumns={[...props.visibleColumns]}
        viewMode="grid"
        onCountChange={onCountChange}
      />,
    );
    expect(onCountChange).toHaveBeenLastCalledWith(null);
  });

  it('reports loading while the pool loads, and clears it when the page goes away', () => {
    const onLoadingChange = vi.fn();
    const { unmount } = render(
      <PoolTaskListPage
        {...props}
        visibleColumns={[...props.visibleColumns]}
        onLoadingChange={onLoadingChange}
      />,
    );
    expect(onLoadingChange).toHaveBeenCalledWith(true);
    unmount();
    expect(onLoadingChange).toHaveBeenLastCalledWith(false);
  });
});
