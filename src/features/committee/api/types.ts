import type { CommitteeMemberAttendance, CommitteeMemberPosition } from '@/features/meeting/api/types';

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

export interface CommitteeConditionDto {
  id: string;
  [key: string]: unknown;
}

export interface CommitteeDetailDto extends CommitteeListItemDto {
  members: CommitteeMemberDto[];
  thresholds: CommitteeThresholdDto[];
  conditions: CommitteeConditionDto[];
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
