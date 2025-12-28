import { useState } from 'react';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import { SidebarLabel, InfoRow, PersonRow } from '@/shared/components/rightmenu';
import { useAppraisalContext } from '../context/AppraisalContext';

interface AppraisalRightMenuProps {
  onClose?: () => void;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
}

const AppraisalRightMenu = ({ onClose }: AppraisalRightMenuProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const { appraisal, isLoading } = useAppraisalContext();

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      text: newComment.trim(),
      author: 'Me',
      createdAt: new Date(),
    };
    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              activeTab === 'comments'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Comments
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
                  {comments.map(comment => (
                    <div key={comment.id} className="p-2.5 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-medium text-primary-700">
                            {getInitials(comment.author)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-900">{comment.author}</span>
                            <span className="text-xs text-gray-400">{getRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 break-words">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
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

export default AppraisalRightMenu;
