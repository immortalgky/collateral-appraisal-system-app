import '@/features/document-followup/i18n';
import { taskListUrl } from '@features/task/utils/taskReturn';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ValidationText } from '@/shared/components/form/ValidationText';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useGetDocumentTypes, getDocumentTypeName } from '@/features/request/api/documentTypes';
import DataErrorState from '@/shared/components/DataErrorState';
import {
  useWorkflowInstanceId,
  useIsTaskOwner,
} from '@/features/appraisal/context/AppraisalContext';
import { DocumentChecklistTab } from '@/features/appraisal/components/tabs/DocumentChecklistTab';
import { useGetFollowupByWorkflowInstance } from '../hooks/useGetFollowupByWorkflowInstance';
import { useSubmitDocumentFollowup } from '../hooks/useSubmitDocumentFollowup';
import { useDeclineLineItem } from '../hooks/useDeclineLineItem';
import { LineItemStatusBadge } from '../components/LineItemStatusBadge';
import { UploadLineItemDialog, type StagedAttachment } from '../components/UploadLineItemDialog';
import { declineLineItemSchema, type DeclineLineItemFormValues } from '../schemas/followup';
import type { FollowupLineItem } from '../types/followup';

// ---- Decline Reason Modal ----

interface DeclineModalProps {
  lineItem: FollowupLineItem;
  followupId: string;
  onClose: () => void;
}

