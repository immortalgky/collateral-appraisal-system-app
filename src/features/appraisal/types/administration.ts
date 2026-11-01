/**
 * Administration Types for Appraisal Assignment
 */

/**
 * Assignment type - internal staff or external company
 */
export type AssignmentType = 'internal' | 'external';

/**
 * Assignment method - manual selection, round-robin auto-assign, or quotation request
 */
export type AssignmentMethod = 'manual' | 'roundRobin' | 'quotation';

/**
 * Assignment status
 */
export type AssignmentStatus =
  | 'pending' // Not yet assigned
  | 'assigned' // Assigned, awaiting acceptance
  | 'accepted' // Assignment accepted
  | 'rejected' // Assignment rejected
  | 'completed'; // Work completed

/**
 * Internal staff member for assignment
 */
export interface InternalStaff {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  /** Job title and phone: only the user record (GET /auth/users/{id}) carries them. */
  position?: string;
  phone?: string;
  avatar: string | null;
  /**
   * Open tasks, as the eligible-assignees list counts them. Absent when no real number is known
   * (the user record has none; an older server omits it): show nothing, never 0.
   */
  currentWorkload?: number;
}

/**
 * External appraisal company
 */
export interface ExternalCompany {
  id: string;
  companyName: string;
  companyNameLocal?: string | null;
  registrationNo: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  rating: number; // 1-5 stars
  activeAssignments: number;
  // Banking Segments the company can appraise (Company.LoanTypes).
  loanTypes?: string[];
  // False when the company is outside its MOU approval window. Selecting it would be blocked
  // (escalated) at assignment time, so the picker should flag/disable it. Optional/advisory:
  // absent is treated as assignable.
  isAssignable?: boolean;
}

/**
 * Current assignment information (read-only display)
 * Matches AssignmentDto from API
 */
export interface CurrentAssignment {
  id: string;
  appraisalId: string;
  assignmentType: string;
  assignmentStatus: string;
  assigneeUserId: string | null;
  /** The assignee user's display name; null/absent when it cannot be resolved (show the code). */
  assigneeUserName?: string | null;
  assigneeCompanyId: string | null;
  externalAppraiserName: string | null;
  externalAppraiserLicense: string | null;
  assignmentMethod: string;
  reassignmentNumber: number;
  progressPercent: number;
  assignedAt: string;
  /** Employee code of whoever made the assignment. */
  assignedBy: string;
  /** Their display name; null when it cannot be resolved (show the code alone). */
  assignedByName?: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  internalAppraiserId: string | null;
  /** The follow-up staff member's display name; null/absent when it cannot be resolved. */
  internalAppraiserName?: string | null;
  internalFollowupAssignmentMethod: string | null;
  remark: string | null;
  // Set when the admin has saved a draft; null for a freshly-created (never-drafted) assignment.
  draftSavedAt: string | null;
  /**
   * Off-system external only: the appraisal date keyed off the company's paper book
   * (ValuationAnalyses.ValuationDate). Null on every other path, where the date is derived from
   * the appointment. Seeds the keyin screen so a correction cannot overwrite the recorded date.
   */
  offlineBookDate?: string | null;
  createdOn: string | null;
}

/**
 * The company that did the inspection on the prior appraisal the admin's appraisal was copied from
 * (Construction Inspection only). Dates carry no Z (local time).
 */
export interface PreviousCompany {
  companyId: string;
  companyName: string;
  appraisalId: string;
  appraisalNumber: string;
  /** Null when the prior is the original appraisal rather than an inspection. */
  inspectionNumber: number | null;
  completedAt: string | null;
  /** False when the company is outside its MOU approval window: shown, never preselected. */
  mouActive: boolean;
}

/** GET /appraisals/{appraisalId}/assignment-defaults, in the stored spelling (External, RoundRobin). */
export interface AssignmentDefaultsResponse {
  assignmentType: string;
  assignmentMethod: string;
  internalFollowupAssignmentMethod: string;
  /** Always sent; null when the appraisal has no prior inspection company. */
  previousCompany?: PreviousCompany | null;
}

/**
 * Form data for creating/updating assignment
 */
