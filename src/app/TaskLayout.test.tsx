import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { useAuthStore } from '@features/auth/store';
import type { PoolTaskUpdateEvent } from '@features/task/hooks/useWorkflowHub';
import TaskLayout from './TaskLayout';

let onUpdate: (event: PoolTaskUpdateEvent) => void;
vi.mock('@features/task/hooks/useWorkflowHub', () => ({
  useWorkflowHub: (opts: { onPoolTaskUpdate: typeof onUpdate }) => {
    onUpdate = opts.onPoolTaskUpdate;
  },
}));

// Task errored -> TaskLayout renders only its small "Task Not Found" body, so no sidebar/menu wiring.
vi.mock('@features/appraisal/api/workflow', () => ({
  useGetTaskById: () => ({ data: undefined, isLoading: false, isError: true, error: null }),
}));
vi.mock('@features/appraisal/api/appraisal', () => ({
  useGetAppraisalById: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock('@features/request/api/requests', () => ({
  useGetRequestById: () => ({ data: undefined }),
}));
vi.mock('@features/task/api', () => ({
  useAdminUnlockTask: () => ({ mutate: vi.fn(), isPending: false }),
  useHeartbeatTaskLock: () => ({ mutate: vi.fn() }),
  useUnlockTask: () => ({ mutate: vi.fn() }),
}));
vi.mock('@shared/api/parameters', () => ({ useParametersQuery: vi.fn() }));
vi.mock('@shared/api/dealers', () => ({ useDealersQuery: vi.fn() }));
vi.mock('@shared/api/addresses', () => ({ useAddressesQuery: vi.fn() }));
vi.mock('@features/menuManagement/ActivityMenuSync', () => ({ ActivityMenuSync: () => null }));
vi.mock('@shared/hooks/useSidebarCssVar', () => ({ useSidebarCssVar: vi.fn() }));
vi.mock('./useAppraisalBreadcrumb', () => ({ useAppraisalBreadcrumb: () => [] }));

const event = (completedBy: string): PoolTaskUpdateEvent => ({
  type: 'PoolTaskCompleted',
  taskId: 't1',
  poolGroup: 'g',
  completedBy,
  timestamp: '2026-10-26T10:00:00',
});

const setup = () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/tasks/t1']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TaskLayout />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return invalidate;
};

describe('TaskLayout PoolTaskCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { username: 'int.admin1', roles: [], groups: [] } as never });
  });

  it("ignores the echo of the current user's own completion (case-insensitive)", () => {
    const invalidate = setup();
    onUpdate(event('INT.ADMIN1'));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('refetches the task when another user completed it', () => {
    const invalidate = setup();
    onUpdate(event('someone.else'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['task', 't1'] });
  });
});
