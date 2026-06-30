// Types for the Document Requirements maintenance feature.
// Mirrors the backend Parameter module DTOs (camelCase JSON).

export interface DocumentRequirementDto {
  id: string;
  documentTypeId: string;
  documentTypeCode: string;
  documentTypeName: string;
  documentTypeCategory?: string | null;
  propertyTypeCode?: string | null;
  propertyTypeName?: string | null;
  purposeCode?: string | null;
  isRequired: boolean;
  isActive: boolean;
  notes?: string | null;
  createdOn?: string | null;
  updatedOn?: string | null;
}

export interface DocumentTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdOn?: string | null;
  updatedOn?: string | null;
}

export type RequirementScope = 'application' | 'collateral' | 'purpose';

export interface CreateDocumentRequirementPayload {
  documentTypeId: string;
  propertyTypeCode?: string | null;
  purposeCode?: string | null;
  isRequired: boolean;
  notes?: string | null;
}

export interface UpdateDocumentRequirementPayload {
  id: string;
  isRequired: boolean;
  isActive: boolean;
  notes?: string | null;
}

export interface CreateDocumentTypePayload {
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  sortOrder: number;
}

export interface UpdateDocumentTypePayload {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  sortOrder: number;
  isActive: boolean;
}