export interface AssignmentFormData {
  assignmentType: AssignmentType;
  assignmentMethod: AssignmentMethod;
  // Only one of these will have a value (mutual exclusion)
  staffId: string | null;
  companyId: string | null;
  // Selected entities for display
  selectedStaff: InternalStaff | null;
  selectedCompany: ExternalCompany | null;
  // External only - internal staff to follow up
  followupStaffId: string | null;
  selectedFollowupStaff: InternalStaff | null;
  // External only
  requireQuotation: boolean;
  // Notes/remarks
  remarks: string;
}

/**
 * Quotation status — matches backend PascalCase values exactly.
 * Old lowercase values ('draft', 'pending', etc.) have been removed; they came from the mock era.
 */
export type QuotationStatus =
  | 'Draft'
  | 'Sent'
  | 'UnderAdminReview'
  | 'PendingRmSelection'
  | 'WinnerTentative'
  | 'Negotiating'
  | 'Finalized'
  | 'Cancelled';

/**
 * Quotation record for listing
 * Matches QuotationDto from API (GET /quotations)
 */
export interface Quotation {
  id: string;
  quotationNumber: string;
  requestDate: string;
  cutOffTime: string;
  status: string;
  requestedByName: string;
  totalAppraisals: number;
  totalCompaniesInvited: number;
  totalQuotationsReceived: number;
  // Extended fields present on detail GET but also available on list
  rmUserId?: string;
  submissionsClosedAt?: string;
  shortlistSentToRmAt?: string;
  tentativeWinnerQuotationId?: string;
  tentativelySelectedAt?: string;
  /** When the winner was finalized (list DTO); null until then. */
  selectedAt?: string | null;
  tentativelySelectedByRole?: string;
}

/**
 * API request payload for creating a new quotation
 * Matches CreateQuotationRequest from API
 */
export interface CreateQuotationRequest {
  quotationNumber: string;
  cutOffTime: string;
  requestedBy: string;
  requestedByName: string;
  description?: string | null;
  specialRequirements?: string | null;
}

/**
 * API request for starting a quotation from a workflow task (new IBG flow).
 * POST /quotations/start-from-task
 * Note: requestedBy, requestedByName, and rmUserId are derived server-side from JWT claims.
 */
export interface StartQuotationFromTaskRequest {
  appraisalId: string;
  requestId: string;
  workflowInstanceId: string;
  /**
   * Optional. Was originally the Guid of the WorkflowActivityExecution for audit-tracking
   * when the system used to auto-complete the task. Now unused (admin completes the task
   * manually), so the frontend doesn't have a stable value to send.
   */
  taskExecutionId?: string | null;
  cutOffTime: string;
  invitedCompanyIds: string[];
  specialRequirements?: string | null;
  /**
   * Optional admin-set cap for the appraisal's duration (days). Per-appraisal, read-only
   * on the company side. Company's Estimated Mandays must not exceed this on Submit.
   */
  maxAppraisalDays?: number | null;
  /**
   * v2: If provided, adds the appraisalId to this existing Draft instead of creating a new one.
   */
  existingQuotationRequestId?: string | null;
  /** Pre-registers the assignment type chosen by the admin (e.g. 'External', 'Internal'). */
  assignmentType?: string | null;
  /** Pre-registers the assignment method chosen by the admin (e.g. 'Quotation', 'Direct'). */
  assignmentMethod?: string | null;
  /** Pre-registers the internal follow-up method (e.g. 'roundrobin', 'manual'). */
  internalFollowupAssignmentMethod?: string | null;
  /**
   * Company IDs previously engaged on this collateral (from CollateralMaster lookup).
   * Passed as a workflow variable so the engine can enforce appeal-exclusion rules.
   * NOTE: backend extension needed — POST /quotations/start-from-task must accept and
   * store this field before it becomes functional.
   */
  excludedCompanyIds?: string[] | null;
}

/**
 * Quotation that contains a specific appraisal (for the "active quotation" guard).
 */
export interface AppraisalActiveQuotation {
  id: string;
  quotationNumber: string;
  status: string;
}
