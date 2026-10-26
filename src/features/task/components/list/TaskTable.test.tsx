import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { fireEvent } from '@testing-library/react';
import { render, screen, waitFor, within } from '@/test/test-utils';
import type { Task } from '../../types';
import type { ColumnKey } from '../../config/columnDefs';
import { TaskTable } from './TaskTable';

const task = (over: Partial<Task>): Task => ({
  id: 't1',
  taskId: null,
  appraisalId: 'a1',
  requestId: 'r1',
  workflowInstanceId: 'w1',
  activityId: 'int-appraisal-execution',
  appraisalNumber: '69000001',
  requestNumber: 'REQ-1',
  channel: null,
  customerName: 'Somchai Jaidee',
  taskType: null,
  taskDescription: null,
  purpose: null,
  propertyType: null,
  status: 'InProgress',
  appointmentDateTime: null,
  assigneeUserId: null,
  requestedAt: null,
  receivedDate: null,
  movement: null,
  priority: null,
  dueAt: null,
  slaStatus: null,
  slaDurationHours: null,
  elapsedHours: null,
  remainingHours: null,
  requestedBy: null,
  requestedByName: null,
  requestReceivedDate: null,
  internalFollowupStaff: null,
  appraiser: null,
  appraiserCompanyNameLocal: null,
  assignedDate: null,
  reportReceivedAt: null,
  workingBy: null,
  lockedAt: null,
  assignedType: null,
  pendingTaskStatus: null,
  ...over,
});

const tasks = [
  task({ id: 't1', appraisalNumber: '69000001', slaStatus: 'Breached' }),
  task({ id: 't2', appraisalNumber: '69000002', slaStatus: 'OnTime' }),
];
const columns: ColumnKey[] = ['appraisalNumber', 'requestNumber', 'status', 'priority'];
const widths = { appraisalNumber: 200, requestNumber: 100, status: 120, priority: 110 };

const setup = (props: Partial<React.ComponentProps<typeof TaskTable>> = {}) => {
  const onOpen = vi.fn();
  const onSelect = vi.fn();
  const utils = render(
    <TaskTable
      tasks={tasks}
      isLoading={false}
      visibleColumns={columns}
      pinnedColumns={['appraisalNumber', 'requestNumber']}
      widths={widths}
      onWidthChange={vi.fn()}
      sortField={null}
      sortDirection="asc"
      onSort={vi.fn()}
      onOpen={onOpen}
      menuItems={() => [{ key: 'copy', label: 'Copy number', icon: 'copy', onSelect }]}
      emptyState={<p>nothing here</p>}
      {...props}
    />,
  );
  return { onOpen, onSelect, ...utils };
};

const row = (n: string) => screen.getByText(n).closest('tr')!;

