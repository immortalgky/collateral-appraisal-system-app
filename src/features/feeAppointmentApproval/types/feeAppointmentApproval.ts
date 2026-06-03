// TS interfaces matching backend FeeAppointmentApproval DTOs

export type ApprovalStatus = 'Open' | 'Resolved' | 'Cancelled';

export type LineType = 'Appointment' | 'Fee';

export type LineStatus = 'Pending' | 'Approved' | 'Rejected';

export type AssignedType = '1' | '2';

export type RequestSource = 'Ext' | 'Int';

export type ApprovalDecision = 'approve' | 'reject';

export interface FeeAppointmentApprovalLine {
  id: string;
  lineType: LineType;
  targetId: string;
  newDate?: string | null;
  rescheduleCount?: number | null;
  feeCode?: string | null;
  feeDescription?: string | null;
  feeAmount?: number | null;
  lineStatus: LineStatus;
  decisionReason?: string | null;
}

export interface FeeAppointmentApprovalDto {
  id: string;
  appraisalId: string;
  requestSource: RequestSource;
  status: ApprovalStatus;
  resolvedTier?: string | null;
  approverAssignee?: string | null;
  assignedType?: AssignedType | null;
  followupWorkflowInstanceId?: string | null;
  raisedAt: string;
  resolvedAt?: string | null;
  lines: FeeAppointmentApprovalLine[];
}

// ---- Request shapes ----

export interface ResolveFeeAppointmentApprovalRequest {
  appointmentDecision?: ApprovalDecision;
  appointmentReason?: string;
  feeDecision?: ApprovalDecision;
  feeReason?: string;
}

