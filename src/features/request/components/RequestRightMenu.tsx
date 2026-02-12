import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import toast from 'react-hot-toast';
import { getRelativeTimeString } from '@/shared/utils/dateUtils';
import type { UserDtoType } from '../schemas/form';
import { useAddComment, useUpdateComment, useDeleteComment, useGetComments } from '../api';
import { SidebarLabel, InfoRow, StatCard, PersonRow } from '@/shared/components/rightmenu';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

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

// Request data from API (for edit mode)
interface RequestData {
  status?: string;
  createdAt?: string;
  dueDate?: string;
  completedAt?: string;
}

interface RequestRightMenuProps {
  onRequestorClick?: () => void;
  requestId?: string; // undefined = creating new request, defined = editing existing request
  onClose?: () => void;
  onLocalCommentsChange?: (comments: LocalComment[]) => void; // Callback for create mode
  requestData?: RequestData; // API data for status and dates
}

const RequestRightMenu = ({
  onRequestorClick,
  requestId,
  onClose,
  onLocalCommentsChange,
  requestData,
}: RequestRightMenuProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  // Local state for comments in create mode (no requestId)
  const [localComments, setLocalComments] = useState<LocalComment[]>([]);

  const queryClient = useQueryClient();
  const { control } = useFormContext();

  // Only use form state for overview tab data (titles, creator, requestor)
  const titles = (useWatch({ control, name: 'titles' }) || []) as { titleDocuments?: unknown[] }[];
  const creator = useWatch({ control, name: 'creator' }) as UserDtoType;
  const requestor = useWatch({ control, name: 'requestor' }) as UserDtoType;

  const currentUser = useAuthStore(state => state.user);

  // API queries and mutations - only enabled when requestId exists
  const { data: apiCommentsData, isLoading: isCommentsLoading } = useGetComments(requestId);
  const addCommentMutation = useAddComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  // Determine comment source based on mode
  // Edit mode: use API data directly
  // Create mode: use local state
  const comments: CommentItem[] = requestId
    ? (apiCommentsData?.comments ?? [])
    : localComments;

  // Notify parent when local comments change (for create mode)
  useEffect(() => {
    if (!requestId && onLocalCommentsChange) {
      onLocalCommentsChange(localComments);
    }
  }, [localComments, requestId, onLocalCommentsChange]);

  // Count total title documents across all titles
  const totalTitleDocs = titles.reduce(
    (sum, title) => sum + (title.titleDocuments?.length || 0),
    0,
  );

  // Helper to get initials from name
  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to format date
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const commentData: LocalComment = {
      tempId: `temp-${Date.now()}`,
      comment: newComment.trim(),
      commentedBy: currentUser?.username || 'anonymous',
      commentedByName: `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || currentUser?.username || 'Anonymous User',
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
            toast.success('Comment added');
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to add comment');
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
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update comment');
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
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to delete comment');
          },
        },
      );
    }
    setDeleteConfirmIndex(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Request Details</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Icon style="solid" name="xmark" className="size-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="shrink-0 px-4 pt-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={clsx(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              activeTab === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={clsx(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all relative',
              activeTab === 'comments'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Comments
            {comments.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-semibold bg-primary text-white rounded-full">
                {comments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={clsx(
          'flex-1 min-h-0',
          activeTab === 'overview' ? 'overflow-y-auto p-4' : 'flex flex-col',
        )}
      >
        {activeTab === 'overview' ? (
          <div className="flex flex-col gap-5">
            {/* Status */}
            <div>
              <SidebarLabel>Status</SidebarLabel>
              <div className="flex items-center gap-2 mt-2">
                <Badge type="status" value={requestData?.status || 'Draft'} />
              </div>
            </div>

            {/* Key Dates */}
            <div>
              <SidebarLabel>Key Dates</SidebarLabel>
              <div className="mt-2 space-y-2">
                <InfoRow
                  icon="calendar-plus"
                  label="Created"
                  value={formatDate(requestData?.createdAt)}
                  muted={!requestData?.createdAt}
                />
                <InfoRow
                  icon="calendar-clock"
                  label="Due Date"
                  value={requestData?.dueDate ? formatDate(requestData.dueDate) : 'Not set'}
                  muted={!requestData?.dueDate}
                />
                <InfoRow
                  icon="calendar-check"
                  label="Completed"
                  value={formatDate(requestData?.completedAt)}
                  muted={!requestData?.completedAt}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div>
              <SidebarLabel>Summary</SidebarLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StatCard label="Titles" value={String(titles.length)} icon="file-certificate" />
                <StatCard label="Attachments" value={String(totalTitleDocs)} icon="paperclip" />
              </div>
            </div>

            {/* People */}
            <div>
              <SidebarLabel>People</SidebarLabel>
              <div className="mt-2 space-y-2">
                <PersonRow
                  label="Requestor"
                  name={requestor.username || currentUser?.name || 'Not set'}
                  avatar={null}
                  isMe={requestor.username === currentUser?.username}
                  onClick={onRequestorClick}
                  editable
                />
                <PersonRow
                  label="Creator"
                  name={creator.username || currentUser?.name || 'Not set'}
                  avatar={null}
                  isMe={creator.username === currentUser?.username}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Comments list - scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              {isCommentsLoading && requestId ? (
                // Skeleton loading (only in edit mode)
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-2.5 bg-gray-50 rounded-lg animate-pulse">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-3 w-16 bg-gray-200 rounded" />
                            <div className="h-3 w-12 bg-gray-200 rounded" />
                          </div>
                          <div className="h-3 w-full bg-gray-200 rounded" />
                          <div className="h-3 w-2/3 bg-gray-200 rounded mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Icon style="regular" name="comments" className="size-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No comments yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add a comment below</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {comments.map((comment, index) => {
                    const isOwnComment = comment.commentedBy === currentUser?.username;
                    const isEditing = editingIndex === index;
                    const displayName = isOwnComment ? 'Me' : comment.commentedByName;
                    const timeDisplay = getRelativeTimeString(comment.commentedAt);

                    return (
                      <div
                        key={comment.id || comment.tempId || index}
                        className="group relative p-2.5 bg-gray-50 rounded-lg"
                      >
                        {isEditing ? (
                          // Edit mode
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(index)}
                                disabled={!editText.trim()}
                                className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/80 transition-colors disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-medium text-primary-700">
                                {getInitials(comment.commentedByName)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-900">
                                  {displayName}
                                </span>
                                <span className="text-xs text-gray-400">{timeDisplay}</span>
                                {comment.lastModifiedAt && (
                                  <span className="text-xs text-gray-400 italic">(edited)</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5 break-words">
                                {comment.comment}
                              </p>
                            </div>
                            {/* Show edit/delete only for own comments */}
                            {isOwnComment && (
                              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(index, comment)}
                                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary hover:bg-primary-50 transition-all"
                                  title="Edit"
                                >
                                  <Icon style="regular" name="pen" className="size-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmIndex(index)}
                                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-all"
                                  title="Delete"
                                >
                                  <Icon style="solid" name="xmark" className="size-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment input - fixed at bottom */}
            <div className="shrink-0 p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="px-2.5 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon style="solid" name="paper-plane" className="size-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmIndex !== null}
        onClose={() => setDeleteConfirmIndex(null)}
        onConfirm={confirmDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default RequestRightMenu;
