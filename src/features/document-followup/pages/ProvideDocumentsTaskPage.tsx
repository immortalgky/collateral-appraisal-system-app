import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useGetDocumentTypes, getDocumentTypeName } from '@/features/request/api/documentTypes';
import {
  useWorkflowInstanceId,
  useIsTaskOwner,
} from '@/features/appraisal/context/AppraisalContext';
import { DocumentChecklistTab } from '@/features/appraisal/components/tabs/DocumentChecklistTab';
import { useGetFollowupByWorkflowInstance } from '../hooks/useGetFollowupByWorkflowInstance';
import { useSubmitDocumentFollowup } from '../hooks/useSubmitDocumentFollowup';
import { useDeclineLineItem } from '../hooks/useDeclineLineItem';
import { LineItemStatusBadge } from '../components/LineItemStatusBadge';
import {
  UploadLineItemDialog,
  type StagedAttachment,
} from '../components/UploadLineItemDialog';
import { declineLineItemSchema, type DeclineLineItemFormValues } from '../schemas/followup';
import type { FollowupLineItem } from '../types/followup';

// ---- Decline Reason Modal ----

interface DeclineModalProps {
  lineItem: FollowupLineItem;
  followupId: string;
  onClose: () => void;
}

function DeclineModal({ lineItem, followupId, onClose }: DeclineModalProps) {
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
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-sm">
        <div className="flex flex-col">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
            <Icon name="hand" style="solid" className="size-7 text-red-500" />
          </div>
          <h3 className="font-semibold text-base text-gray-900 mb-1 text-center">
            Decline Document Request
          </h3>
          <p className="text-sm text-gray-500 mb-1 text-center">
            You are declining:{' '}
            <span className="font-medium text-gray-700">
              {getDocumentTypeName(documentTypes, lineItem.documentType)}
            </span>
          </p>
          <p className="text-xs text-gray-400 mb-4 text-center">
            A reason is required to decline this request.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason for declining <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reason')}
                rows={3}
                placeholder="Enter reason for declining..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
              />
              {errors.reason && (
                <p className="text-xs text-danger mt-1">{errors.reason.message}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={declineMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={declineMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-danger hover:bg-danger/80 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {declineMutation.isPending && (
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                )}
                Decline
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">close</button>
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

function BulkDeclineModal({ pendingCount, followupId, pendingItems, onClose }: BulkDeclineModalProps) {
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
      toast.error('Failed to decline some items. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <dialog className="modal modal-open z-[70]">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-sm">
        <div className="flex flex-col">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
            <Icon name="hand" style="solid" className="size-7 text-red-500" />
          </div>
          <h3 className="font-semibold text-base text-gray-900 mb-1 text-center">
            Decline All Remaining
          </h3>
          <p className="text-sm text-gray-500 mb-1 text-center">
            You are declining{' '}
            <span className="font-semibold text-gray-700">{pendingCount}</span> pending{' '}
            {pendingCount === 1 ? 'request' : 'requests'}.
          </p>
          <p className="text-xs text-gray-400 mb-4 text-center">
            A reason is required to decline all requests.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason for declining <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reason')}
                rows={3}
                placeholder="Enter reason for declining all remaining requests..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
              />
              {errors.reason && (
                <p className="text-xs text-danger mt-1">{errors.reason.message}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-danger hover:bg-danger/80 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending && (
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                )}
                Decline All
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
}

// ---- Main Page ----

function ProvideDocumentsTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const workflowInstanceId = useWorkflowInstanceId();
  const isTaskOwner = useIsTaskOwner();

  const { data: followup, isLoading, isError } = useGetFollowupByWorkflowInstance(workflowInstanceId);
  const { data: documentTypes = [] } = useGetDocumentTypes();
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
          toast.success('Response submitted successfully');
          navigate('/tasks?activityId=provide-additional-documents');
        },
        onError: (error: unknown) => {
          setIsConfirmSubmitOpen(false);
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 409) {
            toast.error('This followup has already been submitted.');
            navigate('/tasks?activityId=provide-additional-documents');
          } else if (status === 400) {
            toast.error('All items must be provided or declined before submitting.');
          } else {
            const apiError = error as { response?: { data?: { detail?: string } }; message?: string };
            const message = apiError?.response?.data?.detail ?? apiError?.message ?? 'Failed to submit response';
            toast.error(message);
          }
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
        <Icon name="spinner" style="solid" className="size-4 animate-spin" />
        Loading document requests...
      </div>
    );
  }

  if (isError || !followup) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="size-10 text-red-400" />
        <p className="text-gray-600 font-medium">Failed to load document requests</p>
        <p className="text-sm text-gray-400">
          This task may no longer be active.
        </p>
      </div>
    );
  }

  const pendingItems = followup.lineItems.filter(i => i.status === 'Pending');
  const resolvedItems = followup.lineItems.filter(i => i.status !== 'Pending');
  // Every pending item is "handled" when it has a staged file (queued for attach on submit).
  // Declined items are already non-pending, so this only scopes over Pending rows.
  const allPendingStaged = pendingItems.every(i => !!stagedByLineItem[i.id]);
  const canSubmit =
    isTaskOwner && allPendingStaged && followup.status !== 'Cancelled';

  // Back-link to parent appraisal
  const parentAppraisalHref = followup.parentAppraisalId
    ? `/tasks/${taskId}`
    : '/tasks?activityId=provide-additional-documents';

  return (
    <div className="flex flex-col gap-4">
      {/* Back-link breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to={parentAppraisalHref}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
        >
          <Icon name="arrow-left" style="solid" className="size-3.5" />
          Back to appraisal
        </Link>
      </div>

      {/* Header card */}
      <FormCard title="Provide Additional Documents" icon="file-circle-check" iconColor="amber">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 mb-4">
          <Icon
            name="circle-info"
            style="solid"
            className="size-5 text-amber-600 shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-amber-800">
              The checker has requested additional documents.
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Please provide or decline each requested document below. The checker's task will
              proceed once all items are resolved.
            </p>
            <p className="text-xs text-amber-500 mt-1">
              Requested by{' '}
              {followup.raisedBy.displayName ?? followup.raisedBy.userId ?? 'Unknown'}{' '}
              on {formatDate(followup.raisedAt)}
            </p>
          </div>
        </div>

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Icon name="clock" style="solid" className="size-4 text-amber-500" />
                Pending Requests ({pendingItems.length})
              </h4>
              {isTaskOwner && pendingItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowBulkDecline(true)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Icon name="hand" style="solid" className="size-3" />
                  Decline All Remaining
                </button>
              )}
            </div>
            <div className="space-y-3">
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-gray-200 bg-white"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {getDocumentTypeName(documentTypes, item.documentType)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>
                    </div>
                    <LineItemStatusBadge status={item.status} />
                  </div>

                  {isTaskOwner && (() => {
                    const staged = stagedByLineItem[item.id];
                    if (staged) {
                      return (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800">
                            <Icon name="check" style="solid" className="size-3.5 text-green-600" />
                            <span className="truncate">
                              <span className="font-semibold">{staged.fileName}</span>{' '}
                              <span className="text-green-600/80">· {staged.targetLabel}</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUploadingItem(item)}
                            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnstage(item.id)}
                            className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors"
                          >
                            Remove
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
                            followup.requestId
                              ? undefined
                              : 'Request context not available — cannot upload.'
                          }
                          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/80 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Icon name="upload" style="solid" className="size-3.5" />
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecliningItem(item)}
                          className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Icon name="hand" style="solid" className="size-3.5" />
                          Decline
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
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Icon name="circle-check" style="solid" className="size-4 text-green-500" />
              Resolved ({resolvedItems.length})
            </h4>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">
                      Document Type
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">
                      Notes
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resolvedItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2.5 text-gray-700">
                        {getDocumentTypeName(documentTypes, item.documentType)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">
                        {item.notes}
                        {item.reason && (
                          <span className="block text-xs text-red-500 mt-0.5">
                            Reason: {item.reason}
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
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-green-50 border border-green-100">
            <Icon name="circle-check" style="solid" className="size-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">
              All pending requests have a file staged. Submit Response to send them.
            </p>
          </div>
        )}
        {pendingItems.length === 0 && followup.status !== 'Cancelled' && (
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-green-50 border border-green-100">
            <Icon name="circle-check" style="solid" className="size-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">
              All document requests have been resolved.
            </p>
          </div>
        )}

        {/* Submit Response button */}
        {isTaskOwner && followup.status !== 'Cancelled' && (
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
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
              Submit Response
            </button>
            {!allPendingStaged && pendingItems.length > 0 && (
              <p className="ml-4 self-center text-xs text-gray-400">
                Stage a file (or decline) for every pending item to enable submit.
              </p>
            )}
          </div>
        )}
      </FormCard>

      {/* Inline Document Checklist — read-only reference of currently-attached documents. */}
      <FormCard title="Document Checklist" icon="folder-open" iconColor="blue">
        <p className="text-xs text-gray-500 mb-4">
          Read-only view of documents already attached to the request. Staged files above are
          attached atomically when you click Submit Response.
        </p>
        <DocumentChecklistTab />
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
        title="Submit Response"
        message="Submit your response to the checker? This will mark all items as resolved and allow the checker to proceed."
        confirmText="Submit"
        cancelText="Cancel"
        variant="primary"
        isLoading={submitFollowup.isPending}
      />
    </div>
  );
}

export default ProvideDocumentsTaskPage;
