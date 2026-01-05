// Document Checklist Types for Appraisal Module

export type DocumentSource = 'request' | 'appraiser';
export type DocumentStatus = 'uploaded' | 'pending' | 'missing';

// Appendix Document Types from Figma design
export const APPENDIX_DOCUMENT_TYPES = [
  'BRIEF_MAP',
  'DETAILED_MAP',
  'EARTH_MAP',
  'LAND_MAP',
  'CITY_PLAN',
  'STATUTORY_PLAN',
  'LAND_PLAN',
  'BUILDING_LAYOUT',
  'BLUEPRINT',
  'PHOTO_AND_PHOTO_SPOT',
  'REGISTRATION_INDEX',
  'RAWANG',
  'SUPPORTING_DOCUMENT',
] as const;

export type AppendixDocumentType = (typeof APPENDIX_DOCUMENT_TYPES)[number];

// Display names for document types
export const APPENDIX_DOCUMENT_TYPE_LABELS: Record<AppendixDocumentType, string> = {
  BRIEF_MAP: 'Brief Map',
  DETAILED_MAP: 'Detailed Map',
  EARTH_MAP: 'Earth Map',
  LAND_MAP: 'Land Map',
  CITY_PLAN: 'City Plan',
  STATUTORY_PLAN: 'Statutory Plan',
  LAND_PLAN: 'Land Plan',
  BUILDING_LAYOUT: 'Building Layout',
  BLUEPRINT: 'Blueprint',
  PHOTO_AND_PHOTO_SPOT: 'Photo and Photo spot',
  REGISTRATION_INDEX: 'Registration Index',
  RAWANG: 'Rawang',
  SUPPORTING_DOCUMENT: 'Supporting Document',
};

// Request document entity types
export type EntityType = 'title_chonot' | 'title_regis' | 'request';

export const ENTITY_KEY_PREFIXES: Record<EntityType, string> = {
  title_chonot: 'ฉ.',
  title_regis: 'Regis no ',
  request: '67',
};

// Document from request creation (read-only)
export interface RequestDocument {
  id: string;
  requestId: string;
  entityType: EntityType;
  entityKey: string;
  documentType: string;
  fileName: string | null;
  filePath: string | null;
  fileSize: number | null;
  mimeType: string | null;
  prefix: string | null;
  set: number;
  comment: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
  uploadedByName: string | null;
}

// Document uploaded by appraiser (editable)
export interface AppendixDocument {
  id: string;
  appraisalId: string;
  documentType: AppendixDocumentType;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  prefix: string | null;
  set: number;
  comment: string | null;
  layout: 1 | 2 | 3;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName: string | null;
}

// Grouped request documents by entity
export interface RequestDocumentGroup {
  entityType: EntityType;
  entityKey: string;
  displayKey: string;
  documents: RequestDocument[];
}

// Appendix section with documents grouped by type
export interface AppendixSection {
  documentType: AppendixDocumentType;
  label: string;
  layout: 1 | 2 | 3;
  documents: AppendixDocument[];
  isExpanded: boolean;
}

// API Request/Response Types

export interface GetRequestDocumentsParams {
  requestId: string;
}

export interface GetRequestDocumentsResponse {
  documents: RequestDocument[];
  groups: RequestDocumentGroup[];
}

export interface GetAppendixDocumentsParams {
  appraisalId: string;
  documentType?: AppendixDocumentType;
}

export interface GetAppendixDocumentsResponse {
  documents: AppendixDocument[];
  sections: AppendixSection[];
}

export interface CreateAppendixUploadSessionRequest {
  appraisalId: string;
}

export interface CreateAppendixUploadSessionResponse {
  sessionId: string;
  expiresAt: string;
}

export interface UploadAppendixDocumentRequest {
  sessionId: string;
  file: File;
  documentType: AppendixDocumentType;
  prefix?: string;
  set?: number;
  comment?: string;
  layout?: 1 | 2 | 3;
}

export interface UploadAppendixDocumentResponse {
  isSuccess: boolean;
  document: AppendixDocument;
}

export interface UpdateAppendixDocumentRequest {
  documentId: string;
  prefix?: string;
  set?: number;
  comment?: string;
  layout?: 1 | 2 | 3;
}

export interface UpdateAppendixDocumentResponse {
  isSuccess: boolean;
  document: AppendixDocument;
}

export interface DeleteAppendixDocumentResponse {
  isSuccess: boolean;
}

export interface UpdateAppendixLayoutRequest {
  appraisalId: string;
  documentType: AppendixDocumentType;
  layout: 1 | 2 | 3;
}

export interface UpdateAppendixLayoutResponse {
  isSuccess: boolean;
}

// Table column definitions
export interface DocumentTableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export const REQUEST_DOCUMENT_COLUMNS: DocumentTableColumn[] = [
  { key: 'documentType', label: 'Document type', width: '180px' },
  { key: 'fileName', label: 'File name', width: 'auto' },
  { key: 'uploadedAt', label: 'Date uploaded', width: '120px' },
  { key: 'prefix', label: 'Prefix', width: '80px', align: 'center' },
  { key: 'set', label: 'Set', width: '60px', align: 'center' },
  { key: 'comment', label: 'Comment', width: 'auto' },
];

export const APPENDIX_DOCUMENT_COLUMNS: DocumentTableColumn[] = [
  { key: 'documentType', label: 'Document Type', width: '180px' },
  { key: 'fileName', label: 'File Name', width: 'auto' },
  { key: 'uploadedAt', label: 'Upload Date', width: '120px' },
  { key: 'prefix', label: 'Prefix', width: '80px', align: 'center' },
  { key: 'set', label: 'Set', width: '60px', align: 'center' },
  { key: 'comment', label: 'Comment', width: 'auto' },
];

// Layout options for appendix
export const APPENDIX_LAYOUT_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
];

// Helper function to format entity key with prefix
export const formatEntityKey = (entityType: EntityType, key: string): string => {
  const prefix = ENTITY_KEY_PREFIXES[entityType];
  return `${prefix}${key}`;
};

// Helper function to get document type label
export const getAppendixDocumentLabel = (type: AppendixDocumentType): string => {
  return APPENDIX_DOCUMENT_TYPE_LABELS[type] || type;
};
