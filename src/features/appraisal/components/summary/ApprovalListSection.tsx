import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import FormCard from '@/shared/components/sections/FormCard';
import MeetingChip from '@/features/meeting/components/MeetingChip';
import { useTranslation } from 'react-i18next';

import {
  useGetApprovalList,
  useGetApprovalHistory,
  type ApprovalCondition,
  type ApprovalMember,
  type GetApprovalListResponse,
} from '../../api/decisionSummary';

/** Client-derived status from quorum/majority/route_back — backend does not emit a status string. */
type DerivedStatus = 'Approved' | 'Returned' | 'Pending';

const deriveStatus = (data: GetApprovalListResponse): DerivedStatus => {
  if (data.members.some(m => m.vote === 'route_back')) return 'Returned';
  if (data.quorumMet && data.majorityMet) return 'Approved';
  return 'Pending';
};

// ==================== Presentational Component ====================

interface ApprovalListSectionBaseProps {
  data: GetApprovalListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

const ApprovalListSectionBase = ({ data, isLoading, isError }: ApprovalListSectionBaseProps) => {
  const { t } = useTranslation('appraisal');

  const tierLabel = (tier: number | null, committeeCode: string | null): string => {
    const tierMap: Record<number, string> = {
      1: t('approvalListSection.tierLabels.1'),
      2: t('approvalListSection.tierLabels.2'),
      3: t('approvalListSection.tierLabels.3'),
    };
    const codeMap: Record<string, string> = {
      SUB_COMMITTEE: t('approvalListSection.committeeCodeLabels.SUB_COMMITTEE'),
      COMMITTEE: t('approvalListSection.committeeCodeLabels.COMMITTEE'),
      COMMITTEE_WITH_MEETING: t('approvalListSection.committeeCodeLabels.COMMITTEE_WITH_MEETING'),
    };
    if (tier != null && tierMap[tier]) return tierMap[tier];
    if (committeeCode && codeMap[committeeCode]) return codeMap[committeeCode];
    return t('approvalListSection.committeeDefault');
  };

  const conditionLabel = (condition: ApprovalCondition): string => {
    if (condition.conditionType === 'RoleRequired') {
      return condition.roleRequired
        ? t('approvalListSection.conditionRoleRequired', { role: condition.roleRequired })
        : t('approvalListSection.conditionRoleRequiredDefault');
    }
    return condition.minVotesRequired != null
      ? t('approvalListSection.conditionMinVotes', { n: condition.minVotesRequired })
      : t('approvalListSection.conditionMinVotesDefault');
  };

  if (isLoading || (!data && !isError)) {
    return (
      <FormCard title={t('approvalListSection.title')} icon="users-gear" iconColor="blue">
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </FormCard>
    );
  }

  if (!data) {
    return null;
  }

  const status = deriveStatus(data);
  const members: ApprovalMember[] = data.members;
  return (
    <FormCard title={t('approvalListSection.title')} icon="users-gear" iconColor="blue">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="primary" size="sm">
              {tierLabel(data.tier, data.committeeCode)}
            </Badge>
            {data.committeeName && (
              <span className="text-sm font-medium text-gray-700">{data.committeeName}</span>
            )}
            <Badge type="status" value={status} size="sm" />
            <span className="text-xs text-gray-500">
              {t('approvalListSection.votesDisplay', {
                received: data.votesReceived,
                total: data.totalMembers,
              })}
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
              {t('approvalListSection.approvedBanner')}
            </p>
          </div>
        )}
        {status === 'Returned' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Icon name="rotate-left" style="solid" className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              {t('approvalListSection.returnedBanner')}
            </p>
          </div>
        )}

        {/* Conditions panel */}
        {data.conditions.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              {t('approvalListSection.conditionsTitle')}
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
                    {t('approvalListSection.columns.member')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('approvalListSection.columns.role')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('approvalListSection.columns.vote')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('approvalListSection.columns.date')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('approvalListSection.columns.comments')}
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
                              {t('approvalListSection.youBadge')}
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
                            {t('approvalListSection.pendingVote')}
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

// ==================== Data-Wiring Components ====================

interface LiveApprovalListSectionProps {
  workflowInstanceId: string | undefined;
  activityId: string | undefined;
}

/**
 * Live approval section — polls the workflow-scoped endpoint every 10 s while
 * the committee vote is still in progress. Used while the workflow is active.
 *
 * Renders a "not active yet" placeholder when workflowInstanceId or activityId
 * are absent (committee step not reached).
 */
export const LiveApprovalListSection = ({
  workflowInstanceId,
  activityId,
}: LiveApprovalListSectionProps) => {
  const { t } = useTranslation('appraisal');
  const { data, isLoading, isError } = useGetApprovalList(workflowInstanceId, activityId);

  if (!workflowInstanceId || !activityId) {
    return (
      <FormCard title={t('approvalListSection.title')} icon="users-gear" iconColor="blue">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Icon name="users-gear" style="regular" className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-sm text-gray-500">
            {t('approvalListSection.notActiveYet')}
          </p>
        </div>
      </FormCard>
    );
  }

  return <ApprovalListSectionBase data={data} isLoading={isLoading} isError={isError} />;
};

interface ApprovalHistorySectionProps {
  appraisalId: string | undefined;
  activityId: string;
}

/**
 * History approval section — fetches the immutable final-round votes for a
 * completed appraisal. No polling. Returns null on 404 (workflow was cancelled
 * before reaching the approval step — card is hidden gracefully).
 */
export const ApprovalHistorySection = ({
  appraisalId,
  activityId,
}: ApprovalHistorySectionProps) => {
  const { data, isLoading, isError, error } = useGetApprovalHistory(appraisalId, activityId);

  // 404 means no votes were ever cast — hide the card silently.
  const is404 =
    isError &&
    error != null &&
    (error as { response?: { status?: number } }).response?.status === 404;

  if (is404 || (!isLoading && isError && !data)) {
    return null;
  }

  return <ApprovalListSectionBase data={data} isLoading={isLoading} isError={isError} />;
};
