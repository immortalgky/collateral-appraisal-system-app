// ─── Enums / constants ────────────────────────────────────────────────────────

export type ReviewTypeCode = '1' | '2' | '3';

export const REVIEW_TYPE_LABELS: Record<ReviewTypeCode, string> = {
  '1': 'Normal Review',
  '2': 'Before Stage 3',
  '3': 'Stage 3',
};

// ─── List ──────────────────────────────────────────────────────────────────────

export interface ReappraisalCandidateListItem {
  id: string;
  status: string;
  reviewType: ReviewTypeCode;
  appraisalDate: string; // ISO date yyyy-MM-dd
  remainingDay: number;
  oldAppraisalReportNumber: string;
  cifNumber: string;
  customerName?: string;
  collateralId: string;
  collateralName?: string;
  currentValue?: number;
  channel: 'SIBS';
  hasOpenAppraisal: boolean;
  openAppraisalId?: string;
  openAppraisalNumber?: string; // The matched open reappraisal Appraisal's number, shown in the badge.
  openAppraisalGroupTag?: string; // Group tag from the matched open Appraisal, used for the indicator badge.
}

// ─── Detail ────────────────────────────────────────────────────────────────────

export type NearbyReappraisalCandidateSource = 'InSystem' | 'Candidate';

export interface NearbyReappraisalCandidate {
  // Stable row identity: appraisalId ?? candidateId
  appraisalId?: string;
  candidateId?: string;
  source: NearbyReappraisalCandidateSource;
  oldAppraisalReportNumber: string;
  cifNumber?: string;
  customerName?: string;
  collateralId?: string;
  collateralName?: string;
  currentValue?: number;
  appraisalDate: string; // ISO date
  remainingDay: number;
  reviewType?: string; // only meaningful for "Candidate" rows
  daysSinceLastAppraisal?: number; // today − (candidate ValuationDate or in-system AppointmentDateTime)
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
}

export interface ReappraisalCandidateDetail extends ReappraisalCandidateListItem {
  /** Matched in-system Appraisal.Id (NOT the candidate `id`). Undefined when the
   *  old report number doesn't resolve to any in-system appraisal (e.g. AS400-only). */
  appraisalId?: string;
  latitude?: number;
  longitude?: number;
  collateralAddress?: string;
  collateralDescription?: string;
  carCode?: string;
  sllOver100M?: boolean;
  sllDescription?: string;
  aoCode?: string;
  aoName?: string;
  valuationDate?: string;
  mortgageAmount?: number;
  facilityLimit?: number;
  pastDueDay?: number;
  externalValuerName?: string;
  internalValuerName?: string;
  daysSinceLastAppraisal?: number;
  // Trailing extension fields from the COLLATREV file (pos 641–660).
  stage?: string;
  ibgRetail?: string;
  group?: string;
  effectiveDateAppraisal?: string;
  nearbyGroupCandidates: NearbyReappraisalCandidate[];
}

// ─── API request params ────────────────────────────────────────────────────────

export interface ReappraisalCandidateListParams {
  pageNumber?: number;
  pageSize?: number;
  customerName?: string;
  oldAppraisalReportNumber?: string;
  cifNumber?: string;
  collateralId?: string;
  reviewType?: ReviewTypeCode;
  reviewDateFrom?: string; // yyyy-MM-dd
  reviewDateTo?: string;   // yyyy-MM-dd
  remainingDayFrom?: number;
  remainingDayTo?: number;
}

// Filter subset that feeds the filter dialog (subset of params, no pagination)
export type ReappraisalFilterValues = Omit<
  ReappraisalCandidateListParams,
  'pageNumber' | 'pageSize'
>;

// ─── Initiate ─────────────────────────────────────────────────────────────────

export interface UserInfoDto {
  userId: string;
  username: string;
}

export interface InitiateReappraisalRequest {
  candidateIds: string[];
  nearbyAppraisalIds: string[];
  requestor: UserInfoDto;
  creator: UserInfoDto;
}

export interface SkippedReappraisalItem {
  appraisalId: string;
  oldAppraisalReportNumber: string;
  reason: 'AlreadyInFlight';
  existingRequestId?: string;
}

export interface InitiateReappraisalResult {
  groupNumber: string;
  createdRequestIds: string[];
  skipped: SkippedReappraisalItem[];
}

// ─── Pagination wrapper (matches PaginatedResult<T> from the backend) ──────────

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
}
