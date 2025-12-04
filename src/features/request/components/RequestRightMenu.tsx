import Icon from '@/shared/components/Icon';
import clsx from 'clsx';
import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

const RequestRightMenu = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments'>('overview');
  const [newComment, setNewComment] = useState('');

  const { control } = useFormContext();
  const { append, remove } = useFieldArray({ control, name: 'comments' });
  const comments = (useWatch({ control, name: 'comments' }) || []) as { comment: string }[];
  const titles = (useWatch({ control, name: 'titles' }) || []) as { titleDocuments?: unknown[] }[];

  // Count total title documents across all titles
  const totalTitleDocs = titles.reduce((sum, title) => sum + (title.titleDocuments?.length || 0), 0);

  const handleAddComment = () => {
    if (newComment.trim()) {
      append({ comment: newComment.trim() });
      setNewComment('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4 shrink-0">
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

      {/* Content */}
      {activeTab === 'overview' ? (
        <div className="flex flex-col gap-5 flex-1 overflow-y-auto min-h-0">
          {/* Status */}
          <div>
            <SidebarLabel>Status</SidebarLabel>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                <Icon style="solid" name="circle" className="size-1.5" />
                Draft
              </span>
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
                role="Requestor"
                name="Reacher Doe"
                avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                isMe
              />
              <PersonRow
                role="Creator"
                name="Reacher Doe"
                avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                isMe
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Comments list - scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
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
                {comments.map((comment, index) => (
                  <div
                    key={index}
                    className="group relative p-2.5 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <img
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt=""
                        className="w-6 h-6 rounded-full shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-900">Me</span>
                          <span className="text-xs text-gray-400">Just now</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 break-words">
                          {comment.comment}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-all shrink-0"
                        title="Delete"
                      >
                        <Icon style="solid" name="xmark" className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment input - fixed at bottom */}
          <div className="shrink-0 pt-3 mt-3 border-t border-gray-100">
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
        </div>
      )}
    </div>
  );
};

/* Helper Components */

const SidebarLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{children}</div>
);

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  muted?: boolean;
}

const InfoRow = ({ icon, label, value, muted }: InfoRowProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Icon style="regular" name={icon} className="size-3.5 text-gray-400" />
      {label}
    </div>
    <span className={clsx('text-xs font-medium', muted ? 'text-gray-400' : 'text-gray-700')}>
      {value}
    </span>
  </div>
);

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
}

const StatCard = ({ label, value, icon }: StatCardProps) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
    <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center shadow-sm">
      <Icon style="regular" name={icon} className="size-3.5 text-gray-500" />
    </div>
    <div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  </div>
);

interface PersonRowProps {
  role: string;
  name: string;
  avatar: string;
  isMe?: boolean;
}

const PersonRow = ({ role, name, avatar, isMe }: PersonRowProps) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
    <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover" />
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-gray-900 truncate">
        {name}
        {isMe && (
          <span className="ml-1 text-xs text-primary-600 font-normal">(Me)</span>
        )}
      </div>
      <div className="text-xs text-gray-500">{role}</div>
    </div>
  </div>
);

export default RequestRightMenu;
