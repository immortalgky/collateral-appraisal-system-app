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
  /** Grid header. Keep it short — headers are nowrap, so a long one widens the column. */
  label: string;
  /**
   * Full FSD wording, shown as a hover tooltip when `label` is an abbreviation.
   * The Excel/PDF export carries the full wording in its own column definitions.
   */
  fullLabel?: string;
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
  | 'assignType'
  | 'purpose'
  | 'externalStaff'
  | 'departmentCode'
  | 'aoCode'
  | 'appraisalType'
  | 'feeType';

// ─── Report config ────────────────────────────────────────────────────────────

export interface ReportConfig {
  slug: string;
  title: string;
  columns: ColumnDef[];
  filters: FilterField[];
  /**
   * Opt out of the "date range soft-defaults to today" behaviour. For reports whose date filter
   * binds a historical column rather than a create timestamp, today's date matches nothing.
   */
  skipDateDefault?: boolean;
  /** Default page size. Defaults to 20. */
  defaultPageSize?: number;
}

// The identifying key column is FIRST (sticky) on every row-level report.
const APPRAISAL_NO: ColumnDef = {
  key: 'appraisalNumber', label: 'Appraisal No.', field: 'appraisalNumber', type: 'text', sortKey: 'AppraisalNumber',
};
const CUSTOMER: ColumnDef = {
  key: 'customerName', label: 'Customer Name', field: 'customerName', type: 'text', sortKey: 'CustomerName', className: 'max-w-[160px] truncate',
};

// ─── OLA column sets (RCAS003/005/006/011) ────────────────────────────────────
// Appraisal Create Date + Role are the FSD-detail columns; RCAS006's FSD table omits Receive Date
// and OLA Staff/Verify (internal work has no company→bank handoff).

