import { useState } from 'react';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import { SidebarLabel, InfoRow, PersonRow } from '@/shared/components/rightmenu';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useAppraisalContext } from '../context/AppraisalContext';
import { MapPreview } from './MapPreview';
import { useAuthStore } from '@/features/auth/store';
import { useAddComment, useUpdateComment, useDeleteComment, useGetComments } from '@/features/request/api';
import { getRelativeTimeString } from '@/shared/utils/dateUtils';

interface AppraisalRightMenuProps {
  onClose?: () => void;
}

const AppraisalRightMenu = ({ onClose }: AppraisalRightMenuProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { appraisal, isLoading } = useAppraisalContext();
  const requestId = appraisal?.requestId;
  const currentUser = useAuthStore((state) => state.user);

  // API queries and mutations
  const { data: commentsData, isLoading: isCommentsLoading } = useGetComments(requestId);
  const comments = commentsData?.comments ?? [];
  const addCommentMutation = useAddComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

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
    if (!newComment.trim() || !requestId || !currentUser) return;

    addCommentMutation.mutate(
      {
        requestId,
        data: {
          comment: newComment.trim(),
          commentedBy: currentUser.id,
          commentedByName: currentUser.name,
        },
      },
      {
        onSuccess: () => {
          setNewComment('');
          queryClient.invalidateQueries({ queryKey: ['comments', requestId] });
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || 'Failed to add comment');
        },
      },
    );
  };

  const handleEditClick = (commentId: string, commentText: string) => {
    setEditingId(commentId);
    setEditText(commentText);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSaveEdit = () => {
    if (!editText.trim() || !requestId || !editingId) return;

    updateCommentMutation.mutate(
      {
        requestId,
        commentId: editingId,
        comment: editText.trim(),
      },
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
  };

  const confirmDelete = () => {
    if (!deleteConfirmId || !requestId) return;

    deleteCommentMutation.mutate(
      {
        requestId,
        commentId: deleteConfirmId,
      },
      {
        onSuccess: () => {
          setDeleteConfirmId(null);
          queryClient.invalidateQueries({ queryKey: ['comments', requestId] });
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || 'Failed to delete comment');
        },
      },
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  // Format currency
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return 'Not set';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date/time
  const formatDateTime = (dateTime: string | null | undefined): string => {
    if (!dateTime) return 'Not set';
    try {
      const date = new Date(dateTime);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTime;
    }
  };

  // Get workflow stage label
  const getWorkflowStageLabel = (stage: string | undefined): string => {
    const stages: Record<string, string> = {
      pending_assignment: 'Pending Assignment',
      assigned: 'Assigned',
      field_inspection: 'Field Inspection',
      data_entry: 'Data Entry',
      review: 'Under Review',
      approved: 'Approved',
      completed: 'Completed',
    };
    return stages[stage?.toLowerCase().replace(/\s+/g, '_') || ''] || stage || 'Not started';
  };

  if (isLoading || !appraisal) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded w-20" />
            <div className="h-8 bg-gray-100 rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded w-20" />
            <div className="h-6 bg-gray-100 rounded" />
            <div className="h-6 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Application Details</h3>
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
            {/* Status & Workflow */}
            <div>
              <SidebarLabel>Status & Workflow</SidebarLabel>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge type="status" value={appraisal.status || 'draft'} />
                </div>
                <InfoRow
                  icon="diagram-project"
                  label="Stage"
                  value={getWorkflowStageLabel(appraisal.workflowStage)}
                  muted={!appraisal.workflowStage}
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <SidebarLabel>Purpose</SidebarLabel>
              <div className="mt-2">
                <InfoRow
                  icon="bullseye"
                  label="Type"
                  value={appraisal.purpose || 'Not set'}
                  muted={!appraisal.purpose}
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <SidebarLabel>Priority</SidebarLabel>
              <div className="mt-2">
                <Badge type="priority" value={appraisal.priority || 'normal'} />
              </div>
            </div>

            {/* Requestor */}
            <div>
              <SidebarLabel>Requestor</SidebarLabel>
              <div className="mt-2">
                <PersonRow
                  label="Requested by"
                  name={appraisal.requestor?.name || 'Not set'}
                  avatar={appraisal.requestor?.avatar || null}
                />
              </div>
            </div>

            {/* Appointment */}
            <div>
              <SidebarLabel>Appointment</SidebarLabel>
              <div className="mt-2 space-y-2">
                <InfoRow
                  icon="calendar"
                  label="Date/Time"
                  value={formatDateTime(appraisal.appointmentDateTime)}
                  muted={!appraisal.appointmentDateTime}
                />
                <InfoRow
                  icon="location-dot"
                  label="Location"
                  value={appraisal.appointmentLocation || 'Not set'}
                  muted={!appraisal.appointmentLocation}
                />
              </div>
            </div>

            {/* Fee Information */}
            <div>
              <SidebarLabel>Fee Information</SidebarLabel>
              <div className="mt-2 space-y-2">
                <InfoRow
                  icon="credit-card"
                  label="Payment Type"
                  value={appraisal.feePaymentType || 'Not set'}
                  muted={!appraisal.feePaymentType}
                />
                <InfoRow
                  icon="circle-check"
                  label="Payment Status"
                  value={appraisal.paymentStatus || 'Pending'}
                  muted={!appraisal.paymentStatus}
                />
                <InfoRow
                  icon="baht-sign"
                  label="Total Fee"
                  value={formatCurrency(appraisal.totalAppraisalFee)}
                  muted={appraisal.totalAppraisalFee === null || appraisal.totalAppraisalFee === undefined}
                />
              </div>
            </div>

            {/* Property Location Map */}
            <div>
              <SidebarLabel>Property Location</SidebarLabel>
              <div className="mt-2">
                <MapPreview
                  latitude={appraisal.propertyLatitude}
                  longitude={appraisal.propertyLongitude}
                  address={appraisal.appointmentLocation}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Comments list - scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              {isCommentsLoading ? (
                // Skeleton loading
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
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
                  {comments.map(comment => {
                    const isOwnComment = comment.commentedBy === currentUser?.id;
                    const isEditing = editingId === comment.id;
                    const displayName = comment.commentedBy === currentUser?.id ? 'Me' : comment.commentedByName;
                    const timeDisplay = getRelativeTimeString(comment.commentedAt);

                    return (
                      <div
                        key={comment.id}
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
                                onClick={handleSaveEdit}
                                disabled={!editText.trim() || updateCommentMutation.isPending}
                                className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/80 transition-colors disabled:opacity-50"
                              >
                                {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
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
                                  onClick={() => handleEditClick(comment.id, comment.comment)}
                                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary hover:bg-primary-50 transition-all"
                                  title="Edit"
                                >
                                  <Icon style="regular" name="pen" className="size-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(comment.id)}
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
                  disabled={!requestId || addCommentMutation.isPending}
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || !requestId || addCommentMutation.isPending}
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
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
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

export default AppraisalRightMenu;
