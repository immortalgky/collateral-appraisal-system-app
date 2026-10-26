import { useState, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Avatar from '@/shared/components/Avatar';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useAuthStore } from '@/features/auth/store';
import { getRelativeTimeString } from '@/shared/utils/dateUtils';
import type { ApiError } from '@/shared/types/api';
import { useAddComment, useUpdateComment, useDeleteComment, useGetComments } from '../../api';

/** What the axios interceptor attaches to a failed request (shared/api/axiosInstance.ts). */
type ApiFailure = Error & { apiError?: Pick<ApiError, 'detail'> };

// Local comment type for create mode (before request is saved)
export interface LocalComment {
  tempId: string;
  comment: string;
  commentedBy: string;
  commentedByName: string;
  commentedAt: string;
  lastModifiedAt?: string | null;
}

// Combined comment type that works for both local and API comments
// - API comments have `id` and `requestId` but no `tempId`
// - Local comments have `tempId` but no `id` or `requestId`
type CommentItem = {
  id?: string; // Only present for API comments
  tempId?: string; // Only present for local comments
  requestId?: string; // Only present for API comments
  comment: string;
  commentedBy: string;
  commentedByName: string;
  commentedAt: string;
  lastModifiedAt?: string | null;
};

interface RequestCommentsProps {
  /** undefined = creating a new request (comments stay local), defined = editing an existing one */
  requestId?: string;
  /** Create mode only: the page owns the list so it survives the drawer closing and goes out with the create call. */
  localComments: LocalComment[];
  onLocalCommentsChange: Dispatch<SetStateAction<LocalComment[]>>;
}

/**
 * The comment thread of a request: bubbles, edit / delete on your own, and the input.
 * Edit mode reads and writes through the comment API; create mode edits `localComments`.
 */
