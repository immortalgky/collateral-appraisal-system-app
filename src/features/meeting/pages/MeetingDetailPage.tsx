/**
 * Meeting detail — a status-adaptive screen.
 *
 * The same meeting serves three jobs at different points in its life, so the page picks a
 * *mode* (see `getMeetingMode`) and reshapes around it:
 *
 *   prep     — before it runs: readiness, roster, agenda, item curation
 *   session  — live: progress, the item under discussion, fast decisions, polling
 *   minutes  — finished: outcome summary, totals, decision record, approver votes
 *   archived — cancelled: muted read-only record
 *
 * Action gating is unchanged and still comes from the `*_ELIGIBLE` sets in `constants.ts`,
 * which mirror the backend guards.
 */
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { DetailPageSkeleton } from '@/shared/components/Skeleton';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useHasPermission } from '@/shared/hooks/useHasPermission';
import {
  EDIT_ELIGIBLE,
  getMeetingMode,
  ITEM_ACTION_ELIGIBLE,
  ITEM_RECALL_ELIGIBLE,
  ITEM_REMOVE_ELIGIBLE,
  MEETING_PERMISSIONS,
  SESSION_POLL_INTERVAL_MS,
} from '../constants';

import { useGetMeetingDetail } from '../api/meetings';
import { computeMeetingStats } from '../utils/meetingStats';
import { useMeetingFormat } from '../utils/useMeetingFormat';
import AddItemsDialog from '../components/AddItemsDialog';
import AgendaForm from '../components/AgendaForm';
import CancelMeetingDialog from '../components/CancelMeetingDialog';
import CutOffReviewDialog from '../components/CutOffReviewDialog';
import EndMeetingDialog from '../components/EndMeetingDialog';
import MeetingDocumentsDialog from '../components/MeetingDocumentsDialog';
import MeetingFormDialog from '../components/MeetingFormDialog';
import MeetingItemsGrouped from '../components/MeetingItemsGrouped';
import MeetingCommandBar from '../components/detail/MeetingCommandBar';
import MeetingPulse from '../components/detail/MeetingPulse';
import MeetingRoster from '../components/detail/MeetingRoster';
import MeetingTimeline from '../components/detail/MeetingTimeline';
import NowDecidingPanel from '../components/detail/NowDecidingPanel';
import SendInvitationDialog from '../components/SendInvitationDialog';

