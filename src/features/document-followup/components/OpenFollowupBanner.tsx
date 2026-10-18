import '@/features/document-followup/i18n';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { useGetDocumentTypes, getDocumentTypeName } from '@/features/request/api/documentTypes';
import { useAuthStore } from '@/features/auth/store';
import { useOpenFollowupsForTask } from '../hooks/useOpenFollowupsForTask';
import { useGetFollowupById } from '../hooks/useGetFollowupById';
import { useCancelFollowup } from '../hooks/useCancelFollowup';
import { useCancelLineItem } from '../hooks/useCancelLineItem';
import { LineItemStatusBadge } from './LineItemStatusBadge';
import { makeCancelWithReasonSchema, type CancelWithReasonFormValues } from '../schemas/followup';

const formatRaisedAt = (d: string) => {
  try {
    return format(new Date(d), 'dd/MM/yyyy HH:mm');
  } catch {
    return d;
  }
};

interface OpenFollowupBannerProps {
  /** The taskId of the raising task (checker's task) */
  raisingTaskId: string;
  /**
   * Info-only variant for the Decision screen: the same slim line and list, but no cancel
   * links in any role. The Document Checklist page renders the interactive banner.
   */
  compact?: boolean;
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
  const { t } = useTranslation(['documentFollowup', 'common']);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CancelWithReasonFormValues>({
    resolver: zodResolver(makeCancelWithReasonSchema(t)),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal modal-open z-[70]" role="dialog" aria-modal="true">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-sm">
        <div className="flex flex-col">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4 mx-auto">
            <Icon name="circle-exclamation" style="solid" className="size-7 text-amber-500" />
          </div>
          <h3 className="font-semibold text-base text-gray-900 mb-1 text-center">{title}</h3>
          <p className="text-sm text-gray-500 mb-4 text-center">
            {t('cancelReasonModal.cancelReasonSubtitle')}
          </p>
          <form onSubmit={handleSubmit(values => onConfirm(values.reason))} noValidate>
            <div className="mb-4">
              <textarea
                {...register('reason')}
                rows={3}
                placeholder={t('cancelReasonModal.reasonPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
              />
              {errors.reason && <p className="text-xs text-danger mt-1">{errors.reason.message}</p>}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {t('common:actions.back')}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                ) : null}
                {t('cancelReasonModal.confirm')}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={handleClose}>
        <button type="button">{t('aria.closeDialog')}</button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Renders the detail of a single open followup inline.
 * Cancel controls are only rendered when currentUserId matches the raising user.
 */
function FollowupDetail({
  followupId,
  raisingTaskId,
  currentUsername,
  showMeta,
  readOnly,
}: {
  followupId: string;
  raisingTaskId: string;
  currentUsername: string | undefined;
  /** Several requests are open, so each says who asked and when (a single one is in the banner line). */
  showMeta: boolean;
  /** Info-only: no cancel links, whoever is looking. */
  readOnly: boolean;
}) {
  const { t } = useTranslation('documentFollowup');
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
        {t('banner.loadingDetails')}
      </div>
    );
  }

  if (!followup) return null;

  // Only the user who raised the followup can cancel it or its line items.
  // Backend stores RaisingUserId as the username, and the DTO's raisedBy.userId carries
  // that same value — compare against the current user's username, not their GUID id.
  const isRaisingUser =
    !readOnly &&
    !!currentUsername &&
    currentUsername.toLowerCase() === followup.raisedBy.userId?.toLowerCase();

  // Resolve display name with graceful fallback for null (backend lookup may be pending)
  const raisedByLabel = followup.raisedBy.displayName ?? followup.raisedBy.userId ?? 'Unknown';

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
      {(showMeta || isRaisingUser) && (
        <div className="mb-1 flex items-center justify-between gap-3 text-xs text-gray-500">
          <span>
            {showMeta &&
              t('banner.byAt', { name: raisedByLabel, at: formatRaisedAt(followup.raisedAt) })}
          </span>
          {/* Cancel all — only visible to the user who raised the followup */}
          {isRaisingUser && (
            <button
              type="button"
              onClick={() => setCancelFollowupOpen(true)}
              className="font-medium text-danger hover:underline"
            >
              {t('banner.cancelAll')}
            </button>
          )}
        </div>
      )}

      {/* One compact row per document: name and code, the notes, the status and its action */}
      <div className="grid gap-1 text-xs">
        {followup.lineItems.map(item => (
          <div
            key={item.id}
            className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5"
          >
            <span className="min-w-0 truncate">
              <b className="font-semibold text-gray-800">
                {getDocumentTypeName(documentTypes, item.documentType)}
              </b>{' '}
              <span className="text-xs text-gray-400">{item.documentType}</span>
            </span>
            <span className="min-w-0 text-gray-600">
              <span className="line-clamp-2">{item.notes}</span>
              {(item.status === 'Declined' || item.status === 'Cancelled') && item.reason && (
                <span className="block text-danger">
                  {t('page.reasonPrefix')} {item.reason}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <LineItemStatusBadge status={item.status} />
              {/* Per-item cancel — only for the raising user, and only while it is still pending */}
              {isRaisingUser && item.status === 'Pending' && (
                <button
                  type="button"
                  onClick={() => setCancelLineItemTarget(item.id)}
                  className="text-primary hover:underline"
                  title={t('aria.cancelLineItem')}
                >
                  {t('banner.cancelItem')}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Cancel followup modal */}
      <CancelReasonModal
        isOpen={cancelFollowupOpen}
        onClose={() => setCancelFollowupOpen(false)}
        onConfirm={handleCancelFollowup}
        title={t('cancelReasonModal.cancelFollowupTitle')}
        isPending={cancelFollowup.isPending}
      />

      {/* Cancel line item modal */}
      <CancelReasonModal
        isOpen={!!cancelLineItemTarget}
        onClose={() => setCancelLineItemTarget(null)}
        onConfirm={handleCancelLineItem}
        title={t('cancelReasonModal.cancelLineItemTitle')}
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
export function OpenFollowupBanner({ raisingTaskId, compact = false }: OpenFollowupBannerProps) {
  const { t } = useTranslation('documentFollowup');
  const { data: followups = [], isLoading } = useOpenFollowupsForTask(raisingTaskId);
  // One slim line until the maker asks for the list
  const [expanded, setExpanded] = useState(false);
  // Granular selector — avoids re-renders on unrelated auth store changes.
  // We compare by username because the backend stores/returns the raising user as username.
  const currentUsername = useAuthStore(s => s.user?.username);

  if (isLoading) return null;

  const openFollowups = followups.filter(f => f.status === 'Open');
  if (openFollowups.length === 0) return null;

  const totalPending = openFollowups.reduce((sum, f) => sum + (f.pendingCount ?? 0), 0);

  // One request: who asked and when is in the line. Several: each says so in its own block.
  const only = openFollowups.length === 1 ? openFollowups[0] : null;
  const onlyBy = only ? (only.raisedBy.displayName ?? only.raisedBy.userId ?? 'Unknown') : '';

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-gray-700"
    >
      <b className="font-semibold text-amber-700">{t('banner.count', { n: totalPending })}</b>
      <span>
        {t('banner.waiting')}
        {only && ` · ${t('banner.byAt', { name: onlyBy, at: formatRaisedAt(only.raisedAt) })}`}
      </span>
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        aria-expanded={expanded}
        className="font-medium text-primary hover:underline"
      >
        {expanded ? t('banner.hide') : t('banner.show')}
      </button>

      {/* Expandable details */}
      {expanded && (
        <div className="grid w-full gap-3 border-t border-amber-200 pt-1.5">
          {openFollowups.map(f => (
            <FollowupDetail
              key={f.id}
              followupId={f.id}
              raisingTaskId={raisingTaskId}
              currentUsername={currentUsername}
              showMeta={openFollowups.length > 1}
              readOnly={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
