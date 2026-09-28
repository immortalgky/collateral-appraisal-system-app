export type QuotationDocumentType = 'Summary' | 'Upload';
export type QuotationDocumentSource = 'Generated' | 'Uploaded';

export interface QuotationDocumentDto {
  id: string;
  documentId: string;
  fileName: string;
  documentType: QuotationDocumentType;
  source: QuotationDocumentSource;
  // API serializes with WhenWritingNull — these may be absent. Use nullish.
  createdBy?: string | null;
  createdAt?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
}

export interface GenerateQuotationDocumentRequest {
  documentType: 'Summary';
}

export interface LinkQuotationDocumentRequest {
  documentId: string;
  fileName: string;
}
