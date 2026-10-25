import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider, type Query } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '@features/auth/store';
import { usePoolKanbanRealtime } from './usePoolKanbanRealtime';
import type { PoolTaskUpdateEvent } from './useWorkflowHub';

let onUpdate: (event: PoolTaskUpdateEvent) => void;
const useWorkflowHub = vi.hoisted(() => vi.fn());
vi.mock('./useWorkflowHub', () => ({
  useWorkflowHub: (opts: { onPoolTaskUpdate: typeof onUpdate }) => {
    useWorkflowHub(opts);
    onUpdate = opts.onPoolTaskUpdate;
  },
}));

const event = (type: PoolTaskUpdateEvent['type']): PoolTaskUpdateEvent => ({
  type,
  taskId: 't1',
  poolGroup: 'g',
  timestamp: '2026-10-25T10:00:00',
});

const setup = () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  renderHook(() => usePoolKanbanRealtime(), { wrapper });
  // Each call carries a predicate; probe which pool query keys it matches.
  const matches = (key: unknown[]) =>
    invalidate.mock.calls.some(([filters]) =>
      filters?.predicate?.({ queryKey: key } as unknown as Query),
    );
  return { invalidate, matches };
};

describe('usePoolKanbanRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        username: 'me',
        roles: ['Admin'],
        groups: ['IntAdmin'],
        teams: ['9f1c2d3e-0000-4000-8000-000000000001'],
      } as never,
    });
  });

  it("listens to the pool channels of the user's groups, not of the roles", () => {
    setup();
    expect(useWorkflowHub).toHaveBeenLastCalledWith(
      expect.objectContaining({
        poolGroups: ['IntAdmin', 'IntAdmin:Team_9f1c2d3e-0000-4000-8000-000000000001'],
      }),
    );
  });

  it.each(['PoolTaskClaimed', 'PoolTaskCompleted'] as const)(
    '%s refetches the pool kanban columns and pool group counts only',
    type => {
      const { invalidate, matches } = setup();
      onUpdate(event(type));

      expect(invalidate).toHaveBeenCalledTimes(2);
      expect(matches(['kanban-column', 'pool', 'x'])).toBe(true);
      expect(matches(['task-group-counts', 'pool'])).toBe(true);
      expect(matches(['kanban-column', 'personal', 'x'])).toBe(false);
      expect(matches(['task-group-counts', 'personal'])).toBe(false);
    },
  );

  it('PoolTaskLocked patches in place without refetching', () => {
    const { invalidate } = setup();
    onUpdate({ ...event('PoolTaskLocked'), lockedBy: 'u' });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
