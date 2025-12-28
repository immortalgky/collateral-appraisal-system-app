import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import clsx from 'clsx';
import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useAuthStore } from '@/features/auth/store';
import toast from 'react-hot-toast';
import { getRelativeTimeString } from '@/shared/utils/dateUtils';
import type { UserDtoType, RequestCommentDtoType } from '../schemas/form';
import { useAddComment, useUpdateComment, useDeleteComment } from '../api';
import { SidebarLabel, InfoRow, StatCard, PersonRow } from '@/shared/components/rightmenu';

interface RequestRightMenuProps {
  onRequestorClick?: () => void;
  requestId?: string; // undefined = creating new request, defined = editing existing request
  onClose?: () => void;
}

const RequestRightMenu = ({ onRequestorClick, requestId, onClose }: RequestRightMenuProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const { control, setValue, getValues } = useFormContext();
  const { append, remove } = useFieldArray({ control, name: 'comments' });
  const comments = (useWatch({ control, name: 'comments' }) || []) as RequestCommentDtoType[];
  const titles = (useWatch({ control, name: 'titles' }) || []) as { titleDocuments?: unknown[] }[];
  const creator = useWatch({ control, name: 'creator' }) as UserDtoType | null;
  const requestor = useWatch({ control, name: 'requestor' }) as UserDtoType | null;

  const currentUser = useAuthStore(state => state.user);

  // API mutations
  const addCommentMutation = useAddComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

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

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const commentData: RequestCommentDtoType = {
      tempId: `temp-${Date.now()}`,
      comment: newComment.trim(),
      commentedBy: currentUser?.id || '',
      commentedByName: currentUser?.name || '',
      commentedAt: new Date().toISOString(),
      lastModifiedAt: null,
      isLocal: true,
    };

    if (!requestId) {
      // No requestId yet - just add to form state
      append(commentData);
      setNewComment('');
    } else {
      // Has requestId - call API, then update form state
      append(commentData); // Optimistic add
      setNewComment('');

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
            // Update with real ID from server - mark as not local
            const currentComments = getValues('comments') as RequestCommentDtoType[];
            const idx = currentComments.findIndex(c => c.tempId === commentData.tempId);
            if (idx >= 0) {
              setValue(`comments.${idx}.isLocal`, false);
            }
          },
          onError: () => {
            // Revert - remove the optimistic comment
            const currentComments = getValues('comments') as RequestCommentDtoType[];
            const idx = currentComments.findIndex(c => c.tempId === commentData.tempId);
            if (idx >= 0) remove(idx);
            toast.error('Failed to add comment');
          },
        },
      );
    }
  };

  const handleEditClick = (index: number, comment: RequestCommentDtoType) => {
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

    if (!requestId || comment.isLocal) {
      // Local only - update form state
      setValue(`comments.${index}.comment`, trimmedText);
      setValue(`comments.${index}.lastModifiedAt`, new Date().toISOString());
      handleCancelEdit();
    } else {
      // Has requestId and saved - call API
      const originalComment = comment.comment;
      setValue(`comments.${index}.comment`, trimmedText); // Optimistic
      handleCancelEdit();

      updateCommentMutation.mutate(
        { requestId, commentId: comment.id!, comment: trimmedText },
        {
          onSuccess: () => {
            setValue(`comments.${index}.lastModifiedAt`, new Date().toISOString());
          },
          onError: () => {
            setValue(`comments.${index}.comment`, originalComment); // Revert
            toast.error('Failed to update comment');
          },
        },
      );
    }
  };

  const handleDelete = (index: number) => {
    const comment = comments[index];

    if (!requestId || comment.isLocal) {
      // Local only - just remove from form
      remove(index);
    } else {
      // Has requestId - call API with revert on failure
      const removedComment = { ...comment };
      remove(index); // Optimistic

      deleteCommentMutation.mutate(
        { requestId, commentId: comment.id! },
        {
          onError: () => {
            // Revert - re-add at same position
            const currentComments = getValues('comments') as RequestCommentDtoType[];
            currentComments.splice(index, 0, removedComment);
            setValue('comments', currentComments);
            toast.error('Failed to delete comment');
          },
        },
      );
    }
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
      <div className={clsx(
        "flex-1 min-h-0",
        activeTab === 'overview' ? "overflow-y-auto p-4" : "flex flex-col"
      )}>
        {activeTab === 'overview' ? (
          <div className="flex flex-col gap-5">
          {/* Status */}
          <div>
            <SidebarLabel>Status</SidebarLabel>
            <div className="flex items-center gap-2 mt-2">
              <Badge type="status" value="Draft" />
            </div>
          </div>

          {/* Key Dates */}
          <div>
            <SidebarLabel>Key Dates</SidebarLabel>
            <div className="mt-2 space-y-2">
              <InfoRow icon="calendar-plus" label="Created" value="Dec 3, 2025" />
              <InfoRow icon="calendar-clock" label="Due Date" value="Not set" muted />
              <InfoRow icon="calendar-check" label="Completed" value="-" muted />
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
                name={requestor?.name || currentUser?.name || 'Not set'}
                avatar={requestor?.avatar || null}
                isMe={requestor?.id === currentUser?.id || (!requestor && !!currentUser)}
                onClick={onRequestorClick}
                editable
              />
              <PersonRow
                label="Creator"
                name={creator?.name || currentUser?.name || 'Not set'}
                avatar={creator?.avatar || null}
                isMe={creator?.id === currentUser?.id || (!creator && !!currentUser)}
              />
            </div>
            </div>
          </div>
        ) : (
          <>
            {/* Comments list - scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
            {comments.length === 0 ? (
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
                  // Local comments are always editable (created in current session)
                  // Otherwise check if commentedBy matches current user
                  const isOwnComment = comment.isLocal || comment.commentedBy === currentUser?.id;
                  const isEditing = editingIndex === index;
                  const displayName =
                    comment.isLocal || comment.commentedBy === currentUser?.id
                      ? 'Me'
                      : comment.commentedByName;
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
                                onClick={() => handleDelete(index)}
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
                  disabled={!newComment.trim()}
                  className="px-2.5 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon style="solid" name="paper-plane" className="size-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RequestRightMenu;
