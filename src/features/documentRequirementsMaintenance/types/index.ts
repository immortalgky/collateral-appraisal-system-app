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
  /** Default for a request that references a previous appraisal: true = carry the old file over. */
  carryForwardByDefault: boolean;
  /** True for the types the code reads by code (D036, D042, D043): the setting cannot be changed. */
  isCarryForwardLocked: boolean;
  createdOn?: string | null;
  updatedOn?: string | null;
}

/**
 * Why a locked type is locked, for the wording only (the server decides which are locked): D036 is
 * filled from the previous appraisal's summary report, whose sources D042 / D043 are not carried
 * directly. null = editable.
 */
export const carryForwardLockKind = (
  dt: Pick<DocumentTypeDto, 'code' | 'isCarryForwardLocked'>,
): 'target' | 'source' | null =>
  dt.isCarryForwardLocked ? (dt.code === 'D036' ? 'target' : 'source') : null;

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
  carryForwardByDefault: boolean;
}

export interface UpdateDocumentTypePayload {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  sortOrder: number;
  isActive: boolean;
  carryForwardByDefault: boolean;
}