function DeclineModal({ lineItem, followupId, onClose }: DeclineModalProps) {
  const { t } = useTranslation(['documentFollowup', 'common']);
  const declineMutation = useDeclineLineItem();
  const { data: documentTypes = [] } = useGetDocumentTypes();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeclineLineItemFormValues>({
    resolver: zodResolver(declineLineItemSchema),
  });

  const onSubmit = (values: DeclineLineItemFormValues) => {
    declineMutation.mutate(
      { followupId, lineItemId: lineItem.id, reason: values.reason },
      { onSuccess: onClose },
    );
  };

  return (
    <dialog className="modal modal-open z-[70]">
      <div className="modal-box bg-(--palette-surface) rounded-2xl shadow-xl max-w-sm">
        <div className="flex flex-col">
          <div className="w-14 h-14 rounded-full bg-(--palette-req-wash) flex items-center justify-center mb-4 mx-auto">
            <Icon name="hand" style="solid" className="size-7 text-red-500" />
          </div>
          <h3 className="font-semibold text-base text-(--palette-ink) mb-1 text-center">
            {t('declineModal.title')}
          </h3>
          <p className="text-sm text-(--palette-gray-500) mb-1 text-center">
            {t('declineModal.youAreDeclining')}{' '}
            <span className="font-medium text-(--palette-ink)">
              {getDocumentTypeName(documentTypes, lineItem.documentType)}
            </span>
          </p>
          <p className="text-xs text-(--palette-gray-400) mb-4 text-center">
            {t('declineModal.reasonRequired')}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
              <label className="block text-xs font-medium text-(--palette-ink) mb-1">
                {t('declineModal.reasonLabel')} <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reason')}
                rows={3}
                placeholder={t('declineModal.reasonPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-(--palette-line) rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
              />
              {errors.reason && (
                <p className="text-xs text-danger mt-1">
                  <ValidationText message={errors.reason.message} />
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={declineMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-(--palette-surface-3) hover:bg-(--palette-line) text-(--palette-ink) font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {t('common:actions.back')}
              </button>
              <button
                type="submit"
                disabled={declineMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-danger hover:bg-danger/80 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {declineMutation.isPending && (
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                )}
                {t('declineModal.decline')}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">{t('aria.closeDialog')}</button>
      </div>
    </dialog>
  );
}

// ---- Bulk Decline Modal ----

interface BulkDeclineModalProps {
  pendingCount: number;
  followupId: string;
  pendingItems: FollowupLineItem[];
  onClose: () => void;
}

function BulkDeclineModal({
  pendingCount,
  followupId,
  pendingItems,
  onClose,
}: BulkDeclineModalProps) {
  const { t } = useTranslation(['documentFollowup', 'common']);
  const { mutateAsync: declineAsync } = useDeclineLineItem();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeclineLineItemFormValues>({
    resolver: zodResolver(declineLineItemSchema),
  });

  const onSubmit = async (values: DeclineLineItemFormValues) => {
    setIsPending(true);
    try {
      for (const item of pendingItems) {
        await declineAsync({ followupId, lineItemId: item.id, reason: values.reason });
      }
      onClose();
    } catch {
      toast.error(t('toasts.bulkDeclineFailed'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <dialog className="modal modal-open z-[70]">
      <div className="modal-box bg-(--palette-surface) rounded-2xl shadow-xl max-w-sm">
        <div className="flex flex-col">
          <div className="w-14 h-14 rounded-full bg-(--palette-req-wash) flex items-center justify-center mb-4 mx-auto">
            <Icon name="hand" style="solid" className="size-7 text-red-500" />
          </div>
          <h3 className="font-semibold text-base text-(--palette-ink) mb-1 text-center">
            {t('bulkDeclineModal.title')}
          </h3>
          <p className="text-sm text-(--palette-gray-500) mb-1 text-center">
            {t('bulkDeclineModal.youAreDeclining', { count: pendingCount })}
          </p>
          <p className="text-xs text-(--palette-gray-400) mb-4 text-center">
            {t('bulkDeclineModal.reasonRequired')}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
              <label className="block text-xs font-medium text-(--palette-ink) mb-1">
                {t('bulkDeclineModal.reasonLabel')} <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reason')}
                rows={3}
                placeholder={t('bulkDeclineModal.reasonPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-(--palette-line) rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
              />
              {errors.reason && (
                <p className="text-xs text-danger mt-1">
                  <ValidationText message={errors.reason.message} />
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-(--palette-surface-3) hover:bg-(--palette-line) text-(--palette-ink) font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {t('common:actions.back')}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-danger hover:bg-danger/80 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending && <Icon name="spinner" style="solid" className="size-4 animate-spin" />}
                {t('bulkDeclineModal.declineAll')}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">{t('aria.closeDialog')}</button>
      </div>
    </dialog>
  );
}

// ---- Main Page ----

function ProvideDocumentsTaskPage() {
  const { t } = useTranslation(['documentFollowup', 'common']);
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const workflowInstanceId = useWorkflowInstanceId();
  const isTaskOwner = useIsTaskOwner();

  const {
    data: followup,
    isLoading,
    isError,
  } = useGetFollowupByWorkflowInstance(workflowInstanceId);
  const {
    data: documentTypes = [],
    isError: isDocTypesError,
    refetch: refetchDocTypes,
  } = useGetDocumentTypes();
  const submitFollowup = useSubmitDocumentFollowup();

  const [decliningItem, setDecliningItem] = useState<FollowupLineItem | null>(null);
  const [uploadingItem, setUploadingItem] = useState<FollowupLineItem | null>(null);
  const [showBulkDecline, setShowBulkDecline] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  // Per-line-item staged attachments. Purely local — only POSTed on Submit Response.
  // Replacing or removing is cheap; nothing is sent to the backend until submit.
  const [stagedByLineItem, setStagedByLineItem] = useState<Record<string, StagedAttachment>>({});
  const handleStaged = (attachment: StagedAttachment) => {
    setStagedByLineItem(prev => ({ ...prev, [attachment.lineItemId]: attachment }));
  };
  const handleUnstage = (lineItemId: string) => {
    setStagedByLineItem(prev => {
      const next = { ...prev };
      delete next[lineItemId];
      return next;
    });
  };

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), 'dd/MM/yyyy HH:mm');
    } catch {
      return d;
    }
  };

  const handleSubmitResponse = () => {
    if (!followup) return;
    const attachments = Object.values(stagedByLineItem).map(s => ({
      lineItemId: s.lineItemId,
      documentId: s.documentId,
      documentType: s.documentType,
      fileName: s.fileName,
      attachToRequest: s.attachToRequest,
      titleId: s.titleId ?? null,
    }));
    submitFollowup.mutate(
      { followupId: followup.id, attachments },
      {
        onSuccess: () => {
          setIsConfirmSubmitOpen(false);
          toast.success(t('toasts.submitSuccess'));
          navigate(taskListUrl('/tasks?activityId=provide-additional-documents'));
        },
        onError: (error: unknown) => {
          setIsConfirmSubmitOpen(false);
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 409) {
            toast.error(t('toasts.submitAlreadyDone'));
            navigate(taskListUrl('/tasks?activityId=provide-additional-documents'));
          } else if (status === 400) {
            toast.error(t('toasts.submitItemsRequired'));
          } else {
            const apiError = error as {
              response?: { data?: { detail?: string } };
              message?: string;
            };
            const message =
              apiError?.response?.data?.detail ?? apiError?.message ?? t('toasts.submitFailed');
            toast.error(message);
          }
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-(--palette-gray-400)">
        <Icon name="spinner" style="solid" className="size-4 animate-spin" />
        {t('page.loadingRequests')}
      </div>
    );
  }

  if (isError || !followup) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="size-10 text-red-400" />
        <p className="text-(--palette-gray-600) font-medium">{t('page.loadError')}</p>
        <p className="text-sm text-(--palette-gray-400)">{t('page.loadErrorDetail')}</p>
      </div>
    );
  }

  if (isDocTypesError) {
    return <DataErrorState title={t('page.loadError')} onRetry={refetchDocTypes} />;
  }

  const pendingItems = followup.lineItems.filter(i => i.status === 'Pending');
  const resolvedItems = followup.lineItems.filter(i => i.status !== 'Pending');
  // Every pending item is "handled" when it has a staged file (queued for attach on submit).
  // Declined items are already non-pending, so this only scopes over Pending rows.
  const allPendingStaged = pendingItems.every(i => !!stagedByLineItem[i.id]);
  const canSubmit = isTaskOwner && allPendingStaged && followup.status !== 'Cancelled';

  // Back-link to parent appraisal
  const parentAppraisalHref = followup.parentAppraisalId
    ? `/tasks/${taskId}`
    : taskListUrl('/tasks?activityId=provide-additional-documents');

  const raisedByLabel = followup.raisedBy.displayName ?? followup.raisedBy.userId ?? 'Unknown';

  return (
    <div className="flex flex-col gap-4">
      {/* Back-link breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to={parentAppraisalHref}
          className="inline-flex items-center gap-1.5 text-sm text-(--palette-gray-500) hover:text-(--palette-primary-text) transition-colors"
        >
          <Icon name="arrow-left" style="solid" className="size-3.5" />
          {t('page.back')}
        </Link>
      </div>

      {/* Header card */}
      <FormCard title={t('page.title')} icon="file-circle-check" iconColor="amber">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-(--palette-warn-wash) border border-amber-100 dark:border-amber-500/20 mb-4">
          <Icon
            name="circle-info"
            style="solid"
            className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('page.infoTitle')}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {t('page.infoBody')}
            </p>
            <p className="text-xs text-amber-500 mt-1">
              {t('page.requestedBy', {
                name: raisedByLabel,
                date: formatDate(followup.raisedAt),
              })}
            </p>
          </div>
        </div>

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-(--palette-ink) flex items-center gap-2">
                <Icon name="clock" style="solid" className="size-4 text-amber-500" />
                {t('page.pendingRequests', { count: pendingItems.length })}
              </h4>
              {isTaskOwner && pendingItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowBulkDecline(true)}
                  className="px-3 py-1.5 text-xs font-medium text-(--palette-danger) bg-(--palette-req-wash) hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Icon name="hand" style="solid" className="size-3" />
                  {t('page.declineAllRemaining')}
                </button>
              )}
            </div>
            <div className="space-y-3">
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-(--palette-line) bg-(--palette-surface)"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(--palette-ink)">
                        {getDocumentTypeName(documentTypes, item.documentType)}
                      </p>
                      <p className="text-xs text-(--palette-gray-500) mt-0.5">{item.notes}</p>
                    </div>
                    <LineItemStatusBadge status={item.status} />
                  </div>

                  {isTaskOwner &&
                    (() => {
                      const staged = stagedByLineItem[item.id];
                      if (staged) {
                        return (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-xs text-green-800 dark:text-green-300">
                              <Icon
                                name="check"
                                style="solid"
                                className="size-3.5 text-green-600 dark:text-green-400"
                              />
                              <span className="truncate">
                                <span className="font-semibold">{staged.fileName}</span>{' '}
                                <span className="text-green-600/80 dark:text-green-400">
                                  · {staged.targetLabel}
                                </span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setUploadingItem(item)}
                              className="px-3 py-2 text-xs font-medium text-(--palette-ink) bg-(--palette-surface-3) hover:bg-(--palette-line) border border-(--palette-line) rounded-lg transition-colors"
                            >
                              {t('page.replaceStagedFile')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnstage(item.id)}
                              className="px-3 py-2 text-xs font-medium text-(--palette-danger) bg-(--palette-req-wash) hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 rounded-lg transition-colors"
                            >
                              {t('page.removeStagedFile')}
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setUploadingItem(item)}
                            disabled={!followup.requestId}
                            title={
                              followup.requestId ? undefined : t('page.uploadUnavailableTitle')
                            }
                            className="flex-1 px-3 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/80 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Icon name="upload" style="solid" className="size-3.5" />
                            {t('page.uploadButton')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDecliningItem(item)}
                            className="px-3 py-2 text-xs font-medium text-(--palette-danger) bg-(--palette-req-wash) hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Icon name="hand" style="solid" className="size-3.5" />
                            {t('page.declineButton')}
                          </button>
                        </div>
                      );
                    })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved items */}
        {resolvedItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-(--palette-ink) mb-3 flex items-center gap-2">
              <Icon name="circle-check" style="solid" className="size-4 text-green-500" />
              {t('page.resolved', { count: resolvedItems.length })}
            </h4>
            <div className="overflow-hidden rounded-lg border border-(--palette-line)">
              <table className="w-full text-sm">
                <thead className="bg-(--palette-surface-2)">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-(--palette-gray-600)">
                      {t('columns.documentType')}
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-(--palette-gray-600)">
                      {t('columns.notes')}
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-(--palette-gray-600)">
                      {t('columns.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--palette-line-soft)">
                  {resolvedItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2.5 text-(--palette-ink)">
                        {getDocumentTypeName(documentTypes, item.documentType)}
                      </td>
                      <td className="px-3 py-2.5 text-(--palette-gray-500)">
                        {item.notes}
                        {item.reason && (
                          <span className="block text-xs text-red-500 mt-0.5">
                            {t('page.reasonPrefix')} {item.reason}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <LineItemStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ready-to-submit state */}
        {allPendingStaged && pendingItems.length > 0 && followup.status !== 'Cancelled' && (
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
            <Icon
              name="circle-check"
              style="solid"
              className="size-5 text-green-600 dark:text-green-400"
            />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              {t('page.allStagedBanner')}
            </p>
          </div>
        )}
        {pendingItems.length === 0 && followup.status !== 'Cancelled' && (
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
            <Icon
              name="circle-check"
              style="solid"
              className="size-5 text-green-600 dark:text-green-400"
            />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              {t('page.allResolvedBanner')}
            </p>
          </div>
        )}

        {/* Submit Response button */}
        {isTaskOwner && followup.status !== 'Cancelled' && (
          <div className="mt-6 pt-4 border-t border-(--palette-line-soft) flex justify-end">
            <button
              type="button"
              disabled={!canSubmit || submitFollowup.isPending}
              onClick={() => setIsConfirmSubmitOpen(true)}
              className="px-5 py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitFollowup.isPending && (
                <Icon name="spinner" style="solid" className="size-4 animate-spin" />
              )}
              <Icon name="paper-plane" style="solid" className="size-4" />
              {t('page.submitResponse')}
            </button>
            {!allPendingStaged && pendingItems.length > 0 && (
              <p className="ml-4 self-center text-xs text-(--palette-gray-400)">
                {t('page.stageHint')}
              </p>
            )}
          </div>
        )}
      </FormCard>

      {/* Inline Document Checklist — read-only reference of currently-attached documents. */}
      <FormCard title={t('page.documentChecklist')} icon="folder-open" iconColor="blue">
        <p className="text-xs text-(--palette-gray-500) mb-4">{t('page.checklistHint')}</p>
        <DocumentChecklistTab embedded />
      </FormCard>

      {/* Upload dialog (per line item) */}
      {uploadingItem && followup && followup.requestId && (
        <UploadLineItemDialog
          key={uploadingItem.id}
          isOpen
          onClose={() => setUploadingItem(null)}
          requestId={followup.requestId}
          lineItem={uploadingItem}
          onStaged={handleStaged}
        />
      )}

      {/* Decline modal (single item) */}
      {decliningItem && followup && (
        <DeclineModal
          key={decliningItem.id}
          lineItem={decliningItem}
          followupId={followup.id}
          onClose={() => setDecliningItem(null)}
        />
      )}

      {/* Bulk decline modal */}
      {showBulkDecline && followup && (
        <BulkDeclineModal
          pendingCount={pendingItems.length}
          followupId={followup.id}
          pendingItems={pendingItems}
          onClose={() => setShowBulkDecline(false)}
        />
      )}

      {/* Submit confirmation dialog */}
      <ConfirmDialog
        isOpen={isConfirmSubmitOpen}
        onClose={() => setIsConfirmSubmitOpen(false)}
        onConfirm={handleSubmitResponse}
        title={t('page.confirmSubmitTitle')}
        message={t('page.confirmSubmitMessage')}
        confirmText={t('page.confirmSubmit')}
        cancelText={t('common:actions.cancel')}
        variant="primary"
        isLoading={submitFollowup.isPending}
      />
    </div>
  );
}

export default ProvideDocumentsTaskPage;
