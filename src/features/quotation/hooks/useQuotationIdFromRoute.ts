import { useParams } from 'react-router-dom';
import { useGetTaskById } from '@features/appraisal/api/workflow';

/**
 * Resolves the quotation request ID regardless of whether the page is rendered
 * inside a TaskLayout-wrapped route or as a standalone direct-link route.
 *
 * Resolution order:
 *  1. `useParams().id`               — standalone routes: /ext/quotations/:id, /quotations/:id
 *  2. `taskData.quotationRequestId`  — task-wrapped routes: /tasks/:taskId/quotation/*
 *     (backend populates TaskDetailResult.quotationRequestId for quotation-workflow tasks)
 *
 * Returns `string | null`. Callers should treat `null` as "still loading".
 */
export function useQuotationIdFromRoute(): string | null {
  // Params available from both standalone and task-wrapped routes
  const { id, taskId } = useParams<{ id?: string; taskId?: string }>();

  // Only fetch task data when we are in the task-wrapped context (no standalone :id param)
  const { data: taskData } = useGetTaskById(id ? undefined : taskId);

  if (id) {
    return id;
  }

  return taskData?.quotationRequestId ?? null;
}
