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
  avatar: string | null;
  currentWorkload: number; // Number of active assignments
}

/**
 * External appraisal company
 */
export interface ExternalCompany {
  id: string;
  companyName: string;
  registrationNo: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  rating: number; // 1-5 stars
  activeAssignments: number;
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
  assigneeCompanyId: string | null;
  externalAppraiserName: string | null;
  externalAppraiserLicense: string | null;
  assignmentMethod: string;
  reassignmentNumber: number;
  progressPercent: number;
  assignedAt: string;
  assignedBy: string;
  startedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  internalAppraiserId: string | null;
  createdOn: string | null;
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
 * Quotation status
 */
export type QuotationStatus =
  | 'draft'
  | 'pending'
  | 'quoted'
  | 'approved'
  | 'rejected'
  | 'expired';

/**
 * Quotation record for listing
 * Matches QuotationDto from API
 */
export interface Quotation {
  id: string;
  quotationNumber: string;
  requestDate: string;
  dueDate: string;
  status: string;
  requestedByName: string;
  totalAppraisals: number;
  totalCompaniesInvited: number;
  totalQuotationsReceived: number;
}

/**
 * API request payload for creating a new quotation
 * Matches CreateQuotationRequest from API
 */
export interface CreateQuotationRequest {
  quotationNumber: string;
  dueDate: string;
  requestedBy: string;
  requestedByName: string;
  description?: string | null;
  specialRequirements?: string | null;
}

/**
 * API request payload for adding to existing quotation
 */
export interface AddToQuotationRequest {
  appraisalId: string;
  quotationId: string;
}
