import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { useGetDocumentTypes, getDocumentTypeName } from '@/features/request/api/documentTypes';
import {
  useWorkflowInstanceId,
  useIsTaskOwner,
} from '@/features/appraisal/context/AppraisalContext';
import { useGetFollowupByWorkflowInstance } from '../hooks/useGetFollowupByWorkflowInstance';
import { useDeclineLineItem } from '../hooks/useDeclineLineItem';
import { LineItemStatusBadge } from '../components/LineItemStatusBadge';
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
            A reason is required.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
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

// ---- Main Page ----

function ProvideDocumentsTaskPage() {
  const workflowInstanceId = useWorkflowInstanceId();
  const isTaskOwner = useIsTaskOwner();

  const { data: followup, isLoading, isError } = useGetFollowupByWorkflowInstance(workflowInstanceId);
  const { data: documentTypes = [] } = useGetDocumentTypes();

  const [decliningItem, setDecliningItem] = useState<FollowupLineItem | null>(null);

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), 'dd/MM/yyyy HH:mm');
    } catch {
      return d;
    }
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

  return (
    <div className="flex flex-col gap-4">
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
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Icon name="clock" style="solid" className="size-4 text-amber-500" />
              Pending Requests ({pendingItems.length})
            </h4>
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

                  {/* Upload area — inline hint; actual upload goes through DocumentChecklist */}
                  {isTaskOwner && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
                        <Icon name="upload" style="solid" className="size-3.5" />
                        Upload the document via the Document Checklist tab, tagging it as{' '}
                        <span className="font-semibold">
                          {getDocumentTypeName(documentTypes, item.documentType)}
                        </span>
                        . It will auto-resolve this item.
                      </div>
                      <button
                        type="button"
                        onClick={() => setDecliningItem(item)}
                        className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Icon name="hand" style="solid" className="size-3.5" />
                        Decline
                      </button>
                    </div>
                  )}
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

        {/* All resolved state */}
        {pendingItems.length === 0 && followup.status !== 'Cancelled' && (
          <div className="flex items-center gap-3 mt-2 p-3 rounded-xl bg-green-50 border border-green-100">
            <Icon name="circle-check" style="solid" className="size-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">
              All document requests have been resolved. The checker can now proceed.
            </p>
          </div>
        )}
      </FormCard>

      {/* Decline modal */}
      {decliningItem && followup && (
        <DeclineModal
          key={decliningItem.id}
          lineItem={decliningItem}
          followupId={followup.id}
          onClose={() => setDecliningItem(null)}
        />
      )}
    </div>
  );
}

export default ProvideDocumentsTaskPage;
