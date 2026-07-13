import { useCallback } from 'react';
import { useQueryClient, type Query } from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store';
import { useWorkflowHub, type PoolTaskUpdateEvent } from './useWorkflowHub';
import type { Task } from '../types';

interface KanbanColumnPage {
  items: Task[];
  count: number;
}

interface KanbanColumnInfiniteData {
  pages: KanbanColumnPage[];
  pageParams: unknown[];
}

const isPoolKanbanQuery = (query: Query) =>
  query.queryKey[0] === 'kanban-column' && query.queryKey[1] === 'pool';
const isPoolGroupCountsQuery = (query: Query) =>
  query.queryKey[0] === 'task-group-counts' && query.queryKey[1] === 'pool';

/**
 * Real-time sync for the Pool Kanban board (grid view of the Pool tab).
 *
 * Mirrors PoolTaskListPage's own onPoolTaskUpdate handler, which patches the
 * `['pool-tasks']` table cache — but the kanban board reads from a different
 * set of query keys (`['kanban-column', 'pool', ...]` infinite queries +
 * `['task-group-counts', 'pool', ...]`), so that handler alone doesn't keep
 * the board in sync.
 *
 * Strategy:
 * - PoolTaskLocked / PoolTaskUnlocked: patch the matching task's lock fields
 *   in place across every pool kanban-column infinite-query page (no refetch,
 *   preserves scroll position).
 * - PoolTaskClaimed: the task leaves the pool entirely, so invalidate
 *   (refetch) the pool kanban-column queries and the pool group-counts.
 */
export function usePoolKanbanRealtime() {
  const queryClient = useQueryClient();
  const userRoles = useAuthStore(s => s.user?.roles ?? []);

  const handlePoolTaskUpdate = useCallback(
    (event: PoolTaskUpdateEvent) => {
      if (event.type === 'PoolTaskLocked') {
        queryClient.setQueriesData<KanbanColumnInfiniteData>(
          { predicate: isPoolKanbanQuery },
          old =>
            old
              ? {
                  ...old,
                  pages: old.pages.map(page => ({
                    ...page,
                    items: page.items.map(t =>
                      t.id === event.taskId
                        ? { ...t, workingBy: event.lockedBy ?? null, lockedAt: event.timestamp }
                        : t,
                    ),
                  })),
                }
              : old,
        );
      } else if (event.type === 'PoolTaskUnlocked') {
        queryClient.setQueriesData<KanbanColumnInfiniteData>(
          { predicate: isPoolKanbanQuery },
          old =>
            old
              ? {
                  ...old,
                  pages: old.pages.map(page => ({
                    ...page,
                    items: page.items.map(t =>
                      t.id === event.taskId ? { ...t, workingBy: null, lockedAt: null } : t,
                    ),
                  })),
                }
              : old,
        );
      } else if (event.type === 'PoolTaskClaimed') {
        queryClient.invalidateQueries({ predicate: isPoolKanbanQuery });
        queryClient.invalidateQueries({ predicate: isPoolGroupCountsQuery });
      }
    },
    [queryClient],
  );

  useWorkflowHub({ poolGroups: userRoles, onPoolTaskUpdate: handlePoolTaskUpdate });
}
