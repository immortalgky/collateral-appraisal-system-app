// ─── Status ───────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'Pending' | 'Sent' | 'Paid';

// ─── List ─────────────────────────────────────────────────────────────────────

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  itemCount: number;
  companyId: string;
  companyName: string | null;
  sentDate: string | null;
  paidDate: string | null;
  paymentOrderNo: string | null;
  createdAt: string;
}

export interface PaginatedInvoices {
  items: InvoiceListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  grandItemCount: number;
  grandTotalAmount: number;
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  assignmentId: string;
  appraisalNumber: string | null;
  customerName: string | null;
  productType: string | null;
  feeBeforeVAT: number;
  vatRate: number;
  vatAmount: number;
  totalFeeAfterVAT: number;
  bankAbsorbAmount: number;
  submittedDate: string | null;
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  companyName: string | null;
  companyId: string;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  notes: string | null;
  paymentOrderNo: string | null;
  paidDate: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  submittedAt: string | null;
  items: InvoiceItem[];
}

// ─── Eligible Assignments ─────────────────────────────────────────────────────

export interface EligibleAssignment {
  assignmentId: string;
  appraisalFeeId: string;
  appraisalNumber: string | null;
  customerName: string | null;
  productType: string | null;
  feePaymentType: string | null;
  feeBeforeVAT: number;
  vatRate: number;
  vatAmount: number;
  totalFeeAfterVAT: number;
  bankAbsorbAmount: number;
  payPartialAmount: number;
  remainingFee: number;
  submittedDate: string | null;
  lastPaymentDate: string | null;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateInvoicePayload {
  assignmentIds: string[];
  notes?: string;
}

export interface UpdateInvoiceDraftPayload {
  assignmentIds: string[];
  notes?: string;
}

export interface UpdateInvoiceNumberPayload {
  invoiceNumber: string;
}

export interface SubmitInvoicePayload {
  invoiceNumber: string;
}

export interface MarkPaidPayload {
  paymentOrderNo: string;
  paidDate: string;
}

export interface BulkMarkPaidPayload {
  invoiceIds: string[];
  paymentOrderNo: string;
  paidDate: string;
}
