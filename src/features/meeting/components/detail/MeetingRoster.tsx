/**
 * Committee members as avatar cards, with Chairman and Secretary pinned first.
 *
 * The old plain table gave no sense of who chairs the meeting — role hierarchy was a value in
 * a column. Mutations are unchanged: this still drives `useUpdateMeetingMemberPosition` and
 * `useRemoveMeetingMember` exactly as the table did.
 */
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Icon from '@/shared/components/Icon';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useRemoveMeetingMember, useUpdateMeetingMemberPosition } from '../../api/meetings';
import type { CommitteeMemberPosition, MeetingMemberDto } from '../../api/types';
import { useSelectablePositions, usePositionLabel } from '../../hooks/usePositions';
import AddMemberDialog from '../AddMemberDialog';

/** Display order — leadership first, then the rest in the configured order. */
const POSITION_RANK: Record<CommitteeMemberPosition, number> = {
  Chairman: 0,
  Secretary: 1,
  Director: 2,
  UW: 3,
  Risk: 4,
  Appraisal: 5,
  Credit: 6,
  Member: 7,
};

const LEAD_POSITIONS = new Set<CommitteeMemberPosition>(['Chairman', 'Secretary']);

interface MeetingRosterProps {
  meetingId: string;
  members: MeetingMemberDto[];
  editable: boolean;
}

const MeetingRoster = ({ meetingId, members, editable }: MeetingRosterProps) => {
  const { t } = useTranslation('meeting');
  const selectablePositions = useSelectablePositions();
  const positionLabel = usePositionLabel();
  const removeMember = useRemoveMeetingMember();
  const updatePosition = useUpdateMeetingMemberPosition();
  const addMemberDialog = useDisclosure();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<MeetingMemberDto | null>(null);

  const sorted = useMemo(
    () =>
      [...members].sort(
        (a, b) =>
          (POSITION_RANK[a.position] ?? 99) - (POSITION_RANK[b.position] ?? 99) ||
          a.memberName.localeCompare(b.memberName),
      ),
    [members],
  );

  const handlePositionChange = (memberId: string, position: CommitteeMemberPosition) => {
    setUpdatingId(memberId);
    updatePosition.mutate(
      { meetingId, memberId, body: { position } },
      {
        onSuccess: () => setUpdatingId(null),
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.positionUpdateFailed'));
          setUpdatingId(null);
        },
      },
    );
  };

  const handleConfirmRemove = () => {
    if (!pendingRemoval) return;
    removeMember.mutate(
      { meetingId, memberId: pendingRemoval.id },
      {
        onSuccess: () => {
          toast.success(t('toasts.memberRemoved'));
          setPendingRemoval(null);
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.memberRemoveFailed'));
          setPendingRemoval(null);
        },
      },
    );
  };

  const addButton = editable ? (
    <div className="flex justify-end">
      <Button size="sm" type="button" onClick={addMemberDialog.onOpen}>
        <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
        {t('buttons.addMember')}
      </Button>
    </div>
  ) : null;

  const dialogs = (
    <>
      {/* Remount per open so the form re-seeds from the current position list. */}
      {addMemberDialog.isOpen && (
        <AddMemberDialog isOpen onClose={addMemberDialog.onClose} meetingId={meetingId} />
      )}
      <ConfirmDialog
        isOpen={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={handleConfirmRemove}
        title={t('roster.removeTitle')}
        message={t('confirm.removeMember', { name: pendingRemoval?.memberName ?? '' })}
        confirmText={t('buttons.remove')}
        cancelText={t('buttons.clear')}
        variant="danger"
        isLoading={removeMember.isPending}
      />
    </>
  );

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Icon name="users" style="regular" className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">{t('empty.noMembers')}</p>
        </div>
        {addButton}
        {dialogs}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Borderless data list, matching the appraisal items table: hairline under the header,
          hairlines between rows, no header fill. */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-56" />
            {editable && <col className="w-24" />}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 pb-2 text-center text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {t('columns.memberNo')}
              </th>
              <th className="px-3 pb-2 text-left text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {t('columns.memberName')}
              </th>
              <th className="px-3 pb-2 text-left text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {t('columns.position')}
              </th>
              {editable && (
                <th className="px-3 pb-2 text-center text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  {t('columns.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((member, index) => {
              const isLead = LEAD_POSITIONS.has(member.position);
              return (
                <tr key={member.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-center text-xs text-gray-400 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar name={member.memberName} size="sm" />
                      <span className="truncate text-sm text-gray-900">{member.memberName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    {editable ? (
                      <select
                        value={member.position}
                        onChange={e =>
                          handlePositionChange(member.id, e.target.value as CommitteeMemberPosition)
                        }
                        disabled={updatingId === member.id}
                        aria-label={t('columns.position')}
                        className="rounded border border-gray-300 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {/*
                          A member snapshotted before Risk/Appraisal/Credit/Member were retired still
                          holds one. A <select> whose value matches no <option> renders blank and
                          would submit whatever sits first, silently rewriting their position — so
                          carry the current value as a disabled option instead.
                        */}
                        {!selectablePositions.includes(member.position) && (
                          <option value={member.position} disabled>
                            {positionLabel(member.position)}
                          </option>
                        )}
                        {selectablePositions.map(pos => (
                          <option key={pos} value={pos}>
                            {positionLabel(pos)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      // Chairman and Secretary carry the meeting — worth distinguishing even
                      // once the cards are gone.
                      <span
                        className={clsx(
                          'text-sm',
                          isLead ? 'font-medium text-primary' : 'text-gray-500',
                        )}
                      >
                        {positionLabel(member.position)}
                      </span>
                    )}
                  </td>
                  {editable && (
                    <td className="px-3 py-1.5 text-center">
                      <Button
                        variant="ghost"
                        size="xs"
                        type="button"
                        className="text-gray-400 hover:text-red-600"
                        aria-label={t('confirm.removeMember', { name: member.memberName })}
                        onClick={() => setPendingRemoval(member)}
                        disabled={removeMember.isPending}
                      >
                        <Icon name="xmark" style="solid" className="size-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {addButton}
      {dialogs}
    </div>
  );
};

export default MeetingRoster;
