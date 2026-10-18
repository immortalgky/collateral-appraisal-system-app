import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetRequiredDocuments } from '../api';
import type { UploadedDocument } from '../types/document';

/**
 * Creates an empty placeholder document for a required document type
 */
const createPlaceholder = (
  documentType: string,
  displayName?: string,
  isRequired = false,
): UploadedDocument => ({
  id: null,
  titleId: null,
  documentId: null,
  documentType,
  fileName: null,
  uploadedAt: new Date().toISOString(),
  prefix: null,
  notes: null,
  filePath: null,
  createdWorkstation: null,
  isRequired,
  uploadedBy: null,
  uploadedByName: null,
  displayName: displayName ?? null,
});

/**
 * The rows of a section merged with a checklist: a slot for every checklist type that has none,
 * `isRequired` / `displayName` taken from the checklist, required first. `changed` is false when
 * nothing needed adding or updating.
 */
export const mergeChecklistSlots = (
  currentDocs: UploadedDocument[],
  checklist: { documentType: string; displayName: string; isRequired: boolean }[],
): { docs: UploadedDocument[]; changed: boolean } => {
  const checklistTypes = new Set(checklist.map(d => d.documentType));
  const requiredTypes = new Set(checklist.filter(d => d.isRequired).map(d => d.documentType));
  const displayNameMap = new Map(checklist.map(d => [d.documentType, d.displayName]));

  // Keep docs that have files OR are in the checklist
  const docsToKeep = currentDocs.filter(
    doc => doc.fileName || checklistTypes.has(doc.documentType || ''),
  );

  // Find which checklist types are not yet in the docs
  const existingTypes = new Set(docsToKeep.map(d => d.documentType));
  const missingTypes = checklist.filter(d => !existingTypes.has(d.documentType));

  // Check if any existing docs need displayName update
  const needsUpdate = docsToKeep.some(
    doc => doc.documentType && checklistTypes.has(doc.documentType) && !doc.displayName,
  );

  // Create placeholders for all missing checklist types (isRequired from API)
  const newPlaceholders = missingTypes.map(d =>
    createPlaceholder(d.documentType, d.displayName, d.isRequired),
  );

  // Update isRequired flag and displayName from API data
  const updatedDocs = docsToKeep.map(doc => {
    const docType = doc.documentType || '';
    return {
      ...doc,
      isRequired: requiredTypes.has(docType),
      displayName: doc.displayName || displayNameMap.get(docType) || null,
    };
  });

  // Combine: existing docs (with updated flags) + new placeholders, sorted by:
  // 1) isRequired (required first), 2) documentType
  const docs = [...updatedDocs, ...newPlaceholders].sort((a, b) => {
    if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
    return (a.documentType || '').localeCompare(b.documentType || '');
  });

  return { docs, changed: missingTypes.length > 0 || needsUpdate };
};

/**
 * Hook for managing request-level required documents based on purpose.
 * Automatically initializes and refreshes required document placeholders.
 */
export const useRequestLevelRequiredDocuments = () => {
  const { setValue } = useFormContext();
  const purpose = useWatch({ name: 'purpose' });
  const documents = useWatch({ name: 'documents' });
  const { data } = useGetRequiredDocuments({ purpose });
  const prevPurposeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!data?.documents) return;

    const { docs, changed } = mergeChecklistSlots(documents || [], data.documents);

    // No changes needed — all placeholders exist and metadata is set
    if (!changed && prevPurposeRef.current === purpose) return;

    setValue('documents', docs, { shouldDirty: false });
    prevPurposeRef.current = purpose;
  }, [data, purpose, documents, setValue]);
};

/**
 * Hook for managing title-level required documents based on collateral type.
 * Automatically initializes and refreshes required document placeholders for a specific title.
 */
export const useTitleLevelRequiredDocuments = (titleIndex: number) => {
  const { setValue } = useFormContext();
  const collateralType = useWatch({ name: `titles.${titleIndex}.collateralType` });
  const purpose = useWatch({ name: 'purpose' });
  const titleDocuments = useWatch({ name: `titles.${titleIndex}.documents` });
  // Pass purpose too so requirements scoped to BOTH collateral type AND purpose resolve.
  // When no collateral is selected, pass empty params so the query is disabled and the
  // title does NOT pick up the request-level (property = Any) documents.
  const { data } = useGetRequiredDocuments(collateralType ? { collateralType, purpose } : {});
  const prevScopeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!data?.documents) return;

    const { docs, changed } = mergeChecklistSlots(titleDocuments || [], data.documents);

    // No changes needed — all placeholders exist and metadata is set
    const scopeKey = `${collateralType ?? ''}|${purpose ?? ''}`;
    if (!changed && prevScopeRef.current === scopeKey) return;

    setValue(`titles.${titleIndex}.documents`, docs, { shouldDirty: false });
    prevScopeRef.current = scopeKey;
  }, [data, collateralType, purpose, titleDocuments, titleIndex, setValue]);
};
