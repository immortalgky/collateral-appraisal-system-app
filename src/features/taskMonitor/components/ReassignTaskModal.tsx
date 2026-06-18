import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Avatar from '@shared/components/Avatar';

import { useEligibleAssignees, useReassignTask } from '../api/taskMonitor';
import type { EligibleAssignee, MonitoredTask } from '../types';

interface ReassignTaskModalProps {
  task: MonitoredTask | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDueAt(dueAt: string | null): string {
  if (!dueAt) return '—';
  try {
    return format(parseISO(dueAt), 'dd MMM yyyy HH:mm');
  } catch {
    return dueAt;
  }
}

const PAGE_SIZE = 10;

function ReassignTaskModal({ task, isOpen, onClose }: ReassignTaskModalProps) {
  const { t } = useTranslation(['taskMonitor', 'common']);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // Reset on open / task change
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(null);
      setPage(0);
      setServerError(null);
    }
  }, [isOpen, task]);

  const { data: eligibleData, isLoading: isLoadingAssignees } = useEligibleAssignees(
    task?.workflowInstanceId ?? null,
    task?.activityId ?? null,
  );

  const reassign = useReassignTask();

  // Filter out the current assignee + paginate client-side
  const allCandidates: EligibleAssignee[] = useMemo(
    () => (eligibleData?.eligibleAssignees ?? []).filter(a => a.userId !== task?.assignedTo),
    [eligibleData?.eligibleAssignees, task?.assignedTo],
  );

  const totalPages = Math.max(1, Math.ceil(allCandidates.length / PAGE_SIZE));
  const pagedCandidates = allCandidates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const onSave = async () => {
    if (!task || !selectedUserId) return;
    setServerError(null);

    try {
      const result = await reassign.mutateAsync({
        taskId: task.taskId,
        body: { newAssignedTo: selectedUserId },
      });

      if (!result.isSuccess) {
        setServerError(result.errorMessage ?? t('reassign.failed'));
        return;
      }

      if (result.changed) {
        const picked = allCandidates.find(a => a.userId === selectedUserId);
        toast.success(t('reassign.success', { name: picked?.displayName ?? selectedUserId }));
      }
      onClose();
    } catch {
      setServerError(t('reassign.unexpectedError'));
    }
  };

  const handleClose = () => {
    if (!reassign.isPending) onClose();
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('reassign.title')} size="lg">
      <div className="space-y-4">
        {/* ── Current assignment summary ── */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
          <div className="flex items-start gap-3">
            <Avatar
              name={task.assignedToDisplayName || task.assignedTo}
              size="md"
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">{t('reassign.currentlyAssigned')}</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {task.assignedToDisplayName || task.assignedTo}
              </p>
              <p className="text-xs text-gray-500 truncate">{task.activityName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Icon style="solid" name="clock" className="size-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-600">
              {t('reassign.due')}{' '}
              <span className="font-medium text-gray-800">{formatDueAt(task.dueAt)}</span>
            </span>
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 border border-blue-200 text-blue-700">
              <Icon style="solid" name="lock" className="size-2.5" />
              {t('reassign.slaPreserved')}
            </span>
          </div>
        </div>

        {/* ── Eligible list ── */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">
            {t('reassign.newAssignee')} <span className="text-red-500">*</span>
          </p>

          {isLoadingAssignees ? (
            <div className="flex items-center justify-center py-12 text-xs text-gray-400">
              <Icon style="solid" name="spinner" className="size-4 animate-spin mr-2" />
              {t('reassign.loadingUsers')}
            </div>
          ) : allCandidates.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">{t('reassign.noEligible')}</p>
          ) : (
            <>
              <ul className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[360px] overflow-auto">
                {pagedCandidates.map(candidate => {
                  const isSelected = selectedUserId === candidate.userId;
                  return (
                    <li key={candidate.userId}>
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(candidate.userId)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <Avatar name={candidate.displayName || candidate.userName} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-mono text-xs text-gray-500">
                              {candidate.userName}
                            </span>
                            <span className="mx-1.5 text-gray-300">-</span>
                            <span className="font-medium">{candidate.displayName}</span>
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 shrink-0 max-w-[180px] truncate text-right">
                          {candidate.roles.length > 0 ? candidate.roles.join(', ') : '—'}
                        </div>
                        {isSelected && (
                          <Icon
                            style="solid"
                            name="circle-check"
                            className="size-4 text-primary shrink-0"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Pagination (client-side; eligible pools are typically small) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>
                    {t('reassign.pageInfo', {
                      from: page * PAGE_SIZE + 1,
                      to: Math.min((page + 1) * PAGE_SIZE, allCandidates.length),
                      total: allCandidates.length,
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Icon style="solid" name="chevron-left" className="size-3" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPage(i)}
                        className={`min-w-[28px] px-2 py-1 rounded border ${
                          i === page
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Icon style="solid" name="chevron-right" className="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Server error ── */}
        {serverError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <Icon
              style="solid"
              name="triangle-exclamation"
              className="size-4 text-red-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={reassign.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={reassign.isPending}
            disabled={!selectedUserId}
            onClick={onSave}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ReassignTaskModal;
