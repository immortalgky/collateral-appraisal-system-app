export type InvoiceStatus = 'Draft' | 'Submitted' | 'Approved';

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  itemCount: number;
  periodStartDate: string | null;
  periodEndDate: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  paymentDate: string | null;
  companyId: string;
  companyName: string | null;
  createdAt: string;
}

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
  receivedDate: string | null;
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  companyName: string | null;
  companyId: string;
  notes: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  paymentDate: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  submittedAt: string | null;
  items: InvoiceItem[];
}

export interface EligibleAssignment {
  assignmentId: string;
  appraisalFeeId: string;
  appraisalNumber: string | null;
  customerName: string | null;
  productType: string | null;
  feeBeforeVAT: number;
  vatRate: number;
  vatAmount: number;
  totalFeeAfterVAT: number;
  bankAbsorbAmount: number;
  receivedDate: string | null;
}

export interface PaginatedInvoices {
  items: InvoiceListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateInvoicePayload {
  assignmentIds: string[];
  notes?: string;
}

export interface ApproveInvoicePayload {
  paymentReference?: string;
  paymentMethod?: string;
  paymentDate?: string;
}