const OLA_FSD_COLUMNS: ColumnDef[] = [
  APPRAISAL_NO,
  CUSTOMER,
  { key: 'purpose', label: 'Purpose', field: 'purpose', type: 'text' },
  { key: 'applyLimitAmount', label: 'Apply/Limit Amount', field: 'applyLimitAmount', type: 'money', className: 'text-right' },
  { key: 'collateralType', label: 'Collateral Type', field: 'collateralType', type: 'text' },
  { key: 'appraisalCreateDate', label: 'Created Date', field: 'appraisalCreateDate', type: 'datetime', sortKey: 'AppraisalCreateDate' },
  { key: 'channel', label: 'Channel', field: 'channel', type: 'text' },
  { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
  { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
  { key: 'role', label: 'Role', field: 'role', type: 'text' },
  { key: 'appointmentDate', label: 'Appointment Date', field: 'appointmentDate', type: 'datetime' },
  { key: 'assignDate', label: 'Assigned Date', field: 'assignDate', type: 'datetime' },
  { key: 'receiveDate', label: 'Report Received Date', field: 'receiveDate', type: 'datetime' },
  { key: 'olaAppraisal', label: 'OLA Appraisal (hrs)', field: 'olaAppraisal', type: 'number', className: 'text-right' },
  { key: 'olaInternalStaffVerify', label: 'OLA Internal Staff (Verify)', field: 'olaInternalStaffVerify', type: 'number', className: 'text-right' },
  { key: 'olaInternalChecker', label: 'OLA Internal Checker', field: 'olaInternalChecker', type: 'number', className: 'text-right' },
  { key: 'olaInternalStaffPlusChecker', label: 'OLA (Internal Staff + Internal Checker)', field: 'olaInternalStaffPlusChecker', type: 'number', className: 'text-right' },
  { key: 'olaInternalVerify', label: 'OLA Internal Verify', field: 'olaInternalVerify', type: 'number', className: 'text-right' },
  { key: 'olaApproval', label: 'OLA Approval', field: 'olaApproval', type: 'number', className: 'text-right' },
  { key: 'appraisalStatus', label: 'Status', field: 'appraisalStatus', type: 'text' },
];

// RCAS006 omits Receive Date + OLA Staff/Verify.
const OLA_006_COLUMNS: ColumnDef[] = OLA_FSD_COLUMNS.filter(
  c => c.key !== 'receiveDate' && c.key !== 'olaInternalStaffVerify',
);

const OLA_FILTERS: FilterField[] = [
  'appraisalNumber', 'customerName', 'createdFrom', 'createdTo', 'status', 'purpose', 'appraisalCompany',
  'internalStaff', 'externalStaff', 'channel',
];

// RCAS003/011 add filters their FSD criteria call for but RCAS005/006 don't (see per-report usage below).
// RCAS003's FSD lists an AO code criterion too, but it is deliberately not exposed for now.
const RCAS011_FILTERS: FilterField[] = [...OLA_FILTERS, 'aoCode', 'departmentCode'];

// ─── SLA column set (RCAS007/012) ─────────────────────────────────────────────

const SLA_COLUMNS: ColumnDef[] = [
  APPRAISAL_NO,
  CUSTOMER,
  { key: 'purpose', label: 'Purpose', field: 'purpose', type: 'text' },
  { key: 'requestorName', label: 'Requestor', field: 'requestorName', type: 'text' },
  { key: 'requestorPhone', label: 'Requestor Phone', field: 'requestorPhone', type: 'text' },
  { key: 'requestorDepartment', label: 'Requestor Dept.', field: 'requestorDepartment', type: 'text' },
  { key: 'bankingSegment', label: 'Retail/IBG', field: 'bankingSegment', type: 'text' },
  { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
  { key: 'externalStaffName', label: 'External Staff', field: 'externalStaffName', type: 'text' },
  { key: 'appraisalCompanyPhone', label: 'Company Phone', field: 'appraisalCompanyPhone', type: 'text' },
  { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
  { key: 'internalAppraisalStaffPhone', label: 'Internal Staff Phone', field: 'internalAppraisalStaffPhone', type: 'text' },
  { key: 'appraisalFee', label: 'Fee', field: 'appraisalFee', type: 'money', className: 'text-right' },
  { key: 'appraisalCreateDate', label: 'Created Date', field: 'appraisalCreateDate', type: 'datetime', sortKey: 'AppraisalCreateDate' },
  { key: 'appointmentDate', label: 'Appointment Date', field: 'appointmentDate', type: 'datetime' },
  { key: 'sla', label: 'SLA (days)', field: 'sla', type: 'number', className: 'text-right' },
  { key: 'appraisalValue', label: 'Appraisal Value', field: 'appraisalValue', type: 'money', className: 'text-right' },
  { key: 'role', label: 'Current Role', field: 'role', type: 'text' },
  { key: 'appraisalStatus', label: 'Status', field: 'appraisalStatus', type: 'text' },
];

const SLA_FILTERS: FilterField[] = [
  'appraisalNumber', 'customerName', 'createdFrom', 'createdTo', 'status', 'purpose', 'appraisalCompany',
  'internalStaff', 'externalStaff',
];

// ─── All 12 report configs ────────────────────────────────────────────────────

export const OPERATIONAL_REPORTS: ReportConfig[] = [
  // ── RCAS001: Appraisal Books ───────────────────────────────────────────────
  {
    slug: 'rcas001',
    title: 'RCAS001 - Appraisal Books',
    filters: ['appraisalNumber', 'createdFrom', 'createdTo', 'status', 'bankingSegment', 'departmentCode'],
    columns: [
      APPRAISAL_NO,
      { key: 'runningNo', label: 'Running No.', field: 'runningNo', type: 'int', className: 'text-right' },
      { key: 'appraisalCreateDate', label: 'Created Date', field: 'appraisalCreateDate', type: 'datetime', sortKey: 'AppraisalCreateDate' },
      CUSTOMER,
      { key: 'appraisalPurpose', label: 'Purpose', field: 'appraisalPurpose', type: 'text' },
      { key: 'applyLimitAmount', label: 'Apply/Limit Amount', field: 'applyLimitAmount', type: 'money', className: 'text-right' },
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
    filters: ['appraisalNumber', 'createdFrom', 'createdTo', 'reviewType', 'stage', 'customerName'],
    // The date range binds ValuationDate (see Rcas002Report.Build) — a historical date, typically
    // years in the past. Defaulting it to today would open this report empty.
    skipDateDefault: true,
    columns: [
      APPRAISAL_NO,
      { key: 'reviewType', label: 'Review Type', field: 'reviewType', type: 'text' },
      { key: 'stage', label: 'Stage', field: 'stage', type: 'text' },
      { key: 'previousAppraisalNumber', label: 'Previous No.', field: 'previousAppraisalNumber', type: 'text' },
      { key: 'collateralNumber', label: 'Collateral No.', field: 'collateralNumber', type: 'text' },
      { key: 'cifNumber', label: 'CIF', field: 'cifNumber', type: 'text' },
      CUSTOMER,
      { key: 'applyLimitAmount', label: 'Apply/Limit Amount', field: 'applyLimitAmount', type: 'money', className: 'text-right' },
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

  // ── RCAS003: Monthly workload (OLA) ────────────────────────────────────────
  { slug: 'rcas003', title: 'RCAS003 - Monthly Workload Summary', filters: OLA_FILTERS, columns: OLA_FSD_COLUMNS },

  // ── RCAS004: Inspection <100% ──────────────────────────────────────────────
  {
    slug: 'rcas004',
    title: 'RCAS004 - Inspection Progress (<100%)',
    filters: ['appraisalNumber', 'createdFrom', 'createdTo', 'status'],
    columns: [
      APPRAISAL_NO,
      CUSTOMER,
      { key: 'purpose', label: 'Purpose', field: 'purpose', type: 'text' },
      { key: 'applyLimitAmount', label: 'Apply/Limit Amount', field: 'applyLimitAmount', type: 'money', className: 'text-right' },
      { key: 'collateralType', label: 'Collateral Type', field: 'collateralType', type: 'text' },
      { key: 'channel', label: 'Channel', field: 'channel', type: 'text' },
      { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
      { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
      { key: 'appraisalValue', label: 'Value', field: 'appraisalValue', type: 'money', className: 'text-right' },
      { key: 'previousAppraisalNumber', label: 'Previous No.', field: 'previousAppraisalNumber', type: 'text' },
      { key: 'appointmentDate', label: 'Appointment Date', field: 'appointmentDate', type: 'datetime' },
      { key: 'appraisalStatus', label: 'Status', field: 'appraisalStatus', type: 'text' },
      { key: 'progressiveInspectionPct', label: 'Inspection %', field: 'progressiveInspectionPct', type: 'percent', className: 'text-right' },
    ],
  },

  // ── RCAS005: by External company (OLA) ─────────────────────────────────────
  { slug: 'rcas005', title: 'RCAS005 - Summary by External Company', filters: OLA_FILTERS, columns: OLA_FSD_COLUMNS },

  // ── RCAS006: by Internal staff (OLA, trimmed) ──────────────────────────────
  { slug: 'rcas006', title: 'RCAS006 - Summary by Internal Staff', filters: OLA_FILTERS, columns: OLA_006_COLUMNS },

  // ── RCAS007: SLA summary ───────────────────────────────────────────────────
  { slug: 'rcas007', title: 'RCAS007 - SLA Summary', filters: SLA_FILTERS, columns: SLA_COLUMNS },

  // ── RCAS008: Service Quality ───────────────────────────────────────────────
  {
    slug: 'rcas008',
    title: 'RCAS008 - Service Quality Evaluation',
    filters: ['appraisalNumber', 'approvedFrom', 'approvedTo', 'bankingSegment', 'appraisalCompany', 'evaluationStatus', 'purpose', 'appraisalType'],
    columns: [
      APPRAISAL_NO,
      { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
      { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
      { key: 'approvedDate', label: 'Approved Date', field: 'approvedDate', type: 'date', sortKey: 'ApprovedDate' },
      { key: 'bankingSegment', label: 'Banking Segment', field: 'bankingSegment', type: 'text' },
      { key: 'totalScorePct', label: 'Total Score %', field: 'totalScorePct', type: 'percent', className: 'text-right' },
      // Scores are abbreviated on screen; fullLabel carries the FSD wording (items 7–15) as a tooltip.
      { key: 'scoreReportQuality', label: 'Report Quality', fullLabel: 'Score of Report book quality', field: 'scoreReportQuality', type: 'int', className: 'text-right' },
      { key: 'scoreDeliveryTime', label: 'Delivery Time (SLA)', fullLabel: 'Score of Delivery time (SLA)', field: 'scoreDeliveryTime', type: 'int', className: 'text-right' },
      { key: 'scorePersonnel', label: 'Personnel Preparation', fullLabel: "Score of Preparing the company's personnel for accepting bank assessment work", field: 'scorePersonnel', type: 'int', className: 'text-right' },
      { key: 'scoreResponseTime', label: 'Response Time', fullLabel: 'Score of Response time to problem resolution', field: 'scoreResponseTime', type: 'int', className: 'text-right' },
      { key: 'scoreCoordination', label: 'Coordination', fullLabel: 'Score of Coordination and responsibility in work', field: 'scoreCoordination', type: 'int', className: 'text-right' },
      { key: 'remark', label: 'Remark', field: 'remark', type: 'text' },
    ],
  },

  // ── RCAS009: Fee Summary ───────────────────────────────────────────────────
  {
    slug: 'rcas009',
    title: 'RCAS009 - Fee Summary',
    filters: ['appraisalNumber', 'createdFrom', 'createdTo', 'payType', 'appraisalCompany', 'feeStatus'],
    columns: [
      APPRAISAL_NO,
      CUSTOMER,
      { key: 'assignType', label: 'Assign Type', field: 'assignType', type: 'text' },
      { key: 'payType', label: 'Pay Type', field: 'payType', type: 'text' },
      { key: 'purpose', label: 'Purpose', field: 'purpose', type: 'text' },
      { key: 'appraisalCreateDate', label: 'Created Date', field: 'appraisalCreateDate', type: 'date', sortKey: 'AppraisalCreateDate' },
      { key: 'collateralType', label: 'Collateral Type', field: 'collateralType', type: 'text' },
      { key: 'requestorCode', label: 'Requestor', field: 'requestorCode', type: 'text' },
      { key: 'requestorDepartment', label: 'Requestor Dept.', field: 'requestorDepartment', type: 'text' },
      { key: 'bankingSegment', label: 'Retail/IBG', field: 'bankingSegment', type: 'text' },
      { key: 'appraisalCompany', label: 'Company', field: 'appraisalCompany', type: 'text' },
      { key: 'internalAppraisalStaff', label: 'Internal Staff', field: 'internalAppraisalStaff', type: 'text' },
      { key: 'invoiceNumber', label: 'Invoice No.', field: 'invoiceNumber', type: 'text' },
      { key: 'appraisalFee', label: 'Fee', field: 'appraisalFee', type: 'money', className: 'text-right' },
      { key: 'vat', label: 'VAT', field: 'vat', type: 'money', className: 'text-right' },
      { key: 'includeVat', label: 'Incl. VAT', field: 'includeVat', type: 'money', className: 'text-right' },
      { key: 'costCenter', label: 'Cost Center', field: 'costCenter', type: 'text' },
      { key: 'appraisalStatus', label: 'Status', field: 'appraisalStatus', type: 'text' },
    ],
  },

  // ── RCAS010: Bank-Absorbed Fees (single summary row) ───────────────────────
  {
    slug: 'rcas010',
    title: 'RCAS010 - Bank-Absorbed Fees',
    filters: ['createdFrom', 'createdTo', 'channel', 'departmentCode', 'aoCode', 'status', 'appraisalCompany', 'feeType'],
    columns: [
      { key: 'internalBookCount', label: 'Internal – Books', field: 'internalBookCount', type: 'int', className: 'text-right' },
      { key: 'internalTotalFee', label: 'Internal – Fee', field: 'internalTotalFee', type: 'money', className: 'text-right' },
      { key: 'internalCustomerPaidCount', label: 'Internal – Cust-Paid Books', field: 'internalCustomerPaidCount', type: 'int', className: 'text-right' },
      { key: 'internalCustomerPaidFee', label: 'Internal – Cust-Paid Fee', field: 'internalCustomerPaidFee', type: 'money', className: 'text-right' },
      { key: 'internalBankAbsorbCount', label: 'Internal – Bank-Absorb Books', field: 'internalBankAbsorbCount', type: 'int', className: 'text-right' },
      { key: 'internalBankAbsorbFee', label: 'Internal – Bank-Absorb Fee', field: 'internalBankAbsorbFee', type: 'money', className: 'text-right' },
      { key: 'externalBookCount', label: 'External – Books', field: 'externalBookCount', type: 'int', className: 'text-right' },
      { key: 'externalTotalFee', label: 'External – Fee', field: 'externalTotalFee', type: 'money', className: 'text-right' },
      { key: 'externalCustomerPaidCount', label: 'External – Cust-Paid Books', field: 'externalCustomerPaidCount', type: 'int', className: 'text-right' },
      { key: 'externalCustomerPaidFee', label: 'External – Cust-Paid Fee', field: 'externalCustomerPaidFee', type: 'money', className: 'text-right' },
      { key: 'externalBankAbsorbCount', label: 'External – Bank-Absorb Books', field: 'externalBankAbsorbCount', type: 'int', className: 'text-right' },
      { key: 'externalBankAbsorbFee', label: 'External – Bank-Absorb Fee', field: 'externalBankAbsorbFee', type: 'money', className: 'text-right' },
      { key: 'grandTotalCount', label: 'Grand Total – Books', field: 'grandTotalCount', type: 'int', className: 'text-right' },
      { key: 'grandTotalFee', label: 'Grand Total – Fee', field: 'grandTotalFee', type: 'money', className: 'text-right' },
    ],
  },

  // ── RCAS011: Detail by RM (OLA) ────────────────────────────────────────────
  { slug: 'rcas011', title: 'RCAS011 - Detail by RM', filters: RCAS011_FILTERS, columns: OLA_FSD_COLUMNS },

  // ── RCAS012: Company Follow-up (SLA) ───────────────────────────────────────
  { slug: 'rcas012', title: 'RCAS012 - Company Follow-up', filters: SLA_FILTERS, columns: SLA_COLUMNS },
];

// ─── Lookup helper ─────────────────────────────────────────────────────────────

export function findReportConfig(slug: string): ReportConfig | undefined {
  return OPERATIONAL_REPORTS.find(r => r.slug === slug);
}