describe('TaskTable', () => {
  it('sticks the pinned columns, each after the width of those before it, with a divider after the last', () => {
    setup();
    const [first, second, third] = screen.getAllByRole('columnheader');
    expect(first.style.left).toBe('0px');
    expect(second.style.left).toBe('200px');
    expect(third.style.left).toBe('');
    expect(first.className).toContain('sticky');
    expect(third.className).not.toContain('z-20');

    const cells = within(row('69000002')).getAllByRole('cell');
    expect(cells[1].style.left).toBe('200px');
    expect(cells[1].className).toContain('bg-inherit');
    expect(cells[1].className).toContain('inset_-1px_0_0');
    expect(cells[0].className).not.toContain('inset_-1px_0_0');
  });

  it('marks a breached SLA with a bar on the first cell only, and does not tint the row', () => {
    setup();
    const breached = within(row('69000001')).getAllByRole('cell');
    expect(breached[0].className).toContain('inset_3px_0_0_var(--color-red-500)');
    expect(breached[2].className).not.toContain('red-500');
    expect(row('69000001').className).not.toContain('red');
    const ok = within(row('69000002')).getAllByRole('cell');
    expect(ok[0].className).not.toContain('inset_3px');
  });

  it('marks an at-risk SLA with an amber bar on the first cell, no row tint', () => {
    setup({ tasks: [task({ slaStatus: 'AtRisk' })] });
    const cells = within(row('69000001')).getAllByRole('cell');
    expect(cells[0].className).toContain('inset_3px_0_0_var(--color-amber-500)');
    expect(cells[1].className).not.toContain('amber');
    expect(row('69000001').className).not.toContain('amber');
  });

  it('shares the first cell with the divider when the first column is also the last sticky one', () => {
    setup({ pinnedColumns: ['appraisalNumber'], tasks: [task({ slaStatus: 'Breached' })] });
    const first = within(row('69000001')).getAllByRole('cell')[0];
    expect(first.className).toContain(
      'shadow-[inset_3px_0_0_var(--color-red-500),inset_-1px_0_0_var(--color-gray-100)]',
    );
  });

  it('lets pinned columns stick only while they stay within half of the scroll box', () => {
    // the scroll box is 500px: 200 (appraisal number) fits in 250, adding 100 more does not
    const proto = HTMLElement.prototype;
    const original = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.className.includes('overflow-auto') ? 500 : 0;
      },
    });
    try {
      setup();
      const [first, second] = screen.getAllByRole('columnheader');
      expect(first.style.left).toBe('0px');
      expect(second.style.left).toBe('');
      expect(second.className).not.toContain('z-20');
      const cells = within(row('69000002')).getAllByRole('cell');
      expect(cells[0].className).toContain('sticky');
      // not sticky, but still second in the row: it scrolls with the table
      expect(cells[1].className).not.toContain('sticky');
      // the divider closes the sticky block, not the pinned one
      expect(cells[0].className).toContain('inset_-1px_0_0');
      expect(cells[1].className).not.toContain('inset_-1px_0_0');
    } finally {
      if (original) Object.defineProperty(proto, 'clientWidth', original);
    }
  });

  it('shows the customer under the number only while the customer name column is not showing it', () => {
    setup({ visibleColumns: ['appraisalNumber', 'customerName'] });
    const cells = within(row('69000001')).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent(/^69000001$/);
    expect(cells[1]).toHaveTextContent('Somchai Jaidee');
  });

  it('draws an empty value from a parameter column as the grey dash', () => {
    setup({ visibleColumns: ['appraisalNumber', 'purpose'], tasks: [task({ purpose: null })] });
    const dash = within(row('69000001')).getAllByRole('cell')[1].querySelector('span');
    expect(dash).toHaveTextContent('—');
    expect(dash).toHaveClass('text-(--palette-gray-400)');
  });

  it('puts the customer under the appraisal number', () => {
    setup({ tasks: [task({ customerName: 'Somchai Jaidee' })] });
    const cell = within(row('69000001')).getAllByRole('cell')[0];
    expect(cell).toHaveTextContent('69000001Somchai Jaidee');
  });

  it('opens a task on a click and on Enter on the row, not on Enter inside it', () => {
    const { onOpen } = setup();
    fireEvent.click(row('69000001'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenLastCalledWith(tasks[0]);

    fireEvent.keyDown(row('69000002'), { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(2);

    // Enter on the number link is the link's own business
    fireEvent.keyDown(screen.getByRole('link', { name: '69000002' }), { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('link', { name: '69000002' }));
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(row('69000001')).toHaveAttribute('tabindex', '0');
  });

  it('opens the row menu on a right-click and on Shift+F10, without opening the row', async () => {
    const { onOpen, onSelect, user } = setup();
    fireEvent.contextMenu(row('69000001'));
    await user.click(await screen.findByRole('menuitem', { name: 'Copy number' }));
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(row('69000002'), { key: 'F10', shiftKey: true });
    expect(await screen.findByRole('menuitem', { name: 'Copy number' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(onOpen).not.toHaveBeenCalled();
  });

  describe('right-click on a row', () => {
    const actions = (n: string) => within(row(n)).getByRole('button', { name: 'Actions' });
    const rightClick = (user: ReturnType<typeof setup>['user'], n: string) =>
      user.pointer({ keys: '[MouseRight]', target: row(n) });
    const closed = () => waitFor(() => expect(screen.queryByRole('menuitem')).toBeNull());
    const opened = async () =>
      expect(await screen.findByRole('menuitem', { name: 'Copy number' })).toBeInTheDocument();

    it('opens the menu after the ⋮ was used and closed with Escape, an outside click or a choice', async () => {
      const { user } = setup();
      await user.click(actions('69000001'));
      await screen.findByRole('menuitem');
      await user.keyboard('{Escape}');
      await closed();
      await rightClick(user, '69000001');
      await opened();
      await user.keyboard('{Escape}');
      await closed();

      fireEvent.keyDown(row('69000001'), { key: 'F10', shiftKey: true });
      await opened();
      await user.keyboard('{Escape}');
      await closed();

      await user.click(actions('69000001'));
      await screen.findByRole('menuitem');
      await user.click(document.body);
      await closed();
      await rightClick(user, '69000001');
      await opened();
      await user.click(screen.getByRole('menuitem', { name: 'Copy number' }));
      await closed();

      await user.click(actions('69000001'));
      await user.click(await screen.findByRole('menuitem', { name: 'Copy number' }));
      await closed();
      await rightClick(user, '69000001');
      await opened();
    });

    it('moves from one row to another, and reopens on the same row', async () => {
      const { user } = setup();
      await rightClick(user, '69000001');
      await opened();
      // another row while the first menu is open: that row's menu, and only one
      await rightClick(user, '69000002');
      await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(1));
      expect(actions('69000002')).toHaveAttribute('aria-expanded', 'true');
      expect(actions('69000001')).toHaveAttribute('aria-expanded', 'false');
      // and the same row again
      await rightClick(user, '69000002');
      await opened();
      expect(actions('69000002')).toHaveAttribute('aria-expanded', 'true');
    });

    it('leaves the rest of the page live while a menu is open: nothing is inert, so the next right-click lands', async () => {
      const { user } = setup();
      await rightClick(user, '69000001');
      await opened();
      expect(document.querySelector('[inert]')).toBeNull();
    });
  });

  it('shows the gray dash, never the request number, for a task with no appraisal number', () => {
    setup({ tasks: [task({ appraisalNumber: null, requestNumber: 'REQ-105583-2569' })] });
    const cell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0];
    expect(cell).toHaveTextContent(/^—Somchai Jaidee$/);
    // (the request number column, where there is one, still shows it)
    expect(cell).not.toHaveTextContent('REQ-105583-2569');
    expect(within(cell).queryByRole('link')).toBeNull();
  });

  it('draws the keyboard focus on the cells, over the SLA bar and the divider, not as a row tint', () => {
    setup({ pinnedColumns: ['appraisalNumber'] });
    const r = row('69000001');
    expect(r.className).toContain('group');
    expect(r.className).not.toContain('bg-primary-50');
    const cells = within(r).getAllByRole('cell');
    for (const c of cells) {
      expect(c.className).toContain('group-focus-visible:after:border-y-2');
      expect(c.className).toContain('after:absolute');
    }
    // the breached task's first cell keeps its red bar and gets no left focus edge
    expect(cells[0].className).toContain('red-500');
    expect(cells[0].className).not.toContain('after:border-l-2');
    // the one without a bar gets the left edge; the ⋮ cell closes the ring on the right
    expect(within(row('69000002')).getAllByRole('cell')[0].className).toContain(
      'group-focus-visible:after:border-l-2',
    );
    expect(cells[cells.length - 1].className).toContain('group-focus-visible:after:border-r-2');
    // every cell is positioned, so the ring sits inside its own cell
    expect(cells[2].className).toContain('relative');
  });

  it('mutes the text of a task someone else holds, with no tint, and tints your own blue', () => {
    setup({ rowTone: t => (t.id === 't1' ? 'other' : 'self') });
    expect(row('69000001').className).not.toContain('amber');
    expect(within(row('69000001')).getAllByRole('cell')[1].className).toContain('text-gray-500');
    expect(row('69000002').className).toContain('bg-blue-50');
    expect(within(row('69000002')).getAllByRole('cell')[1].className).toContain('text-gray-600');
  });

  it('names a task with no activity id by its own text, or the dash, never "activity.null"', () => {
    setup({
      visibleColumns: ['appraisalNumber', 'taskType'],
      tasks: [
        task({ id: 't1', appraisalNumber: '69000001', activityId: null as never, taskType: 'Odd' }),
        task({ id: 't2', appraisalNumber: '69000002', activityId: null as never }),
      ],
    });
    expect(within(row('69000001')).getAllByRole('cell')[1]).toHaveTextContent('Odd');
    expect(within(row('69000002')).getAllByRole('cell')[1]).toHaveTextContent('—');
    expect(screen.queryByText(/activity\.null/)).toBeNull();
  });

  it('never collapses a column that has no width in the layout', () => {
    setup({ widths: { appraisalNumber: 200 } });
    const cols = document.querySelectorAll('colgroup col');
    expect([...cols].map(c => (c as HTMLElement).style.width)).not.toContain('0px');
  });

  it('runs a menu action without opening the row', async () => {
    const { onOpen, onSelect, user } = setup();
    await user.click(within(row('69000001')).getByRole('button', { name: 'Actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Copy number' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('shows a dash, not an empty avatar, for a requester with a blank name', () => {
    setup({
      visibleColumns: ['appraisalNumber', 'requestedBy'],
      tasks: [task({ requestedByName: '  ', requestedBy: null })],
    });
    const cell = within(row('69000001')).getAllByRole('cell')[1];
    expect(cell).toHaveTextContent('—');
    expect(cell.querySelector('span.rounded-full')).toBeNull();
  });

  it('dims stale rows and marks the table busy, with the transition always on', () => {
    const { rerender } = setup({ isStale: true });
    const box = () => screen.getAllByRole('table')[0].parentElement!;
    expect(box()).toHaveAttribute('aria-busy', 'true');
    expect(box().className).toContain('opacity-60');
    expect(box().className).toContain('transition-opacity');
    rerender(
      <TaskTable
        tasks={tasks}
        isLoading={false}
        visibleColumns={columns}
        pinnedColumns={[]}
        widths={widths}
        onWidthChange={vi.fn()}
        sortField={null}
        sortDirection="asc"
        onSort={vi.fn()}
        onOpen={vi.fn()}
        menuItems={() => []}
        emptyState={<p>nothing here</p>}
      />,
    );
    expect(box()).toHaveAttribute('aria-busy', 'false');
    expect(box().className).not.toContain('opacity-60');
    expect(box().className).toContain('transition-opacity');
  });

  it('shows an em dash for what is empty and the empty state when there are no rows', () => {
    const { rerender } = setup({ tasks: [task({ customerName: null })] });
    expect(within(row('69000001')).getAllByRole('cell')[0]).toHaveTextContent('69000001—');
    rerender(
      <TaskTable
        tasks={[]}
        isLoading={false}
        visibleColumns={columns}
        pinnedColumns={[]}
        widths={widths}
        onWidthChange={vi.fn()}
        sortField={null}
        sortDirection="asc"
        onSort={vi.fn()}
        onOpen={vi.fn()}
        menuItems={() => []}
        emptyState={<p>nothing here</p>}
      />,
    );
    expect(screen.getByText('nothing here')).toBeTruthy();
    expect(screen.getAllByRole('columnheader').length).toBe(columns.length + 1);
  });
});
