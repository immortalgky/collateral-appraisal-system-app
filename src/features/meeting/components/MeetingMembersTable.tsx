import { useState } from 'react';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useRemoveMeetingMember, useUpdateMeetingMemberPosition } from '../api/meetings';
import type { CommitteeMemberPosition, MeetingMemberDto } from '../api/types';
import AddMemberDialog from './AddMemberDialog';
import { POSITION_OPTIONS } from '../constants';

interface MeetingMembersTableProps {
  meetingId: string;
  members: MeetingMemberDto[];
  editable: boolean;
}

const MeetingMembersTable = ({ meetingId, members, editable }: MeetingMembersTableProps) => {
  const removeMember = useRemoveMeetingMember();
  const updatePosition = useUpdateMeetingMemberPosition();
  const addMemberDialog = useDisclosure();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handlePositionChange = (memberId: string, position: CommitteeMemberPosition) => {
    setUpdatingId(memberId);
    updatePosition.mutate(
      { meetingId, memberId, body: { position } },
      {
        onSuccess: () => {
          setUpdatingId(null);
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to update position');
          setUpdatingId(null);
        },
      },
    );
  };

  const handleRemove = (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this meeting?`)) return;
    removeMember.mutate(
      { meetingId, memberId },
      {
        onSuccess: () => {
          toast.success('Member removed');
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to remove member');
        },
      },
    );
  };

  if (members.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Icon name="users" style="regular" className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500">No members in this meeting snapshot.</p>
        </div>
        {editable && (
          <div className="flex justify-end">
            <Button size="sm" type="button" onClick={addMemberDialog.onOpen}>
              <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
              Add Member
            </Button>
          </div>
        )}
        <AddMemberDialog
          isOpen={addMemberDialog.isOpen}
          onClose={addMemberDialog.onClose}
          meetingId={meetingId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                No.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Member Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Position
              </th>
              {editable && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member, index) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{member.memberName}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {editable ? (
                    <select
                      value={member.position}
                      onChange={e =>
                        handlePositionChange(member.id, e.target.value as CommitteeMemberPosition)
                      }
                      disabled={updatingId === member.id}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {POSITION_OPTIONS.map(pos => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  ) : (
                    member.position
                  )}
                </td>
                {editable && (
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      type="button"
                      onClick={() => handleRemove(member.id, member.memberName)}
                      disabled={removeMember.isPending}
                    >
                      <Icon name="xmark" style="solid" className="size-3.5 mr-1" />
                      Remove
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="flex justify-end">
          <Button size="sm" type="button" onClick={addMemberDialog.onOpen}>
            <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
            Add Member
          </Button>
        </div>
      )}

      <AddMemberDialog
        isOpen={addMemberDialog.isOpen}
        onClose={addMemberDialog.onClose}
        meetingId={meetingId}
      />
    </div>
  );
};

export default MeetingMembersTable;
