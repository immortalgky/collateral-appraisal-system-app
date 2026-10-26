/** Who put a fee item on the fee: the system's calculation, an admin before assignment, or a user. */
export type FeeItemSource = 'System' | 'Admin' | 'User';

export type FeeBaseSourceKind =
  | 'ConstructionInspectionFee'
  | 'Tier'
  | 'Quotation'
  | 'QuotationPending'
  | 'None';

/** Where the system-calculated appraisal fee (feeCode '01') comes from. Unused fields are null. */
export interface FeeBaseSource {
  kind: FeeBaseSourceKind;
  appraisalNumber: string | null;
  quotationNumber: string | null;
  winnerCompanyName: string | null;
  sellingPrice: number | null;
  tierMin: number | null;
  tierMax: number | null;
}

export interface FeePreviewItem {
  /** Null for a figure the system would create at assignment (nothing stored yet). */
  id: string | null;
  feeCode: string;
  description: string;
  amount: number;
  source: FeeItemSource;
}

/** GET /appraisals/{appraisalId}/fee-preview */
export interface FeePreview {
  /** The appraisal's fee row, null until one exists. */
  feeId: string | null;
  systemBaseAmount: number | null;
  baseSource: FeeBaseSource;
  adminOverrideAmount: number | null;
  items: FeePreviewItem[];
  /**
   * The server's verdict: the fee has an appraisal-fee base the assignment can bill (a 01 above 0).
   * Absent from an older API: the client then reads the items itself.
   */
  hasBillableBase?: boolean;
  subtotal: number;
  vatRate: number;
  vat: number;
  total: number;
}

/** All optional: omitted means the appraisal's actual assignment. */
export interface FeePreviewParams {
  assignmentType?: 'internal' | 'external' | 'external-offline';
  assignmentMethod?: 'manual' | 'roundrobin' | 'quotation';
}
