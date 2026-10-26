import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';

const useGetTasks = vi.fn();

vi.mock('../api', () => ({
  useGetTasks: (params: unknown) => useGetTasks(params),
  useGetTaskCounts: () => ({ data: new Map() }),
}));
vi.mock('../pages/PoolTaskListPage', () => ({ default: () => <div>pool list</div> }));
vi.mock('./TaskKanbanBoard', () => ({ TaskKanbanBoard: () => <div>kanban</div> }));

import { ActivityTaskTable } from './ActivityTaskTable';

const items = [{ id: 't1', activityId: 'int-appraisal-execution', appraisalNumber: '69000001' }];
const renderIt = () =>
  render(
    <ActivityTaskTable activityId="int-appraisal-execution" title="Execution" description="d" />,
    { initialEntries: ['/tasks?activityId=int-appraisal-execution'] },
  );

describe('ActivityTaskTable', () => {
  it('shows its rows once the list has answered', () => {
    useGetTasks.mockReturnValue({ data: { items, count: 1 }, isLoading: false, isError: false });
    renderIt();
    expect(screen.getByText('69000001')).toBeInTheDocument();
  });

  it('shows the skeleton, not the last page, while a page change loads (the placeholder is not a result)', () => {
    useGetTasks.mockReturnValue({
      data: { items, count: 60 },
      isLoading: false,
      isPlaceholderData: true,
      isError: false,
    });
    renderIt();
    expect(screen.queryByText('69000001')).toBeNull();
    expect(document.querySelector('tbody tr.animate-pulse')).not.toBeNull();
  });

  it('names an active filter chip from the translations, not from a hard-coded English word', () => {
    useGetTasks.mockReturnValue({ data: { items, count: 1 }, isLoading: false, isError: false });
    render(
      <ActivityTaskTable activityId="int-appraisal-execution" title="Execution" description="d" />,
      { initialEntries: ['/tasks?activityId=int-appraisal-execution&slaStatus=Breached'] },
    );
    expect(screen.getByText('SLA:')).toBeInTheDocument();
    expect(screen.queryByText(/filterChips\./)).toBeNull();
  });
});
