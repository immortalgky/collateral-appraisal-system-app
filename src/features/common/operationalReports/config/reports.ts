// ─── Column value types ───────────────────────────────────────────────────────

/**
 * The `type` field drives cell formatting:
 *   money    → right-aligned, thousands separator, 2 dp
 *   number   → right-aligned, thousands separator
 *   percent  → appends '%'
 *   int      → right-aligned integer
 *   date     → dd/MM/yyyy
 *   datetime → dd/MM/yyyy HH:mm
 *   text     → plain string (default)
 */
export type ColumnType = 'money' | 'number' | 'percent' | 'int' | 'date' | 'datetime' | 'text';

export interface ColumnDef {
  key: string;
  label: string;
  /** camelCase field name in the API response */
  field: string;
  type: ColumnType;
  /** Optional sort key sent to the server. Defaults to PascalCase of field. */
  sortKey?: string;
  className?: string;
}

// ─── Filter sets ──────────────────────────────────────────────────────────────

/**
 * Identifies which filter inputs appear on a given report page.
 * The OperationalReportPage renders only the subset listed here.
 */
export type FilterField =
  | 'appraisalNumber'
  | 'createdFrom'
  | 'createdTo'
  | 'approvedFrom'
  | 'approvedTo'
  | 'status'
  | 'bankingSegment'
  | 'appraisalCompany'
  | 'internalStaff'
  | 'channel'
  | 'reviewType'
  | 'stage'
  | 'customerName'
  | 'evaluationStatus'
  | 'payType'
  | 'feeStatus'
  | 'assignType';

// ─── Report config ────────────────────────────────────────────────────────────

export interface ReportConfig {
  slug: string;
  title: string;
  columns: ColumnDef[];
  filters: FilterField[];
  /** Default page size. Defaults to 20. rcas010 uses 50. */
  defaultPageSize?: number;
}

// ─── Shared OLA column set (rcas003/005/006/007/011/012) ──────────────────────

