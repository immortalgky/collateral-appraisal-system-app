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
  TITLE_DEED: { type: 'TITLE_DEED', displayName: 'Title Deed', isRequired: true },
  REGISTRATION: { type: 'REGISTRATION', displayName: 'Registration document', isRequired: false },
  INVOICE: { type: 'INVOICE', displayName: 'Invoice', isRequired: false },
  BUILDING_PLAN: { type: 'BUILDING_PLAN', displayName: 'Building plan', isRequired: true },
  ID_CARD: { type: 'ID_CARD', displayName: 'ID Card', isRequired: true },
  CERTIFICATE: { type: 'CERTIFICATE', displayName: 'Certificate', isRequired: false },
} as const;

export const MOCK_REQUEST_DOCUMENTS: DocumentTypeInfo[] = [
  DOCUMENT_TYPES.ID_CARD,
  DOCUMENT_TYPES.INVOICE,
];

export const MOCK_TITLE_DOCUMENTS: DocumentTypeInfo[] = [
  DOCUMENT_TYPES.TITLE_DEED,
  DOCUMENT_TYPES.REGISTRATION,
  DOCUMENT_TYPES.BUILDING_PLAN,
];

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
  TITLE_DEED: 'legal',
  REGISTRATION: 'legal',
  CERTIFICATE: 'legal',

  // Supporting documents
  ID_CARD: 'support',
  INVOICE: 'support',

  // Request documents
  BUILDING_PLAN: 'request',
};

export const getDocumentCategory = (documentType: string): string => {
  return DOCUMENT_TYPE_CATEGORY_MAP[documentType] || 'support';
};
