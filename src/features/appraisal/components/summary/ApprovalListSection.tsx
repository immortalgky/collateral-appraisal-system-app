import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import FormCard from '@/shared/components/sections/FormCard';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useAuthStore } from '@/features/auth/store';

import { useGetApprovalList, useAssignCommittee } from '../../api/decisionSummary';
import VoteDialog from './VoteDialog';

interface ApprovalListSectionProps {
  appraisalId: string;
}

const ApprovalListSection = ({ appraisalId }: ApprovalListSectionProps) => {
  const { data, isLoading } = useGetApprovalList(appraisalId);
  const { mutate: assignCommittee, isPending: isAssigning } = useAssignCommittee();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const handleAssign = () => {
    assignCommittee(
      { appraisalId },
      {
        onSuccess: () => {
          toast.success('Committee assigned successfully');
        },
        onError: (error: any) => {
          if (error.response?.status === 400) {
            toast.error('A committee review already exists for this appraisal');
          } else {
            toast.error(error.apiError?.detail || 'Failed to assign committee');
          }
        },
      },
    );
  };

  if (isLoading) {
    return (
      <FormCard title="Committee Approval" icon="users-gear" iconColor="blue">
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </FormCard>
    );
  }

  // State A: No committee assigned
  if (!data?.committeeName) {
    return (
      <FormCard title="Committee Approval" icon="users-gear" iconColor="blue">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Icon name="users-gear" style="regular" className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-sm text-gray-500">No committee has been assigned yet.</p>
          <Button type="button" onClick={handleAssign} disabled={isAssigning}>
            {isAssigning ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Icon name="users-gear" style="solid" className="size-4 mr-2" />
                Assign to Committee
              </>
            )}
          </Button>
        </div>
      </FormCard>
    );
  }

  const isPending = data.reviewStatus === 'Pending';
  const currentUserAlreadyVoted = data.items?.some(
    (item) => item.committeeMemberId === currentUserId && item.vote != null,
  );

  return (
    <FormCard title="Committee Approval" icon="users-gear" iconColor="blue">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{data.committeeName}</span>
            <Badge type="status" value={data.reviewStatus} size="sm" />
          </div>
          {isPending && !currentUserAlreadyVoted && (
            <Button type="button" size="sm" onClick={onOpen}>
              <Icon name="check-to-slot" style="solid" className="size-4 mr-2" />
              Submit Vote
            </Button>
          )}
        </div>

        {/* Status banner */}
        {data.reviewStatus === 'Approved' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Icon name="circle-check" style="solid" className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-sm font-medium text-emerald-700">
              This appraisal has been approved by the committee.
            </p>
          </div>
        )}
        {data.reviewStatus === 'Returned' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Icon name="rotate-left" style="solid" className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              This appraisal has been returned for revision.
            </p>
          </div>
        )}

        {/* Table */}
        {data.items && data.items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vote
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.items.map((item) => (
                  <tr key={item.committeeMemberId}>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {item.memberName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {item.role}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge type="vote" value={item.voteLabel} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {item.votedAt
                        ? new Date(item.votedAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {item.remark || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vote Dialog */}
      {data.reviewId && (
        <VoteDialog
          isOpen={isOpen}
          onClose={onClose}
          appraisalId={appraisalId}
          reviewId={data.reviewId}
        />
      )}
    </FormCard>
  );
};

export default ApprovalListSection;
