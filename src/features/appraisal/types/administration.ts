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
 */
export interface CurrentAssignment {
  id: string;
  assigneeId: string;
  assigneeName: string;
  assigneeType: AssignmentType;
  status: AssignmentStatus;
  assignedById: string;
  assignedByName: string;
  assignedAt: string; // ISO datetime
  requireQuotation?: boolean;
  quotationStatus?: 'pending' | 'received' | 'approved' | 'rejected';
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
 * API request payload for assignment
 */
export interface CreateAssignmentRequest {
  appraisalId: string;
  assignmentType: AssignmentType;
  assignmentMethod: AssignmentMethod;
  assigneeId: string | null; // null for round-robin
  followupStaffId?: string; // Internal staff to follow up on external assignments
  requireQuotation?: boolean;
  remarks?: string;
}

/**
 * API response for assignment
 */
export interface AssignmentResponse {
  success: boolean;
  assignment: CurrentAssignment;
  message?: string;
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
 */
export interface Quotation {
  id: string;
  quotationId: string; // Display ID like QUO-2024-001234
  appraisalCount: number; // No Of Appraisal Report
  quotedCount: number; // No of quoted
  createdOn: string; // ISO datetime
  cutOffTime: string; // ISO datetime
  status: QuotationStatus;
}

/**
 * API request payload for creating a new quotation
 */
export interface CreateQuotationRequest {
  appraisalId: string;
  companyIds: string[]; // Multiple companies can be selected
  cutOffDate: string; // ISO datetime
  remarks?: string;
}

/**
 * API request payload for adding to existing quotation
 */
export interface AddToQuotationRequest {
  appraisalId: string;
  quotationId: string;
}
