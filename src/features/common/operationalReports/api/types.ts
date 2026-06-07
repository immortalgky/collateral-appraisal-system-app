// ─── Shared pagination result (mirrors monitoring PaginatedResult) ─────────────

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

// ─── Shared filter base ────────────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc';

export interface BaseReportFilter {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
  // Date filters (yyyy-MM-dd)
  createdFrom?: string;
  createdTo?: string;
  approvedFrom?: string;
  approvedTo?: string;
  // Common string filters
  status?: string;
  bankingSegment?: string;
  appraisalCompany?: string;
  internalStaff?: string;
  channel?: string;
  // rcas002
  reviewType?: string;
  stage?: string;
  customerName?: string;
  // rcas008
  evaluationStatus?: string;
  // rcas009
  payType?: string;
  feeStatus?: string;
  // rcas010
  assignType?: string;
}

// ─── Row types per report ──────────────────────────────────────────────────────

export interface Rcas001Row {
  appraisalCreateDate?: string | null;
  appraisalNumber?: string | null;
  customerName?: string | null;
  appraisalPurpose?: string | null;
  applyLimitAmount?: number | null;
  collateralType?: string | null;
  approachMethod?: string | null;
  appraisalPrice?: number | null;
  appraisalStatus?: string | null;
  requestorCode?: string | null;
  requestorDepartment?: string | null;
  bankingSegment?: string | null;
  internalAppraisalStaff?: string | null;
  appraisalCompany?: string | null;
  approveDate?: string | null;
}

export interface Rcas002Row {
  reviewType?: string | null;
  stage?: string | null;
  appraisalNumber?: string | null;
  previousAppraisalNumber?: string | null;
  collateralNumber?: string | null;
  cifNumber?: string | null;
  customerName?: string | null;
  applyLimitAmount?: number | null;
  collateralType?: string | null;
  titleDeedNumber?: string | null;
  bankingSegment?: string | null;
  appraisalCompany?: string | null;
  internalAppraisalStaff?: string | null;
  oldAppraisalValue?: number | null;
  pastDueDay?: number | null;
  valuationDate?: string | null;
  nextValuationDate?: string | null;
  remainingDays?: number | null;
}

export interface Rcas003Row {
  appraisalNumber?: string | null;
  customerName?: string | null;
  purpose?: string | null;
  applyLimitAmount?: number | null;
  collateralType?: string | null;
  channel?: string | null;
  appraisalCompany?: string | null;
  internalAppraisalStaff?: string | null;
  appointmentDate?: string | null;
  assignDate?: string | null;
  receiveDate?: string | null;
  olaAppraisal?: number | null;
  olaInternalStaffVerify?: number | null;
  olaInternalChecker?: number | null;
  olaInternalStaffPlusChecker?: number | null;
  olaInternalVerify?: number | null;
  olaApproval?: number | null;
  appraisalStatus?: string | null;
}

// rcas005, rcas006, rcas007, rcas011, rcas012 share the OLA shape
export type Rcas005Row = Rcas003Row;
export type Rcas006Row = Rcas003Row;
export type Rcas007Row = Rcas003Row;
export type Rcas011Row = Rcas003Row;
export type Rcas012Row = Rcas003Row;

export interface Rcas004Row {
  appraisalNumber?: string | null;
  customerName?: string | null;
  purpose?: string | null;
  applyLimitAmount?: number | null;
  collateralType?: string | null;
  channel?: string | null;
  appraisalCompany?: string | null;
  internalAppraisalStaff?: string | null;
  appraisalValue?: number | null;
  previousAppraisalNumber?: string | null;
  appointmentDate?: string | null;
  appraisalStatus?: string | null;
  progressiveInspectionPct?: number | null;
}

export interface Rcas008Row {
  appraisalNumber?: string | null;
  appraisalCompany?: string | null;
  approvedDate?: string | null;
  bankingSegment?: string | null;
  totalScorePct?: number | null;
  scoreReportQuality?: number | null;
  scoreDeliveryTime?: number | null;
  scorePersonnel?: number | null;
  scoreResponseTime?: number | null;
  scoreCoordination?: number | null;
  remark?: string | null;
  evaluationStatus?: string | null;
}

export interface Rcas009Row {
  appraisalNumber?: string | null;
  customerName?: string | null;
  assignType?: string | null;
  payType?: string | null;
  purpose?: string | null;
  appraisalCreateDate?: string | null;
  collateralType?: string | null;
  appraisalStatus?: string | null;
  requestorCode?: string | null;
  requestorDepartment?: string | null;
  bankingSegment?: string | null;
  appraisalCompany?: string | null;
  internalAppraisalStaff?: string | null;
  invoiceNumber?: string | null;
  costCenter?: string | null;
  appraisalFee?: number | null;
  vat?: number | null;
  includeVat?: number | null;
  feeStatus?: string | null;
}

export interface Rcas010Row {
  channel?: string | null;
  assignType?: string | null;
  bookCount?: number | null;
  totalFee?: number | null;
  customerPaidCount?: number | null;
  customerPaidFee?: number | null;
  bankAbsorbCount?: number | null;
  bankAbsorbFee?: number | null;
}

// ─── Union of all row types ────────────────────────────────────────────────────

export type AnyReportRow =
  | Rcas001Row
  | Rcas002Row
  | Rcas003Row
  | Rcas004Row
  | Rcas008Row
  | Rcas009Row
  | Rcas010Row;
