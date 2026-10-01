// ─── Enums / constants ────────────────────────────────────────────────────────

export type ReviewTypeCode = '1' | '2' | '3';

export const REVIEW_TYPE_LABELS: Record<ReviewTypeCode, string> = {
  '1': 'Normal Review',
  '2': 'Before Stage 3',
  '3': 'Stage 3',
};

// ─── List ──────────────────────────────────────────────────────────────────────

/** Where the prior book lives: an appraisal in CAS, the bank's legacy AS400 listing (99A…), or nowhere. */
export type PriorAppraisalSource = 'CAS' | 'AS400Legacy' | 'Unknown';

/** List tabs: the to-do list, books marked "not reviewing this round" (stored as Deleted), or processed
 *  books — a reappraisal request was submitted (stored as Consumed; the whole history). */
export type ReappraisalListStatus = 'Pending' | 'Deleted' | 'Consumed';

/** Processed tab filter: the state of the reappraisal the book produced. */
export type NewAppraisalState = 'Appraising' | 'Completed' | 'Cancelled' | 'NotFound';

export interface ReappraisalCandidateListItem {
  id: string;
  status: string;
  reviewType: ReviewTypeCode;
  appraisalDate?: string; // ISO date yyyy-MM-dd — absent when the prior book cannot be traced
  remainingDay?: number;
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
  /** Request created by Initiate and not yet submitted — the book is in progress without an appraisal. */
  openRequestId?: string;
  openRequestNumber?: string;
  priorAppraisalSource: PriorAppraisalSource;
  /** Date of the first AS400 file that listed this book (how long it has been waiting). */
  firstSeenFileDate: string;
  lastSeenFileDate: string;
  /** The row reviews ONE unit of a block project (each collateral is its own unit). */
  isBlockUnit?: boolean;
  /** Units matched for the row: 1 = found (unit* below), 0 = none, more = ambiguous. */
  unitMatchedUnits?: number;
  unitTowerName?: string;
  unitFloor?: number;
  unitRoomNumber?: string;
  unitHouseNumber?: string;
  unitPlotNumber?: string;
  // Processed books only: the reappraisal the book produced.
  newAppraisalId?: string;
  newAppraisalNumber?: string;
  newAppraisalStatus?: string;
  /** Initiate's group number; absent when staff raised the request by hand. */
  newAppraisalGroupTag?: string;
  newAppraisalSubmittedAt?: string;
  newAppraisalCompletedAt?: string;
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
  appraisalDate?: string; // ISO date — absent when the prior book cannot be traced
  remainingDay?: number;
  reviewType?: string; // only meaningful for "Candidate" rows
  daysSinceLastAppraisal?: number; // today − (candidate ValuationDate or in-system AppointmentDateTime)
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  /** Already under review (open reappraisal or a request waiting) — listed but not selectable. */
  isInProgress?: boolean;
}

/** A block-project unit row: its project and the unit matched in CAS. */
export interface BlockUnitInfo {
  projectAppraisalId: string;
  projectAppraisalNumber: string;
  projectType?: 'U' | 'LB' | 'L' | string;
  projectName?: string;
  projectValuationDate?: string;
  matchedUnits: number;
  matchedBy?: 'Ticket' | 'CollateralName' | 'CollateralAddress';
  towerName?: string;
  floor?: number;
  roomNumber?: string;
  condoRegistrationNumber?: string;
  usableArea?: number;
  modelType?: string;
  houseNumber?: string;
  plotNumber?: string;
  landArea?: number;
  unitPrice?: number;
}

export interface ReappraisalCandidateDetail extends ReappraisalCandidateListItem {
  unit?: BlockUnitInfo;
  /** The report number as CAS stores it (AS400's block-project 'B' prefix dropped). */
  normalizedSurveyNumber: string;
  /** Matched in-system Appraisal.Id (NOT the candidate `id`). Undefined when the
   *  old report number doesn't resolve to any in-system appraisal (e.g. AS400-only). */
  appraisalId?: string;
  latitude?: number;
  longitude?: number;
  collateralAddress?: string;
  collateralDescription?: string;
  carCode?: string;
  /** AS400 flag as sent ('Y' / 'N'). */
  sllOver100M?: string;
  sllDescription?: string;
  aoCode?: string;
  aoName?: string;
  valuationDate?: string;
  mortgageAmount?: number;
  facilityLimit?: number;
  collateralCode?: string;
  collateralCategory?: string;
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

/** `NonCAS` = the prior book is not an appraisal in CAS (legacy AS400 or not found). */
export type PriorSourceFilter = PriorAppraisalSource | 'NonCAS';

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
  reviewDateTo?: string; // yyyy-MM-dd
  remainingDayFrom?: number;
  remainingDayTo?: number;
  /** Whitelisted PascalCase view column, e.g. 'OldAppraisalReportNumber'. */
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  status?: ReappraisalListStatus;
  /** One box for book number, CIF or customer name. */
  search?: string;
  priorSource?: PriorSourceFilter;
  inProgress?: boolean;
  /** Processed tab only. */
  newAppraisalState?: NewAppraisalState;
}

// Filter subset that feeds the filter dialog (subset of params, no pagination or sort)
export type ReappraisalFilterValues = Omit<
  ReappraisalCandidateListParams,
  | 'pageNumber'
  | 'pageSize'
  | 'sortBy'
  | 'sortDir'
  | 'status'
  | 'search'
  | 'inProgress'
  | 'newAppraisalState'
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
  /** Prior appraisal; absent for a legacy AS400 book (99A…) that is not in CAS. */
  appraisalId?: string;
  oldAppraisalReportNumber?: string;
  reason: 'AlreadyInFlight' | 'AlreadyReviewed' | 'NoBookNumber' | 'NotDue';
  existingRequestId?: string;
}

export interface InitiateReappraisalResult {
  groupNumber: string;
  createdRequestIds: string[];
  skipped: SkippedReappraisalItem[];
  /** Requests being created — one per accepted book, legacy AS400 books included. */
  acceptedCount?: number;
  /** The accepted books. `prevAppraisalId` absent = legacy AS400 book: its request starts empty. */
  accepted?: { bookNumber: string; prevAppraisalId?: string }[];
}

// ─── Pagination wrapper (matches PaginatedResult<T> from the backend) ──────────

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
}