const MeetingDetailPage = () => {
  const { t } = useTranslation('meeting');
  const { formatDateTime } = useMeetingFormat();
  const { meetingId } = useParams<{ meetingId: string }>();

  const {
    data: meeting,
    isLoading,
    dataUpdatedAt,
  } = useGetMeetingDetail(meetingId, {
    shouldPoll: m => getMeetingMode(m.status) === 'session',
    intervalMs: SESSION_POLL_INTERVAL_MS,
  });

  const hasAdmin = useHasPermission(MEETING_PERMISSIONS.ADMIN);
  const hasSecretary = useHasPermission(MEETING_PERMISSIONS.SECRETARY);

  const editDialog = useDisclosure();
  const cutOffDialog = useDisclosure();
  const sendInvitationDialog = useDisclosure();
  const resendInvitationDialog = useDisclosure();
  const cancelDialog = useDisclosure();
  const endDialog = useDisclosure();
  const addItemsDialog = useDisclosure();
  const documentsDialog = useDisclosure();

  if (isLoading || !meeting) {
    return <DetailPageSkeleton />;
  }

  const { status } = meeting;
  const mode = getMeetingMode(status);
  const isEditable = EDIT_ELIGIBLE.has(status);
  const stats = computeMeetingStats(meeting);

  const canDecideItems = hasSecretary && ITEM_ACTION_ELIGIBLE.has(status);
  const canRemoveItems = hasSecretary && ITEM_REMOVE_ELIGIBLE.has(status);
  const canRecallItems = hasSecretary && ITEM_RECALL_ELIGIBLE.has(status);

  /** Schedule, roster and agenda. Identical in every mode — only their position changes. */
  const setupCards = (
    <>
      <FormCard title={t('sections.lifecycle')} icon="calendar" iconColor="blue">
        <MeetingTimeline meeting={meeting} live={mode === 'session'} />
      </FormCard>

      <FormCard title={t('sections.committeeMembers')} icon="users" iconColor="purple">
        <MeetingRoster
          meetingId={meeting.id}
          members={meeting.members}
          editable={hasAdmin && isEditable}
        />
      </FormCard>

      <FormCard title={t('sections.agenda')} icon="list-check" iconColor="amber">
        <AgendaForm
          meetingId={meeting.id}
          initialValues={{
            agendaCertifyMinutes: meeting.agendaCertifyMinutes,
            agendaChairmanInformed: meeting.agendaChairmanInformed,
            agendaOthers: meeting.agendaOthers,
          }}
          editable={hasAdmin && isEditable}
          previousEndedMeetingNo={meeting.previousEndedMeetingNo}
        />
      </FormCard>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-6">
      <MeetingCommandBar
        meeting={meeting}
        canAdminister={hasAdmin}
        totalItems={stats.totalItems}
        isLive={mode === 'session'}
        dataUpdatedAt={dataUpdatedAt}
        onEdit={editDialog.onOpen}
        onCutOff={cutOffDialog.onOpen}
        onSendInvitation={sendInvitationDialog.onOpen}
        onResendInvitation={resendInvitationDialog.onOpen}
        onDocuments={documentsDialog.onOpen}
        onEnd={endDialog.onOpen}
        onCancel={cancelDialog.onOpen}
      />

      {/* Status banners — only the exceptional states still need words. `InProgress` is now
          conveyed by the live badge and the focus panel, so it no longer needs a banner. */}
      {mode === 'minutes' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Icon name="circle-check" style="solid" className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700">
            {meeting.endedAt
              ? t('banners.endedAt', { date: formatDateTime(meeting.endedAt) })
              : t('banners.ended')}
          </p>
        </div>
      )}
      {status === 'RoutedBack' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Icon
            name="arrow-rotate-left"
            style="solid"
            className="h-5 w-5 shrink-0 text-amber-500"
          />
          <p className="text-sm font-medium text-amber-700">{t('banners.routedBack')}</p>
        </div>
      )}
      {mode === 'archived' && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <Icon
            name="circle-xmark"
            style="solid"
            className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
          />
          <div>
            <p className="text-sm font-medium text-red-700">{t('banners.cancelled')}</p>
            {meeting.cancelReason && (
              <p className="mt-0.5 text-xs text-red-600">
                {t('banners.cancelReason', { reason: meeting.cancelReason })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Live focus — the single most useful thing on screen while a meeting runs. */}
      {mode === 'session' && (
        <NowDecidingPanel
          meetingId={meeting.id}
          item={stats.firstPendingItem}
          remaining={stats.decisionCounts.Pending}
          canDecide={canDecideItems}
        />
      )}

      {/* Visual summary — only meaningful once decisions exist to report on. */}
      {(mode === 'session' || mode === 'minutes') && <MeetingPulse stats={stats} />}

      {/* Schedule → committee → agenda, then the appraisals they apply to. The appraisals list
          is the longest block on the page, so it always sits last regardless of mode — the
          shorter context cards stay reachable without scrolling past it. */}
      {setupCards}

      <FormCard
        title={t('sections.appraisals', { n: stats.totalItems })}
        icon="folder-open"
        iconColor="emerald"
        rightIcon={
          hasAdmin && isEditable ? (
            <Button size="sm" type="button" onClick={addItemsDialog.onOpen}>
              <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.addAppraisals')}
            </Button>
          ) : undefined
        }
      >
        <MeetingItemsGrouped
          meeting={meeting}
          canReleaseItems={canDecideItems}
          canRemoveItems={canRemoveItems}
          canRecallItems={canRecallItems}
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
          fromText: meeting.fromText ?? '',
          toText: meeting.toText ?? '',
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
        startAt={meeting.startAt}
        location={meeting.location}
      />

      <SendInvitationDialog
        isOpen={resendInvitationDialog.isOpen}
        onClose={resendInvitationDialog.onClose}
        meetingId={meeting.id}
        meetingNo={meeting.meetingNo}
        startAt={meeting.startAt}
        location={meeting.location}
        isResend
      />

      <CancelMeetingDialog
        isOpen={cancelDialog.isOpen}
        onClose={cancelDialog.onClose}
        meetingId={meeting.id}
      />

      <EndMeetingDialog
        isOpen={endDialog.isOpen}
        onClose={endDialog.onClose}
        meetingId={meeting.id}
      />

      <AddItemsDialog
        isOpen={addItemsDialog.isOpen}
        onClose={addItemsDialog.onClose}
        meetingId={meeting.id}
      />

      <MeetingDocumentsDialog
        isOpen={documentsDialog.isOpen}
        onClose={documentsDialog.onClose}
        meetingId={meeting.id}
      />
    </div>
  );
};

export default MeetingDetailPage;
