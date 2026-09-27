import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import MeetingChip from '@/features/meeting/components/MeetingChip';
import { useTranslation } from 'react-i18next';

import {
  type ApprovalCondition,
  type ApprovalMember,
  type GetApprovalListResponse,
} from '../../api/decisionSummary';
import { countVotes, voteLabel } from './decisionHelpers';

// ==================== Presentational Component ====================

/** Committee votes panel (no card chrome) — rendered inside the Decision section. */
export const ApprovalListPanel = ({ data }: { data: GetApprovalListResponse }) => {
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

  // Authoritative, voting-mode-aware status from the backend — never re-derive from quorum/majority
  // here (that showed "Approved" before a WaitForAll round had actually resolved).
  const status = data.status;
  const members: ApprovalMember[] = data.members;

  const approveCount = countVotes(data, 'approve');
  const rejectCount = countVotes(data, 'reject');
  const routeBackCount = countVotes(data, 'route_back');
  const pct = (n: number) => (data.totalMembers > 0 ? (n / data.totalMembers) * 100 : 0);

  return (
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

      {/* Summary stats — votes received + per-vote tally (approve / reject / route-back) */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <div className="text-xl font-bold text-gray-900 leading-tight">
            {data.votesReceived} / {data.totalMembers}
          </div>
          <div className="text-xs text-gray-500">
            {t('approvalListSection.stats.votesReceived')}
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-emerald-600 leading-tight">{approveCount}</div>
          <div className="text-xs text-gray-500">{t('approvalListSection.stats.approve')}</div>
        </div>
        <div>
          <div className="text-xl font-bold text-red-600 leading-tight">{rejectCount}</div>
          <div className="text-xs text-gray-500">{t('approvalListSection.stats.reject')}</div>
        </div>
        <div>
          <div className="text-xl font-bold text-purple-600 leading-tight">{routeBackCount}</div>
          <div className="text-xs text-gray-500">{t('approvalListSection.stats.routeBack')}</div>
        </div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <span className="bg-emerald-500" style={{ width: `${pct(approveCount)}%` }} />
          <span className="bg-red-500" style={{ width: `${pct(rejectCount)}%` }} />
          <span className="bg-purple-500" style={{ width: `${pct(routeBackCount)}%` }} />
        </div>
      </div>

      {/* Status banner — Returned only; the "approved" banner was removed (the status chip + the
            workflow completion already convey approval, and it previously showed prematurely). */}
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

      {/* Per-member votes — a list rather than a table: the panel sits in a half-width column */}
      {members.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {members.map(member => {
            const hasVoted = member.status === 'Voted';
            return (
              <li
                key={member.username}
                className={`px-3 py-2.5 ${member.isCurrentUser ? 'bg-blue-50/60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900 truncate">{member.username}</span>
                  {member.isCurrentUser && (
                    <Badge variant="info" size="xs">
                      {t('approvalListSection.youBadge')}
                    </Badge>
                  )}
                  <span className="ml-auto shrink-0">
                    {hasVoted && member.vote ? (
                      <Badge type="vote" value={member.vote} size="sm">
                        {voteLabel(t, member.vote)}
                      </Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Icon name="clock" style="regular" className="w-3.5 h-3.5" />
                        {t('approvalListSection.pendingVote')}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {member.role}
                  {member.votedAt &&
                    ` · ${new Date(member.votedAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                </div>
                {member.comments && (
                  <p className="mt-1 text-xs text-gray-600 break-words whitespace-pre-wrap">
                    {member.comments}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
