import type {
  CommitteeMemberAttendance,
  CommitteeMemberPosition,
} from '@/features/meeting/api/types';

export type { CommitteeMemberAttendance, CommitteeMemberPosition };

export interface CommitteeListItemDto {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  quorumType: string;
  quorumValue: number;
  majorityType: string;
  memberCount: number;
}

export interface CommitteeMemberDto {
  id: string;
  userId: string;
  memberName: string;
  role: CommitteeMemberPosition;
  attendance: CommitteeMemberAttendance;
  isActive: boolean;
}

export interface CommitteeThresholdDto {
  id: string;
  [key: string]: unknown;
}

/**
 * Extra rules an approval round must satisfy on top of quorum and the majority rule.
 * `ApprovalActivity.CheckApprovalConditions` requires EVERY active condition to pass, so an
 * unsatisfiable one silently stalls the round.
 *
 * RoleRequired — a member holding `roleRequired` must have cast the target vote.
 * MinVotes     — at least `minVotesRequired` members must have cast it.
 */
export type ConditionType = 'RoleRequired' | 'MinVotes';

export interface CommitteeConditionDto {
  id: string;
  committeeId?: string;
  conditionType: ConditionType;
  /** Set only for RoleRequired; a CommitteeMemberPosition. */
  roleRequired: string | null;
  /** Set only for MinVotes. */
  minVotesRequired: number | null;
  priority: number;
  isActive: boolean;
  description: string | null;
}

export interface AddCommitteeConditionRequest {
  conditionType: ConditionType;
  roleRequired?: string | null;
  minVotesRequired?: number | null;
  priority: number;
  description?: string | null;
}

/** PATCH sends the full representation — omitted fields are cleared, not preserved. */
export interface UpdateCommitteeConditionRequest extends AddCommitteeConditionRequest {
  isActive: boolean;
}

/** Fixed = QuorumValue is a headcount; Percentage = QuorumValue is a % of active members. */
export type QuorumType = 'Fixed' | 'Percentage';

/**
 * Evaluated against the FULL committee, not just the votes cast (see Committee.HasMajority).
 * Simple    — more than half of all members approve.
 * TwoThirds — at least two-thirds of all members approve.
 * Unanimous — every member approves.
 * FixedCount — an absolute number of approvals (`majorityValue`), regardless of member count.
 */
export type MajorityType = 'Simple' | 'TwoThirds' | 'Unanimous' | 'FixedCount';

/**
 * WaitForAll — every member must vote before the approve rule is evaluated.
 * Quorum      — resolves as soon as quorum + majority are met; unvoted members' tasks are closed.
 */
export type VotingMode = 'WaitForAll' | 'Quorum';

export interface CommitteeDetailDto extends CommitteeListItemDto {
  /** Only present on the detail read, not the list. */
  votingMode: VotingMode;
  /** Only meaningful when majorityType is FixedCount; 0 otherwise. */
  majorityValue: number;
  members: CommitteeMemberDto[];
  thresholds: CommitteeThresholdDto[];
  conditions: CommitteeConditionDto[];
}

/**
 * PUT /api/workflows/committees/{id}. Code is immutable — the backend does not accept it.
 *
 * Omitting votingMode preserves the stored value, but majorityValue does NOT behave that way:
 * it is an `int` defaulting to 0 and is passed straight to Committee.Update, so leaving it out
 * resets it — and the backend then rejects a FixedCount committee whose value became 0. Always
 * send both.
 */
export interface UpdateCommitteeRequest {
  name: string;
  description: string | null;
  quorumType: QuorumType;
  quorumValue: number;
  majorityType: MajorityType;
  /** Required (> 0) when majorityType is FixedCount; send 0 for the proportional types. */
  majorityValue: number;
  isActive: boolean;
  votingMode: VotingMode;
}

export interface GetCommitteesResponse {
  committees: CommitteeListItemDto[];
}

export interface AddCommitteeMemberRequest {
  userId: string;
  memberName: string;
  role: CommitteeMemberPosition;
  attendance: CommitteeMemberAttendance;
}

export interface UpdateCommitteeMemberRequest {
  role: CommitteeMemberPosition;
  attendance: CommitteeMemberAttendance;
  isActive: boolean;
}
