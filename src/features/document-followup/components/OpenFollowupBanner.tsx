import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import Icon from '@/shared/components/Icon';
import { useGetDocumentTypes, getDocumentTypeName } from '@/features/request/api/documentTypes';
import { useAuthStore } from '@/features/auth/store';
import { useOpenFollowupsForTask } from '../hooks/useOpenFollowupsForTask';
import { useGetFollowupById } from '../hooks/useGetFollowupById';
import { useCancelFollowup } from '../hooks/useCancelFollowup';
import { useCancelLineItem } from '../hooks/useCancelLineItem';
import { LineItemStatusBadge } from './LineItemStatusBadge';
import { cancelWithReasonSchema, type CancelWithReasonFormValues } from '../schemas/followup';

interface OpenFollowupBannerProps {
  /** The taskId of the raising task (checker's task) */
  raisingTaskId: string;
}

function CancelReasonModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CancelWithReasonFormValues>({
    resolver: zodResolver(cancelWithReasonSchema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open z-[70]">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-sm">
        <div className="flex flex-col">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4 mx-auto">
            <Icon name="circle-exclamation" style="solid" className="size-7 text-amber-500" />
          </div>
          <h3 className="font-semibold text-base text-gray-900 mb-1 text-center">{title}</h3>
          <p className="text-sm text-gray-500 mb-4 text-center">
            Please provide a reason for cancellation.
          </p>
          <form
            onSubmit={handleSubmit(values => onConfirm(values.reason))}
            noValidate
          >
            <div className="mb-4">
              <textarea
                {...register('reason')}
                rows={3}
                placeholder="Enter reason..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
              />
              {errors.reason && (
                <p className="text-xs text-danger mt-1">{errors.reason.message}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                ) : null}
                Confirm
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={handleClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
}

/**
 * Renders the detail of a single open followup inline.
 * Cancel controls are only rendered when currentUserId matches the raising user.
 */
function FollowupDetail({
  followupId,
  raisingTaskId,
  currentUserId,
}: {
  followupId: string;
  raisingTaskId: string;
  currentUserId: string | undefined;
}) {
  const { data: followup, isLoading } = useGetFollowupById(followupId);
  const { data: documentTypes = [] } = useGetDocumentTypes();
  const cancelFollowup = useCancelFollowup();
  const cancelLineItem = useCancelLineItem();

  const [cancelFollowupOpen, setCancelFollowupOpen] = useState(false);
  const [cancelLineItemTarget, setCancelLineItemTarget] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
        <Icon name="spinner" style="solid" className="size-4 animate-spin" />
        Loading details...
      </div>
    );
  }

  if (!followup) return null;

  // Only the user who raised the followup can cancel it or its line items.
  const isRaisingUser = !!currentUserId && currentUserId === followup.raisedBy.userId;

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), 'dd/MM/yyyy HH:mm');
    } catch {
      return d;
    }
  };

  // Resolve display name with graceful fallback for null (backend lookup may be pending)
  const raisedByLabel =
    followup.raisedBy.displayName ?? followup.raisedBy.userId ?? 'Unknown';

  const handleCancelFollowup = (reason: string) => {
    cancelFollowup.mutate(
      { followupId, raisingTaskId, reason },
      { onSuccess: () => setCancelFollowupOpen(false) },
    );
  };

  const handleCancelLineItem = (reason: string) => {
    if (!cancelLineItemTarget) return;
    cancelLineItem.mutate(
      { followupId, lineItemId: cancelLineItemTarget, raisingTaskId, reason },
      { onSuccess: () => setCancelLineItemTarget(null) },
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Icon name="clock" style="regular" className="size-3.5" />
          Raised {formatDate(followup.raisedAt)}
          <span>by {raisedByLabel}</span>
        </div>
        {/* Cancel all — only visible to the user who raised the followup */}
        {isRaisingUser && (
          <button
            type="button"
            onClick={() => setCancelFollowupOpen(true)}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Icon name="xmark" style="solid" className="size-3.5" />
            Cancel all
          </button>
        )}
      </div>

      {/* Line items table */}
      <div className="overflow-hidden rounded-lg border border-amber-100">
        <table className="w-full text-sm">
          <thead className="bg-amber-50">
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
              {/* Action column only rendered when viewer is the raising user */}
              {isRaisingUser && <th className="px-3 py-2 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50 bg-white">
            {followup.lineItems.map(item => (
              <tr key={item.id}>
                <td className="px-3 py-2.5 text-gray-700 font-medium">
                  {getDocumentTypeName(documentTypes, item.documentType)}
                </td>
                <td className="px-3 py-2.5 text-gray-500 max-w-xs">
                  <span className="line-clamp-2">{item.notes}</span>
                  {(item.status === 'Declined' || item.status === 'Cancelled') &&
                    item.reason && (
                      <span className="block text-xs text-red-500 mt-0.5">
                        Reason: {item.reason}
                      </span>
                    )}
                </td>
                <td className="px-3 py-2.5">
                  <LineItemStatusBadge status={item.status} />
                </td>
                {/* Per-item cancel — only for the raising user */}
                {isRaisingUser && (
                  <td className="px-3 py-2.5">
                    {item.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => setCancelLineItemTarget(item.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Cancel this line item"
                      >
                        <Icon name="xmark" style="solid" className="size-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cancel followup modal */}
      <CancelReasonModal
        isOpen={cancelFollowupOpen}
        onClose={() => setCancelFollowupOpen(false)}
        onConfirm={handleCancelFollowup}
        title="Cancel Document Request"
        isPending={cancelFollowup.isPending}
      />

      {/* Cancel line item modal */}
      <CancelReasonModal
        isOpen={!!cancelLineItemTarget}
        onClose={() => setCancelLineItemTarget(null)}
        onConfirm={handleCancelLineItem}
        title="Cancel Line Item"
        isPending={cancelLineItem.isPending}
      />
    </div>
  );
}

/**
 * Banner shown on the checker's task page when there is an open followup.
 * Reads from useOpenFollowupsForTask and expands to show line item details.
 * Cancel controls inside the expanded view are only shown to the raising user.
 */
export function OpenFollowupBanner({ raisingTaskId }: OpenFollowupBannerProps) {
  const { data: followups = [], isLoading } = useOpenFollowupsForTask(raisingTaskId);
  const [expanded, setExpanded] = useState(true);
  // Granular selector — avoids re-renders on unrelated auth store changes
  const currentUserId = useAuthStore(s => s.user?.id);

  if (isLoading) return null;

  const openFollowups = followups.filter(f => f.status === 'Open');
  if (openFollowups.length === 0) return null;

  const totalPending = openFollowups.reduce((sum, f) => sum + (f.pendingCount ?? 0), 0);

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Banner header */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-100/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name="file-circle-exclamation" style="solid" className="size-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            Open Document Request
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            {totalPending} item{totalPending !== 1 ? 's' : ''} pending from the request maker
            — submission is blocked until resolved
          </p>
        </div>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          style="solid"
          className="size-4 text-amber-500 shrink-0"
        />
      </button>

      {/* Expandable details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-amber-100 pt-3 space-y-4">
          {openFollowups.map(f => (
            <FollowupDetail
              key={f.id}
              followupId={f.id}
              raisingTaskId={raisingTaskId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
