import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import FormCard from '@/shared/components/sections/FormCard';
import MeetingChip from '@/features/meeting/components/MeetingChip';

import {
  useGetApprovalList,
  type ApprovalCondition,
  type ApprovalMember,
  type GetApprovalListResponse,
} from '../../api/decisionSummary';

interface ApprovalListSectionProps {
  workflowInstanceId: string | undefined;
  activityId: string | undefined;
}

/** Client-derived status from quorum/majority/route_back — backend does not emit a status string. */
type DerivedStatus = 'Approved' | 'Returned' | 'Pending';

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3',
};

const COMMITTEE_CODE_LABELS: Record<string, string> = {
  SUB_COMMITTEE: 'Sub-Committee',
  COMMITTEE: 'Committee',
  COMMITTEE_WITH_MEETING: 'Committee (with Meeting)',
};

const tierBadge = (tier: number | null, committeeCode: string | null): string => {
  if (tier != null && TIER_LABELS[tier]) return TIER_LABELS[tier];
  if (committeeCode && COMMITTEE_CODE_LABELS[committeeCode])
    return COMMITTEE_CODE_LABELS[committeeCode];
  return 'Committee';
};

const deriveStatus = (data: GetApprovalListResponse): DerivedStatus => {
  if (data.members.some(m => m.vote === 'route_back')) return 'Returned';
  if (data.quorumMet && data.majorityMet) return 'Approved';
  return 'Pending';
};

const conditionLabel = (condition: ApprovalCondition): string => {
  if (condition.conditionType === 'RoleRequired') {
    return condition.roleRequired
      ? `${condition.roleRequired} must vote`
      : 'Required role must vote';
  }
  // MinVotes
  return condition.minVotesRequired != null
    ? `At least ${condition.minVotesRequired} votes required`
    : 'Minimum vote count required';
};

const ApprovalListSection = ({ workflowInstanceId, activityId }: ApprovalListSectionProps) => {
  const { data, isLoading } = useGetApprovalList(workflowInstanceId, activityId);

  if (!workflowInstanceId || !activityId) {
    // No active approval activity for this appraisal — committee-review step hasn't been reached.
    return (
      <FormCard title="Committee Approval" icon="users-gear" iconColor="blue">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Icon name="users-gear" style="regular" className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-sm text-gray-500">
            Committee approval is not active for this appraisal yet.
          </p>
        </div>
      </FormCard>
    );
  }

  if (isLoading || !data) {
    return (
      <FormCard title="Committee Approval" icon="users-gear" iconColor="blue">
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </FormCard>
    );
  }

  const status = deriveStatus(data);
  const members: ApprovalMember[] = data.members;
  return (
    <FormCard title="Committee Approval" icon="users-gear" iconColor="blue">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="primary" size="sm">
              {tierBadge(data.tier, data.committeeCode)}
            </Badge>
            {data.committeeName && (
              <span className="text-sm font-medium text-gray-700">{data.committeeName}</span>
            )}
            <Badge type="status" value={status} size="sm" />
            <span className="text-xs text-gray-500">
              {data.votesReceived}/{data.totalMembers} votes
            </span>
            {data.meetingRef && (
              <MeetingChip
                meetingId={data.meetingRef.meetingId}
                title={data.meetingRef.title}
                endedAt={data.meetingRef.endedAt}
              />
            )}
          </div>
        </div>

        {/* Status banner */}
        {status === 'Approved' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Icon name="circle-check" style="solid" className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-sm font-medium text-emerald-700">
              This appraisal has been approved by the committee.
            </p>
          </div>
        )}
        {status === 'Returned' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Icon name="rotate-left" style="solid" className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              This appraisal has been returned for revision.
            </p>
          </div>
        )}

        {/* Conditions panel */}
        {data.conditions.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Approval Conditions
            </p>
            <ul className="space-y-1.5">
              {data.conditions.map((condition, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <Icon
                    name={condition.met ? 'circle-check' : 'circle-xmark'}
                    style="solid"
                    className={`w-4 h-4 shrink-0 ${
                      condition.met ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  />
                  <span className={condition.met ? 'text-gray-700' : 'text-gray-600'}>
                    {conditionLabel(condition)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Per-member voting table */}
        {members.length > 0 && (
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
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map(member => {
                  const hasVoted = member.status === 'Voted';
                  return (
                    <tr
                      key={member.username}
                      className={member.isCurrentUser ? 'bg-blue-50/60' : undefined}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{member.username}</span>
                          {member.isCurrentUser && (
                            <Badge variant="info" size="xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {member.role}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {hasVoted && member.vote ? (
                          <Badge type="vote" value={member.vote} size="sm" />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Icon name="clock" style="regular" className="w-3.5 h-3.5" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {member.votedAt
                          ? new Date(member.votedAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                        {member.comments || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </FormCard>
  );
};

export default ApprovalListSection;
