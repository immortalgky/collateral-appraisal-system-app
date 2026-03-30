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
  displayName?: string | null;
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

export const ENTITY_KEY_PREFIXES = {
  request: '67',
  title_chonot: 'ฉ.',
  title_regis: 'Regis no ',
} as const;

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
  isRequired: boolean;
}

export interface GetRequiredDocumentsParams {
  purpose?: string;
  collateralType?: string;
}

export interface GetRequiredDocumentsResponse {
  documents: RequiredDocumentConfig[];
}

// Parameter Document Checklist Types (from GET /document-checklist)
export interface ParameterDocumentChecklistResponse {
  applicationDocuments: ParameterChecklistItemDto[];
  propertyTypeGroups: PropertyTypeDocumentGroupDto[];
}

export interface ParameterChecklistItemDto {
  documentTypeId: string;
  code: string;
  name: string;
  category: string | null;
  isRequired: boolean;
  notes: string | null;
}

export interface PropertyTypeDocumentGroupDto {
  propertyTypeCode: string;
  propertyTypeName: string;
  documents: ParameterChecklistItemDto[];
}

// Document Checklist Types (from GET /requests/{id}/document-checklist)
export interface DocumentChecklistResponse {
  applicationDocuments: ApplicationDocumentChecklistItem[];
  titleDocuments: TitleDocumentChecklistGroup[];
  isComplete: boolean;
  missingRequiredCount: number;
}

export interface ApplicationDocumentChecklistItem {
  code: string;
  name: string;
  category: string | null;
  isRequired: boolean;
  isUploaded: boolean;
  notes: string | null;
}

export interface TitleDocumentChecklistGroup {
  titleId: string;
  collateralType: string | null;
  ownerName: string | null;
  documents: TitleDocumentChecklistItem[];
}

export interface TitleDocumentChecklistItem {
  code: string;
  name: string;
  category: string | null;
  isRequired: boolean;
  isUploaded: boolean;
  notes: string | null;
}