const OLA_COLUMNS: ColumnDef[] = [
  { key: 'appraisalNumber', label: 'Appraisal No.', field: 'appraisalNumber', type: 'text', sortKey: 'AppraisalNumber' },
  { key: 'customerName', label: 'Customer', field: 'customerName', type: 'text', sortKey: 'CustomerName', className: 'max-w-[160px] truncate' },
  { key: 'purpose', label: 'Purpose', field: 'purpose', type: 'text' },
  { key: 'applyLimitAmount', label: 'Apply/Limit', field: 'applyLimitAmount', type: 'money', className: 'text-right' },
  { key: 'collateralType', label: 'Collateral Type', field: 'collateralType', type: 'text' },
  { key: 'channel', label: 'Channel', field: 'channel', type: 'text' },
  { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
  { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
  { key: 'appointmentDate', label: 'Appointment', field: 'appointmentDate', type: 'datetime' },
  { key: 'assignDate', label: 'Assign', field: 'assignDate', type: 'datetime' },
  { key: 'receiveDate', label: 'Receive', field: 'receiveDate', type: 'datetime' },
  { key: 'olaAppraisal', label: 'OLA Appraisal (hrs)', field: 'olaAppraisal', type: 'number', className: 'text-right' },
  { key: 'olaInternalStaffVerify', label: 'OLA Staff/Verify', field: 'olaInternalStaffVerify', type: 'number', className: 'text-right' },
  { key: 'olaInternalChecker', label: 'OLA Checker', field: 'olaInternalChecker', type: 'number', className: 'text-right' },
  { key: 'olaInternalStaffPlusChecker', label: 'OLA Staff+Checker', field: 'olaInternalStaffPlusChecker', type: 'number', className: 'text-right' },
  { key: 'olaInternalVerify', label: 'OLA Verify', field: 'olaInternalVerify', type: 'number', className: 'text-right' },
  { key: 'olaApproval', label: 'OLA Approval', field: 'olaApproval', type: 'number', className: 'text-right' },
  { key: 'appraisalStatus', label: 'Status', field: 'appraisalStatus', type: 'text' },
];

// rcas003/005/006/007/011/012 share the same filters
const OLA_FILTERS: FilterField[] = [
  'appraisalNumber',
  'createdFrom',
  'createdTo',
  'status',
  'appraisalCompany',
  'internalStaff',
  'channel',
];

// ─── All 12 report configs ────────────────────────────────────────────────────

export const OPERATIONAL_REPORTS: ReportConfig[] = [
  // ── RCAS001: Appraisal Books ───────────────────────────────────────────────
  {
    slug: 'rcas001',
    title: 'RCAS001 - Appraisal Books',
    filters: ['appraisalNumber', 'createdFrom', 'createdTo', 'status', 'bankingSegment'],
    columns: [
      { key: 'appraisalCreateDate', label: 'Create Date', field: 'appraisalCreateDate', type: 'datetime', sortKey: 'AppraisalCreateDate' },
      { key: 'appraisalNumber', label: 'Appraisal No.', field: 'appraisalNumber', type: 'text', sortKey: 'AppraisalNumber' },
      { key: 'customerName', label: 'Customer', field: 'customerName', type: 'text', sortKey: 'CustomerName', className: 'max-w-[160px] truncate' },
      { key: 'appraisalPurpose', label: 'Purpose', field: 'appraisalPurpose', type: 'text' },
      { key: 'applyLimitAmount', label: 'Apply/Limit', field: 'applyLimitAmount', type: 'money', className: 'text-right' },
      { key: 'collateralType', label: 'Collateral Type', field: 'collateralType', type: 'text' },
      { key: 'approachMethod', label: 'Approach', field: 'approachMethod', type: 'text' },
      { key: 'appraisalPrice', label: 'Price', field: 'appraisalPrice', type: 'money', className: 'text-right' },
      { key: 'appraisalStatus', label: 'Status', field: 'appraisalStatus', type: 'text' },
      { key: 'requestorCode', label: 'Requestor', field: 'requestorCode', type: 'text' },
      { key: 'requestorDepartment', label: 'Requestor Dept.', field: 'requestorDepartment', type: 'text' },
      { key: 'bankingSegment', label: 'Retail/IBG', field: 'bankingSegment', type: 'text' },
      { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
      { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
      { key: 'approveDate', label: 'Approve Date', field: 'approveDate', type: 'datetime', sortKey: 'ApproveDate' },
    ],
  },

  // ── RCAS002: Reappraisal Due ───────────────────────────────────────────────
  {
    slug: 'rcas002',
    title: 'RCAS002 - Reappraisal Due',
    filters: ['appraisalNumber', 'reviewType', 'stage', 'customerName'],
    columns: [
      { key: 'reviewType', label: 'Review Type', field: 'reviewType', type: 'text' },
      { key: 'stage', label: 'Stage', field: 'stage', type: 'text' },
      { key: 'appraisalNumber', label: 'Appraisal No.', field: 'appraisalNumber', type: 'text', sortKey: 'AppraisalNumber' },
      { key: 'previousAppraisalNumber', label: 'Previous No.', field: 'previousAppraisalNumber', type: 'text' },
      { key: 'collateralNumber', label: 'Collateral No.', field: 'collateralNumber', type: 'text' },
      { key: 'cifNumber', label: 'CIF', field: 'cifNumber', type: 'text' },
      { key: 'customerName', label: 'Customer', field: 'customerName', type: 'text', sortKey: 'CustomerName', className: 'max-w-[160px] truncate' },
      { key: 'applyLimitAmount', label: 'Apply/Limit', field: 'applyLimitAmount', type: 'money', className: 'text-right' },
      { key: 'collateralType', label: 'Collateral Type', field: 'collateralType', type: 'text' },
      { key: 'titleDeedNumber', label: 'Title Deed', field: 'titleDeedNumber', type: 'text' },
      { key: 'bankingSegment', label: 'Retail/IBG', field: 'bankingSegment', type: 'text' },
      { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
      { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
      { key: 'oldAppraisalValue', label: 'Old Value', field: 'oldAppraisalValue', type: 'money', className: 'text-right' },
      { key: 'pastDueDay', label: 'Past Due Day', field: 'pastDueDay', type: 'int', className: 'text-right' },
      { key: 'valuationDate', label: 'Valuation Date', field: 'valuationDate', type: 'date' },
      { key: 'nextValuationDate', label: 'Next Valuation', field: 'nextValuationDate', type: 'date' },
      { key: 'remainingDays', label: 'Remaining Days', field: 'remainingDays', type: 'int', className: 'text-right' },
    ],
  },

  // ── RCAS003: OLA (channel 1) ───────────────────────────────────────────────
  {
    slug: 'rcas003',
    title: 'RCAS003 - OLA Report',
    filters: OLA_FILTERS,
    columns: OLA_COLUMNS,
  },

  // ── RCAS004: Inspection <100% ──────────────────────────────────────────────
  {
    slug: 'rcas004',
    title: 'RCAS004 - Inspection Progress (<100%)',
    filters: ['appraisalNumber', 'createdFrom', 'createdTo', 'status'],
    columns: [
      { key: 'appraisalNumber', label: 'Appraisal No.', field: 'appraisalNumber', type: 'text', sortKey: 'AppraisalNumber' },
      { key: 'customerName', label: 'Customer', field: 'customerName', type: 'text', sortKey: 'CustomerName', className: 'max-w-[160px] truncate' },
      { key: 'purpose', label: 'Purpose', field: 'purpose', type: 'text' },
      { key: 'applyLimitAmount', label: 'Apply/Limit', field: 'applyLimitAmount', type: 'money', className: 'text-right' },
      { key: 'collateralType', label: 'Collateral Type', field: 'collateralType', type: 'text' },
      { key: 'channel', label: 'Channel', field: 'channel', type: 'text' },
      { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
      { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
      { key: 'appraisalValue', label: 'Value', field: 'appraisalValue', type: 'money', className: 'text-right' },
      { key: 'previousAppraisalNumber', label: 'Previous No.', field: 'previousAppraisalNumber', type: 'text' },
      { key: 'appointmentDate', label: 'Appointment', field: 'appointmentDate', type: 'datetime' },
      { key: 'appraisalStatus', label: 'Status', field: 'appraisalStatus', type: 'text' },
      { key: 'progressiveInspectionPct', label: 'Inspection %', field: 'progressiveInspectionPct', type: 'percent', className: 'text-right' },
    ],
  },

  // ── RCAS005: OLA (channel 2) ───────────────────────────────────────────────
  {
    slug: 'rcas005',
    title: 'RCAS005 - OLA Report (Ch.2)',
    filters: OLA_FILTERS,
    columns: OLA_COLUMNS,
  },

  // ── RCAS006: OLA (channel 3) ───────────────────────────────────────────────
  {
    slug: 'rcas006',
    title: 'RCAS006 - OLA Report (Ch.3)',
    filters: OLA_FILTERS,
    columns: OLA_COLUMNS,
  },

  // ── RCAS007: OLA (channel 4) ───────────────────────────────────────────────
  {
    slug: 'rcas007',
    title: 'RCAS007 - OLA Report (Ch.4)',
    filters: OLA_FILTERS,
    columns: OLA_COLUMNS,
  },

  // ── RCAS008: Service Quality ───────────────────────────────────────────────
  {
    slug: 'rcas008',
    title: 'RCAS008 - Service Quality Evaluation',
    filters: ['appraisalNumber', 'approvedFrom', 'approvedTo', 'bankingSegment', 'appraisalCompany', 'evaluationStatus'],
    columns: [
      { key: 'appraisalNumber', label: 'Appraisal No.', field: 'appraisalNumber', type: 'text', sortKey: 'AppraisalNumber' },
      { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
      { key: 'approvedDate', label: 'Approved', field: 'approvedDate', type: 'date', sortKey: 'ApprovedDate' },
      { key: 'bankingSegment', label: 'Retail/IBG', field: 'bankingSegment', type: 'text' },
      { key: 'totalScorePct', label: 'Total %', field: 'totalScorePct', type: 'percent', className: 'text-right' },
      { key: 'scoreReportQuality', label: 'Report Quality', field: 'scoreReportQuality', type: 'int', className: 'text-right' },
      { key: 'scoreDeliveryTime', label: 'Delivery', field: 'scoreDeliveryTime', type: 'int', className: 'text-right' },
      { key: 'scorePersonnel', label: 'Personnel', field: 'scorePersonnel', type: 'int', className: 'text-right' },
      { key: 'scoreResponseTime', label: 'Response', field: 'scoreResponseTime', type: 'int', className: 'text-right' },
      { key: 'scoreCoordination', label: 'Coordination', field: 'scoreCoordination', type: 'int', className: 'text-right' },
      { key: 'remark', label: 'Remark', field: 'remark', type: 'text' },
      { key: 'evaluationStatus', label: 'Eval Status', field: 'evaluationStatus', type: 'text' },
    ],
  },

  // ── RCAS009: Fee Summary ───────────────────────────────────────────────────
  {
    slug: 'rcas009',
    title: 'RCAS009 - Fee Summary',
    filters: ['appraisalNumber', 'createdFrom', 'createdTo', 'payType', 'appraisalCompany', 'feeStatus'],
    columns: [
      { key: 'appraisalNumber', label: 'Appraisal No.', field: 'appraisalNumber', type: 'text', sortKey: 'AppraisalNumber' },
      { key: 'customerName', label: 'Customer', field: 'customerName', type: 'text', sortKey: 'CustomerName', className: 'max-w-[160px] truncate' },
      { key: 'assignType', label: 'Assign Type', field: 'assignType', type: 'text' },
      { key: 'payType', label: 'Pay Type', field: 'payType', type: 'text' },
      { key: 'purpose', label: 'Purpose', field: 'purpose', type: 'text' },
      { key: 'appraisalCreateDate', label: 'Create Date', field: 'appraisalCreateDate', type: 'date', sortKey: 'AppraisalCreateDate' },
      { key: 'collateralType', label: 'Collateral Type', field: 'collateralType', type: 'text' },
      { key: 'appraisalStatus', label: 'Status', field: 'appraisalStatus', type: 'text' },
      { key: 'requestorCode', label: 'Requestor', field: 'requestorCode', type: 'text' },
      { key: 'requestorDepartment', label: 'Requestor Dept.', field: 'requestorDepartment', type: 'text' },
      { key: 'bankingSegment', label: 'Retail/IBG', field: 'bankingSegment', type: 'text' },
      { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
      { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
      { key: 'invoiceNumber', label: 'Invoice No.', field: 'invoiceNumber', type: 'text' },
      { key: 'costCenter', label: 'Cost Center', field: 'costCenter', type: 'text' },
      { key: 'appraisalFee', label: 'Fee', field: 'appraisalFee', type: 'money', className: 'text-right' },
      { key: 'vat', label: 'VAT', field: 'vat', type: 'money', className: 'text-right' },
      { key: 'includeVat', label: 'Incl. VAT', field: 'includeVat', type: 'money', className: 'text-right' },
      { key: 'feeStatus', label: 'Fee Status', field: 'feeStatus', type: 'text' },
    ],
  },

  // ── RCAS010: Bank-Absorbed Fees (aggregate) ────────────────────────────────
  {
    slug: 'rcas010',
    title: 'RCAS010 - Bank-Absorbed Fees',
    filters: ['createdFrom', 'createdTo', 'channel', 'assignType'],
    defaultPageSize: 50,
    columns: [
      { key: 'channel', label: 'Channel', field: 'channel', type: 'text' },
      { key: 'assignType', label: 'Assign Type', field: 'assignType', type: 'text' },
      { key: 'bookCount', label: 'Book Count', field: 'bookCount', type: 'int', className: 'text-right' },
      { key: 'totalFee', label: 'Total Fee', field: 'totalFee', type: 'money', className: 'text-right' },
      { key: 'customerPaidCount', label: 'Cust-Paid Count', field: 'customerPaidCount', type: 'int', className: 'text-right' },
      { key: 'customerPaidFee', label: 'Cust-Paid Fee', field: 'customerPaidFee', type: 'money', className: 'text-right' },
      { key: 'bankAbsorbCount', label: 'Bank-Absorb Count', field: 'bankAbsorbCount', type: 'int', className: 'text-right' },
      { key: 'bankAbsorbFee', label: 'Bank-Absorb Fee', field: 'bankAbsorbFee', type: 'money', className: 'text-right' },
    ],
  },

  // ── RCAS011: OLA (channel 5) ───────────────────────────────────────────────
  {
    slug: 'rcas011',
    title: 'RCAS011 - OLA Report (Ch.5)',
    filters: OLA_FILTERS,
    columns: OLA_COLUMNS,
  },

  // ── RCAS012: OLA (channel 6) ───────────────────────────────────────────────
  {
    slug: 'rcas012',
    title: 'RCAS012 - OLA Report (Ch.6)',
    filters: OLA_FILTERS,
    columns: OLA_COLUMNS,
  },
];

// ─── Lookup helper ─────────────────────────────────────────────────────────────

export function findReportConfig(slug: string): ReportConfig | undefined {
  return OPERATIONAL_REPORTS.find(r => r.slug === slug);
}
