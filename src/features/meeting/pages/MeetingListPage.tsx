import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useHasPermission } from '@/shared/hooks/useHasPermission';
import {
  CANCEL_ELIGIBLE,
  CUT_OFF_ELIGIBLE,
  MEETING_PERMISSIONS,
  MEETING_STATUS_LABELS,
  MEETING_STATUS_OPTIONS,
  RESEND_INVITATION_ELIGIBLE,
} from '../constants';

import { useGetMeetings } from '../api/meetings';
import type { MeetingListItemDto, MeetingStatus } from '../api/types';
import BulkCreateMeetingsDialog from '../components/BulkCreateMeetingsDialog';
import CancelMeetingDialog from '../components/CancelMeetingDialog';
import CutOffReviewDialog from '../components/CutOffReviewDialog';
import MeetingFormDialog from '../components/MeetingFormDialog';
import MeetingNoBadge from '../components/MeetingNoBadge';
import MeetingStatusBadge from '../components/MeetingStatusBadge';
import SendInvitationDialog from '../components/SendInvitationDialog';

// ── helpers ───────────────────────────────────────────────────────────────────

const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ── Row action menu ───────────────────────────────────────────────────────────

interface RowAction {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'danger';
}

interface RowActionsMenuProps {
  actions: RowAction[];
}