const RequestComments = ({
  requestId,
  localComments,
  onLocalCommentsChange: setLocalComments,
}: RequestCommentsProps) => {
  const { t } = useTranslation(['request', 'common']);
  const [newComment, setNewComment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);

  // API queries and mutations - only enabled when requestId exists
  const { data: apiCommentsData, isLoading: isCommentsLoading } = useGetComments(requestId);
  const addCommentMutation = useAddComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  // Edit mode: use API data directly. Create mode: use local state.
  const comments: CommentItem[] = requestId ? (apiCommentsData?.comments ?? []) : localComments;

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const commentData: LocalComment = {
      tempId: `temp-${Date.now()}`,
      comment: newComment.trim(),
      commentedBy: currentUser?.username || 'anonymous',
      commentedByName:
        `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() ||
        currentUser?.username ||
        'Anonymous User',
      commentedAt: new Date().toISOString(),
      lastModifiedAt: null,
    };

    if (!requestId) {
      // Create mode: add to local state
      setLocalComments(prev => [...prev, commentData]);
      setNewComment('');
    } else {
      // Edit mode: call API directly
      addCommentMutation.mutate(
        {
          requestId,
          data: {
            comment: commentData.comment,
            commentedBy: commentData.commentedBy,
            commentedByName: commentData.commentedByName,
          },
        },
        {
          onSuccess: () => {
            setNewComment('');
            queryClient.invalidateQueries({ queryKey: ['comments', requestId] });
            toast.success(t('toasts.commentAdded'));
          },
          onError: (error: ApiFailure) => {
            toast.error(error.apiError?.detail || t('toasts.commentAddFailed'));
          },
        },
      );
    }
  };

  const handleEditClick = (index: number, comment: CommentItem) => {
    setEditingIndex(index);
    setEditText(comment.comment);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleSaveEdit = (index: number) => {
    const comment = comments[index];
    const trimmedText = editText.trim();

    if (!trimmedText) {
      handleCancelEdit();
      return;
    }

    if (!requestId) {
      // Create mode: update local state
      setLocalComments(prev =>
        prev.map((c, i) =>
          i === index
            ? { ...c, comment: trimmedText, lastModifiedAt: new Date().toISOString() }
            : c,
        ),
      );
      handleCancelEdit();
    } else {
      // Edit mode: call API
      updateCommentMutation.mutate(
        { requestId, commentId: comment.id!, comment: trimmedText },
        {
          onSuccess: () => {
            handleCancelEdit();
            queryClient.invalidateQueries({ queryKey: ['comments', requestId] });
          },
          onError: (error: ApiFailure) => {
            toast.error(error.apiError?.detail || t('toasts.commentUpdateFailed'));
          },
        },
      );
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmIndex === null) return;
    const comment = comments[deleteConfirmIndex];

    if (!requestId) {
      // Create mode: remove from local state
      setLocalComments(prev => prev.filter((_, i) => i !== deleteConfirmIndex));
    } else {
      // Edit mode: call API
      deleteCommentMutation.mutate(
        { requestId, commentId: comment.id! },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', requestId] });
          },
          onError: (error: ApiFailure) => {
            toast.error(error.apiError?.detail || t('toasts.commentDeleteFailed'));
          },
        },
      );
    }
    setDeleteConfirmIndex(null);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Comments list - scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isCommentsLoading && requestId ? (
          // Skeleton loading - alternating left/right bubbles
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={clsx('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                {i % 2 !== 0 && (
                  <div className="flex max-w-[80%] items-start gap-2">
                    <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-(--palette-line)" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="h-3 w-16 animate-pulse rounded bg-(--palette-line)" />
                        <div className="h-3 w-10 animate-pulse rounded bg-(--palette-line)" />
                      </div>
                      <div className="animate-pulse rounded-2xl rounded-tl-sm bg-(--palette-surface-3) px-3 py-2">
                        <div className="h-3 w-full rounded bg-(--palette-surface-3)" />
                        <div className="mt-1 h-3 w-2/3 rounded bg-(--palette-line)" />
                      </div>
                    </div>
                  </div>
                )}
                {i % 2 === 0 && (
                  <div className="max-w-[80%]">
                    <div className="animate-pulse rounded-2xl rounded-tr-sm bg-primary/20 px-3 py-2">
                      <div className="h-3 w-full rounded bg-primary/30" />
                      <div className="mt-1 h-3 w-1/2 rounded bg-primary/30" />
                    </div>
                    <div className="mt-1 ml-auto h-3 w-10 animate-pulse rounded bg-(--palette-line)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-(--palette-surface-3)">
              <Icon style="regular" name="comments" className="size-5! text-(--palette-gray-400)" />
            </div>
            <p className="text-sm text-(--palette-gray-500)">{t('rightMenu.noComments')}</p>
            <p className="mt-1 text-xs text-(--palette-gray-400)">
              {t('rightMenu.noCommentsHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment, index) => {
              const isOwnComment = comment.commentedBy === currentUser?.username;
              const isEditing = editingIndex === index;
              const timeDisplay = getRelativeTimeString(comment.commentedAt);

              return (
                <div
                  key={comment.id || comment.tempId || index}
                  className={clsx('flex', isOwnComment ? 'justify-end' : 'justify-start')}
                >
                  {isOwnComment ? (
                    // Own comment - right-aligned, primary bubble
                    <div className="group max-w-[80%]">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="w-full resize-none rounded-2xl rounded-tr-sm border border-primary/30 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            rows={2}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="rounded px-2 py-1 text-xs text-(--palette-gray-600) transition-colors hover:bg-(--palette-surface-3)"
                            >
                              {t('common:actions.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(index)}
                              disabled={!editText.trim()}
                              className="rounded bg-primary px-2 py-1 text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
                            >
                              {t('common:actions.save')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-row-reverse items-start gap-1">
                          <div className="min-w-0 overflow-hidden rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-white">
                            <p className="text-sm break-words break-all">{comment.comment}</p>
                            {comment.lastModifiedAt && (
                              <span className="text-xs text-white/70">{t('rightMenu.edited')}</span>
                            )}
                          </div>
                          {/* Hover actions - appear to the left of bubble */}
                          <div className="flex shrink-0 gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleEditClick(index, comment)}
                              className="flex h-5 w-5 items-center justify-center rounded text-(--palette-gray-400) transition-all hover:bg-(--palette-accent-wash) hover:text-(--palette-primary-text)"
                              title={t('common:actions.edit')}
                            >
                              <Icon style="regular" name="pen" className="size-2.5!" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmIndex(index)}
                              className="flex h-5 w-5 items-center justify-center rounded text-(--palette-gray-400) transition-all hover:bg-(--palette-req-wash) hover:text-danger-500"
                              title={t('common:actions.delete')}
                            >
                              <Icon style="solid" name="xmark" className="size-3!" />
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="mt-0.5 text-right text-xs text-(--palette-gray-400)">
                        {timeDisplay}
                      </p>
                    </div>
                  ) : (
                    // Others' comment - left-aligned, gray bubble with avatar
                    <div className="flex max-w-[80%] items-start gap-2">
                      <div className="mt-4">
                        <Avatar name={comment.commentedByName} size="xs" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-xs font-medium text-(--palette-ink)">
                            {comment.commentedByName}
                          </span>
                          <span className="text-xs text-(--palette-gray-400)">{timeDisplay}</span>
                        </div>
                        <div className="min-w-0 overflow-hidden rounded-2xl rounded-tl-sm bg-(--palette-surface-3) px-3 py-2 text-(--palette-ink)">
                          <p className="text-sm break-words break-all">{comment.comment}</p>
                          {comment.lastModifiedAt && (
                            <span className="text-xs text-(--palette-gray-400)">
                              {t('rightMenu.edited')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comment input - fixed at bottom */}
      <div className="shrink-0 border-t border-(--palette-line-soft) p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('rightMenu.commentPlaceholder')}
            className="flex-1 rounded-lg border border-(--palette-line) bg-(--palette-surface) px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            aria-label={t('page.comments.send')}
            className="rounded-lg bg-primary px-2.5 py-2 text-white transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon style="solid" name="paper-plane" className="size-3.5!" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmIndex !== null}
        onClose={() => setDeleteConfirmIndex(null)}
        onConfirm={confirmDelete}
        title={t('confirm.deleteCommentTitle')}
        message={t('confirm.deleteCommentMessage')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />
    </div>
  );
};

export default RequestComments;
