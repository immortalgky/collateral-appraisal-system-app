import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider, type Query } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '@features/auth/store';
import { usePoolKanbanRealtime } from './usePoolKanbanRealtime';
import type { PoolTaskUpdateEvent } from './useWorkflowHub';

let onUpdate: (event: PoolTaskUpdateEvent) => void;
vi.mock('./useWorkflowHub', () => ({
  useWorkflowHub: (opts: { onPoolTaskUpdate: typeof onUpdate }) => {
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
    // A signed-in user, as on the real (authenticated-only) page; roles stays a stable reference.
    useAuthStore.setState({ user: { roles: ['r'] } as never });
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