const RowActionsMenu = ({ actions }: RowActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Row actions"
      >
        <Icon name="ellipsis-vertical" style="solid" className="size-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={e => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]">
            {actions.map(action => (
              <button
                key={action.label}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setOpen(false);
                  action.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                  action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                }`}
              >
                <Icon name={action.icon} style="solid" className="size-3.5 shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Meeting row actions logic ─────────────────────────────────────────────────

interface MeetingRowProps {
  meeting: MeetingListItemDto;
  isAdmin: boolean;
  onNavigate: (id: string) => void;
  onCutOff: (meeting: MeetingListItemDto) => void;
  onSendInvitation: (meeting: MeetingListItemDto) => void;
  onResendInvitation: (meeting: MeetingListItemDto) => void;
  onCancel: (meeting: MeetingListItemDto) => void;
}

const MeetingRow = ({
  meeting,
  isAdmin,
  onNavigate,
  onCutOff,
  onSendInvitation,
  onResendInvitation,
  onCancel,
}: MeetingRowProps) => {
  const { status } = meeting;
  const isNew = status === 'New';

  const actions: RowAction[] = [];

  if (isAdmin && CUT_OFF_ELIGIBLE.has(status)) {
    actions.push({ label: 'Cut Off', icon: 'scissors', onClick: () => onCutOff(meeting) });
  }

  if (isAdmin && isNew && meeting.itemCount > 0) {
    actions.push({
      label: 'Send Invitation',
      icon: 'envelope',
      onClick: () => onSendInvitation(meeting),
    });
  }

  if (isAdmin && RESEND_INVITATION_ELIGIBLE.has(status)) {
    actions.push({
      label: 'Resend Invitation',
      icon: 'paper-plane',
      onClick: () => onResendInvitation(meeting),
    });
  }

  if (isAdmin && CANCEL_ELIGIBLE.has(status)) {
    actions.push({
      label: 'Cancel',
      icon: 'xmark',
      onClick: () => onCancel(meeting),
      variant: 'danger',
    });
  }

  return (
    <tr
      key={meeting.id}
      onClick={() => onNavigate(meeting.id)}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-4 py-3">
        <MeetingNoBadge meetingNo={meeting.meetingNo} />
      </td>
      <td className="px-4 py-3 text-gray-900 font-medium">{meeting.title}</td>
      <td className="px-4 py-3">
        <MeetingStatusBadge status={meeting.status} />
      </td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(meeting.startAt)}</td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(meeting.endAt)}</td>
      <td className="px-4 py-3 text-gray-600">{meeting.location ?? '—'}</td>
      <td className="px-4 py-3 text-right text-gray-600">{meeting.itemCount}</td>
      <td
        className="px-3 py-3 text-right"
        onClick={e => e.stopPropagation()}
      >
        <RowActionsMenu actions={actions} />
      </td>
    </tr>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const MeetingListPage = () => {
  const navigate = useNavigate();
  const hasAdmin = useHasPermission(MEETING_PERMISSIONS.ADMIN);
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | ''>('');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const newMeetingDialog = useDisclosure();
  const bulkCreateDialog = useDisclosure();
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingListItemDto | null>(null);
  const [isResend, setIsResend] = useState(false);
  const cutOffDialog = useDisclosure();
  const sendInvitationDialog = useDisclosure();
  const cancelDialog = useDisclosure();

  const { data, isLoading } = useGetMeetings({
    status: statusFilter || undefined,
    pageNumber,
    pageSize,
  });

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleCutOff = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    cutOffDialog.onOpen();
  };

  const handleSendInvitation = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    setIsResend(false);
    sendInvitationDialog.onOpen();
  };

  const handleResendInvitation = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    setIsResend(true);
    sendInvitationDialog.onOpen();
  };

  const handleCancel = (meeting: MeetingListItemDto) => {
    setSelectedMeeting(meeting);
    cancelDialog.onOpen();
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Meetings</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Schedule tier-3 committee meetings and release appraisals for voting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate('/meetings/queue')}>
            <Icon name="hourglass-half" style="solid" className="size-3.5 mr-1.5" />
            View Queue
          </Button>
          {hasAdmin && (
            <Button size="sm" variant="ghost" onClick={bulkCreateDialog.onOpen}>
              <Icon name="calendar-days" style="solid" className="size-3.5 mr-1.5" />
              Bulk Create
            </Button>
          )}
          {hasAdmin && (
            <Button size="sm" onClick={newMeetingDialog.onOpen}>
              <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
              New Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 flex items-center gap-3 pb-1">
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as MeetingStatus | '');
            setPageNumber(0);
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white min-w-32"
        >
          <option value="">All Status</option>
          {MEETING_STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>
              {MEETING_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Meeting No.
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Title</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Status</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Start
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  End
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Location</th>
                <th className="text-right font-medium text-gray-600 px-4 py-2.5">Items</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    <Icon
                      name="spinner"
                      style="solid"
                      className="w-5 h-5 animate-spin inline-block"
                    />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No meetings found.
                  </td>
                </tr>
              ) : (
                items.map(meeting => (
                  <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    isAdmin={hasAdmin}
                    onNavigate={id => navigate(`/meetings/${id}`)}
                    onCutOff={handleCutOff}
                    onSendInvitation={handleSendInvitation}
                    onResendInvitation={handleResendInvitation}
                    onCancel={handleCancel}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalCount > 0 && (
          <div className="shrink-0 border-t border-gray-200">
            <Pagination
              currentPage={pageNumber}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPageNumber}
              onPageSizeChange={size => {
                setPageSize(size);
                setPageNumber(0);
              }}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <MeetingFormDialog
        isOpen={newMeetingDialog.isOpen}
        onClose={newMeetingDialog.onClose}
        onSuccess={id => navigate(`/meetings/${id}`)}
      />

      <BulkCreateMeetingsDialog
        isOpen={bulkCreateDialog.isOpen}
        onClose={bulkCreateDialog.onClose}
      />

      {selectedMeeting && (
        <>
          <CutOffReviewDialog
            isOpen={cutOffDialog.isOpen}
            onClose={() => {
              cutOffDialog.onClose();
              setSelectedMeeting(null);
            }}
            meetingId={selectedMeeting.id}
          />

          <SendInvitationDialog
            isOpen={sendInvitationDialog.isOpen}
            onClose={() => {
              sendInvitationDialog.onClose();
              setSelectedMeeting(null);
              setIsResend(false);
            }}
            meetingId={selectedMeeting.id}
            meetingNo={selectedMeeting.meetingNo}
            isResend={isResend}
          />

          <CancelMeetingDialog
            isOpen={cancelDialog.isOpen}
            onClose={() => {
              cancelDialog.onClose();
              setSelectedMeeting(null);
            }}
            meetingId={selectedMeeting.id}
          />
        </>
      )}
    </div>
  );
};

export default MeetingListPage;
