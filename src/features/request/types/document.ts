export interface UploadedDocument {
  id?: string | null;
  titleId?: string | null;
  documentId?: string | null;
  documentType: string | null;
  fileName: string | null;
  uploadedAt: string;
  prefix: string | null;
  set: number;
  documentDescription: string | null;
  filePath: string | null;
  createdWorkstation: string | null;
  isRequired: boolean;
  uploadedBy: string | null;
  uploadedByName: string | null;
  // Local-only fields (not sent to API)
  file?: File;
  isUploading?: boolean;
}

export interface DocumentChecklistItem {
  entityType: 'request' | 'title';
  entityKey: string;
  entityIndex: number;
  requiredDocuments: DocumentTypeInfo[];
}

export interface DocumentTypeInfo {
  type: string;
  displayName: string;
  isRequired: boolean;
}

export const DOCUMENT_TYPES = {
  D001: { type: 'D001', displayName: 'Title Deed', isRequired: false },
  D002: { type: 'D002', displayName: 'Registration Document', isRequired: false },
  D003: { type: 'D003', displayName: 'Invoice', isRequired: false },
  D004: { type: 'D004', displayName: 'Building Plan', isRequired: false },
  D005: { type: 'D005', displayName: 'ID Card', isRequired: false },
  D006: { type: 'D006', displayName: 'Certificate', isRequired: false },
} as const;

// Array of all document types for dropdown use (shared by request and title)
export const ALL_DOCUMENT_TYPES: DocumentTypeInfo[] = Object.values(DOCUMENT_TYPES);

export const ENTITY_KEY_PREFIXES = {
  request: '67',
  title_chonot: 'ฉ.',
  title_regis: 'Regis no ',
} as const;

export const getDocumentTypeInfo = (docType: string): DocumentTypeInfo | undefined => {
  return Object.values(DOCUMENT_TYPES).find(dt => dt.type === docType);
};

// Session and Upload API Types
export interface CreateUploadSessionResponse {
  sessionId: string;
  expiresAt: string;
}

export interface UploadDocumentResult {
  isSuccess: boolean;
  documentId: string;
  fileName: string;
  fileSize: number;
  storageUrl: string;
}

export interface UploadDocumentParams {
  uploadSessionId: string;
  file: File;
  documentType: string;
  documentCategory: string;
}

// Document Type to Category Mapping (max 10 chars)
export const DOCUMENT_TYPE_CATEGORY_MAP: Record<string, string> = {
  // Legal documents
  D001: 'legal', // Title Deed
  D002: 'legal', // Registration document
  D006: 'legal', // Certificate

  // Supporting documents
  D005: 'support', // ID Card
  D003: 'support', // Invoice

  // Request documents
  D004: 'request', // Building plan
};

export const getDocumentCategory = (documentType: string): string => {
  return DOCUMENT_TYPE_CATEGORY_MAP[documentType] || 'support';
};

// Required Documents Types
export interface RequiredDocumentConfig {
  documentType: string;
  displayName: string;
}

export interface GetRequiredDocumentsParams {
  purpose?: string;
  collateralType?: string;
}

export interface GetRequiredDocumentsResponse {
  documents: RequiredDocumentConfig[];
}
