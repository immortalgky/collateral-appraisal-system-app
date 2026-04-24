import { useNavigate, useParams } from 'react-router-dom';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useHasPermission } from '@/shared/hooks/useHasPermission';
import {
  CANCEL_ELIGIBLE,
  CUT_OFF_ELIGIBLE,
  EDIT_ELIGIBLE,
  ITEM_ACTION_ELIGIBLE,
  MEETING_PERMISSIONS,
  RESEND_INVITATION_ELIGIBLE,
} from '../constants';

import { useGetMeetingDetail } from '../api/meetings';
import AddItemsDialog from '../components/AddItemsDialog';
import AgendaForm from '../components/AgendaForm';
import CancelMeetingDialog from '../components/CancelMeetingDialog';
import CutOffReviewDialog from '../components/CutOffReviewDialog';
import MeetingFormDialog from '../components/MeetingFormDialog';
import MeetingItemsGrouped from '../components/MeetingItemsGrouped';
import MeetingMembersTable from '../components/MeetingMembersTable';
import MeetingNoBadge from '../components/MeetingNoBadge';
import MeetingStatusBadge from '../components/MeetingStatusBadge';
import SendInvitationDialog from '../components/SendInvitationDialog';

// ── Formatting helpers ────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

const MeetingDetailPage = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams<{ meetingId: string }>();
  const { data: meeting, isLoading } = useGetMeetingDetail(meetingId);

  const hasAdmin = useHasPermission(MEETING_PERMISSIONS.ADMIN);
  const hasSecretary = useHasPermission(MEETING_PERMISSIONS.SECRETARY);

  const editDialog = useDisclosure();
  const cutOffDialog = useDisclosure();
  const sendInvitationDialog = useDisclosure();
  const resendInvitationDialog = useDisclosure();
  const cancelDialog = useDisclosure();
  const addItemsDialog = useDisclosure();

  if (isLoading || !meeting) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const { status } = meeting;
  const isEditable = EDIT_ELIGIBLE.has(status);
  const isNew = status === 'New';
  const isEnded = status === 'Ended';
  const isCancelled = status === 'Cancelled';
  const isRoutedBack = status === 'RoutedBack';
  const isInProgress = status === 'InProgress';

  const totalDecision = meeting.items.decisionItems.reduce((s, g) => s + g.items.length, 0);
  const totalAck = meeting.items.acknowledgementItems.reduce((s, g) => s + g.items.length, 0);
  const totalItems = totalDecision + totalAck;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 overflow-y-auto pb-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/meetings')} type="button">
            <Icon name="arrow-left" style="solid" className="size-3.5 mr-1.5" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <MeetingNoBadge meetingNo={meeting.meetingNo} />
              <h2 className="text-base font-semibold text-gray-900">{meeting.title}</h2>
              <MeetingStatusBadge status={meeting.status} />
            </div>
          </div>
        </div>

        {/* Action bar — gated by status + MEETING_ADMIN permission */}
        {hasAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            {isEditable && (
              <Button variant="ghost" size="sm" type="button" onClick={editDialog.onOpen}>
                <Icon name="pen" style="solid" className="size-3.5 mr-1.5" />
                Edit
              </Button>
            )}

            {CUT_OFF_ELIGIBLE.has(status) && (
              <Button size="sm" type="button" onClick={cutOffDialog.onOpen}>
                <Icon name="scissors" style="solid" className="size-3.5 mr-1.5" />
                Cut Off
              </Button>
            )}

            {isNew && totalItems > 0 && (
              <Button size="sm" type="button" onClick={sendInvitationDialog.onOpen}>
                <Icon name="envelope" style="solid" className="size-3.5 mr-1.5" />
                Send Invitation
              </Button>
            )}

            {RESEND_INVITATION_ELIGIBLE.has(status) && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={resendInvitationDialog.onOpen}
              >
                <Icon name="paper-plane" style="solid" className="size-3.5 mr-1.5" />
                Resend Invitation
              </Button>
            )}

            {CANCEL_ELIGIBLE.has(status) && (
              <Button variant="danger" size="sm" type="button" onClick={cancelDialog.onOpen}>
                <Icon name="xmark" style="solid" className="size-3.5 mr-1.5" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status banners */}
      {isEnded && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Icon name="circle-check" style="solid" className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700">
            Meeting ended
            {meeting.endedAt ? ` on ${formatDateTime(meeting.endedAt)}` : ''}.
          </p>
        </div>
      )}
      {isInProgress && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Icon
            name="circle-play"
            style="solid"
            className="w-5 h-5 text-blue-500 shrink-0"
          />
          <p className="text-sm font-medium text-blue-700">
            Meeting is in progress. Release decision items to approval, or route them back to staff.
          </p>
        </div>
      )}
      {isRoutedBack && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Icon
            name="arrow-rotate-left"
            style="solid"
            className="w-5 h-5 text-amber-500 shrink-0"
          />
          <p className="text-sm font-medium text-amber-700">
            One or more items have been routed back. Release all decision items to close the meeting.
          </p>
        </div>
      )}
      {isCancelled && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <Icon
            name="circle-xmark"
            style="solid"
            className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-red-700">
              Meeting cancelled. Items returned to the queue.
            </p>
            {meeting.cancelReason && (
              <p className="text-xs text-red-600 mt-0.5">Reason: {meeting.cancelReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Meeting Schedule */}
      <FormCard title="Meeting Schedule" icon="calendar" iconColor="blue">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Start</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDateTime(meeting.startAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">End</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDateTime(meeting.endAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Location</dt>
            <dd className="mt-1 text-sm text-gray-900">{meeting.location ?? '—'}</dd>
          </div>
          {meeting.fromText && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">From</dt>
              <dd className="mt-1 text-sm text-gray-900">{meeting.fromText}</dd>
            </div>
          )}
          {meeting.toText && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">To</dt>
              <dd className="mt-1 text-sm text-gray-900">{meeting.toText}</dd>
            </div>
          )}
          {meeting.cutOffAt && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Cut-Off At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateTime(meeting.cutOffAt)}</dd>
            </div>
          )}
          {meeting.invitationSentAt && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Invitation Sent</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDateTime(meeting.invitationSentAt)}
              </dd>
            </div>
          )}
          {meeting.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase">Notes</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{meeting.notes}</dd>
            </div>
          )}
        </dl>
      </FormCard>

      {/* Committee / Members */}
      <FormCard title="Committee Members" icon="users" iconColor="purple">
        <MeetingMembersTable
          meetingId={meeting.id}
          members={meeting.members}
          editable={hasAdmin && isEditable}
        />
      </FormCard>

      {/* Agenda */}
      <FormCard title="Agenda" icon="list-check" iconColor="amber">
        <AgendaForm
          meetingId={meeting.id}
          initialValues={{
            fromText: meeting.fromText,
            toText: meeting.toText,
            agendaCertifyMinutes: meeting.agendaCertifyMinutes,
            agendaChairmanInformed: meeting.agendaChairmanInformed,
            agendaOthers: meeting.agendaOthers,
          }}
          editable={hasAdmin && isEditable}
        />
      </FormCard>

      {/* Items */}
      <FormCard
        title={`Appraisals (${totalItems})`}
        icon="folder-open"
        iconColor="emerald"
        rightIcon={
          hasAdmin && isEditable ? (
            <Button size="sm" type="button" onClick={addItemsDialog.onOpen}>
              <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
              Add Appraisals
            </Button>
          ) : undefined
        }
      >
        <MeetingItemsGrouped
          meeting={meeting}
          canReleaseItems={hasSecretary && ITEM_ACTION_ELIGIBLE.has(status)}
        />
      </FormCard>

      {/* Dialogs */}
      <MeetingFormDialog
        isOpen={editDialog.isOpen}
        onClose={editDialog.onClose}
        meetingId={meeting.id}
        defaultValues={{
          title: meeting.title,
          location: meeting.location ?? '',
          notes: meeting.notes ?? '',
          startAt: meeting.startAt ?? '',
          endAt: meeting.endAt ?? '',
        }}
      />

      <CutOffReviewDialog
        isOpen={cutOffDialog.isOpen}
        onClose={cutOffDialog.onClose}
        meetingId={meeting.id}
      />

      <SendInvitationDialog
        isOpen={sendInvitationDialog.isOpen}
        onClose={sendInvitationDialog.onClose}
        meetingId={meeting.id}
        meetingNo={meeting.meetingNo}
      />

      <SendInvitationDialog
        isOpen={resendInvitationDialog.isOpen}
        onClose={resendInvitationDialog.onClose}
        meetingId={meeting.id}
        meetingNo={meeting.meetingNo}
        isResend
      />

      <CancelMeetingDialog
        isOpen={cancelDialog.isOpen}
        onClose={cancelDialog.onClose}
        meetingId={meeting.id}
      />

      <AddItemsDialog
        isOpen={addItemsDialog.isOpen}
        onClose={addItemsDialog.onClose}
        meetingId={meeting.id}
      />
    </div>
  );
};

export default MeetingDetailPage;
