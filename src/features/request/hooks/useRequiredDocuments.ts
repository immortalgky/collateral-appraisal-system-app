import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetRequiredDocuments } from '../api';
import type { UploadedDocument } from '../types/document';

/**
 * Creates an empty placeholder document for a required document type
 */
const createPlaceholder = (documentType: string, displayName?: string, isRequired = false): UploadedDocument => ({
  id: null,
  titleId: null,
  documentId: null,
  documentType,
  fileName: null,
  uploadedAt: new Date().toISOString(),
  prefix: null,
  set: 1,
  documentDescription: null,
  filePath: null,
  createdWorkstation: null,
  isRequired,
  uploadedBy: null,
  uploadedByName: null,
  displayName: displayName ?? null,
});

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

    const currentDocs: UploadedDocument[] = documents || [];
    const checklistTypes = new Set(data.documents.map(d => d.documentType));
    const requiredTypes = new Set(data.documents.filter(d => d.isRequired).map(d => d.documentType));
    const displayNameMap = new Map(data.documents.map(d => [d.documentType, d.displayName]));
    const isRequiredMap = new Map(data.documents.map(d => [d.documentType, d.isRequired]));

    // Keep docs that have files OR are in the checklist
    const docsToKeep = currentDocs.filter(
      doc => doc.fileName || checklistTypes.has(doc.documentType || ''),
    );

    // Find which checklist types are not yet in the docs
    const existingTypes = new Set(docsToKeep.map(d => d.documentType));
    const missingTypes = data.documents.filter(d => !existingTypes.has(d.documentType));

    // Check if any existing docs need displayName update
    const needsUpdate = docsToKeep.some(
      doc => doc.documentType && checklistTypes.has(doc.documentType) && !doc.displayName,
    );

    // No changes needed — all placeholders exist and metadata is set
    if (missingTypes.length === 0 && !needsUpdate && prevPurposeRef.current === purpose) return;

    // Create placeholders for all missing checklist types (isRequired from API)
    const newPlaceholders = missingTypes.map(d => createPlaceholder(d.documentType, d.displayName, d.isRequired));

    // Find the minimum set number for each required document type
    const minSetByType: Record<string, number> = {};
    docsToKeep.forEach(doc => {
      if (doc.documentType && requiredTypes.has(doc.documentType)) {
        const currentMin = minSetByType[doc.documentType];
        const docSet = doc.set ?? 1;
        if (currentMin === undefined || docSet < currentMin) {
          minSetByType[doc.documentType] = docSet;
        }
      }
    });

    // Update isRequired flag and displayName from API data
    const updatedDocs = docsToKeep.map(doc => {
      const docType = doc.documentType || '';
      const isRequiredType = requiredTypes.has(docType);
      const docSet = doc.set ?? 1;
      const isMinSet = minSetByType[docType] === docSet;
      return {
        ...doc,
        isRequired: isRequiredType && isMinSet,
        displayName: doc.displayName || displayNameMap.get(docType) || null,
      };
    });

    // Combine: existing docs (with updated flags) + new placeholders
    const finalDocs = [...updatedDocs, ...newPlaceholders];

    // Sort by: 1) isRequired (required first), 2) documentType, 3) set number
    finalDocs.sort((a, b) => {
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
      const typeA = a.documentType || '';
      const typeB = b.documentType || '';
      if (typeA !== typeB) return typeA.localeCompare(typeB);
      return (a.set ?? 1) - (b.set ?? 1);
    });

    setValue('documents', finalDocs, { shouldDirty: false });
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
  const titleDocuments = useWatch({ name: `titles.${titleIndex}.documents` });
  const { data } = useGetRequiredDocuments({ collateralType });
  const prevCollateralTypeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!data?.documents) return;

    const currentDocs: UploadedDocument[] = titleDocuments || [];
    const checklistTypes = new Set(data.documents.map(d => d.documentType));
    const requiredTypes = new Set(data.documents.filter(d => d.isRequired).map(d => d.documentType));
    const displayNameMap = new Map(data.documents.map(d => [d.documentType, d.displayName]));
    const isRequiredMap = new Map(data.documents.map(d => [d.documentType, d.isRequired]));

    // Keep docs that have files OR are in the checklist
    const docsToKeep = currentDocs.filter(
      doc => doc.fileName || checklistTypes.has(doc.documentType || ''),
    );

    // Find which checklist types are not yet in the docs
    const existingTypes = new Set(docsToKeep.map(d => d.documentType));
    const missingTypes = data.documents.filter(d => !existingTypes.has(d.documentType));

    // Check if any existing docs need displayName update
    const needsUpdate = docsToKeep.some(
      doc => doc.documentType && checklistTypes.has(doc.documentType) && !doc.displayName,
    );

    // No changes needed — all placeholders exist and metadata is set
    if (missingTypes.length === 0 && !needsUpdate && prevCollateralTypeRef.current === collateralType) return;

    // Create placeholders for all missing checklist types (isRequired from API)
    const newPlaceholders = missingTypes.map(d => createPlaceholder(d.documentType, d.displayName, d.isRequired));

    // Find the minimum set number for each required document type
    const minSetByType: Record<string, number> = {};
    docsToKeep.forEach(doc => {
      if (doc.documentType && requiredTypes.has(doc.documentType)) {
        const currentMin = minSetByType[doc.documentType];
        const docSet = doc.set ?? 1;
        if (currentMin === undefined || docSet < currentMin) {
          minSetByType[doc.documentType] = docSet;
        }
      }
    });

    // Update isRequired flag and displayName from API data
    const updatedDocs = docsToKeep.map(doc => {
      const docType = doc.documentType || '';
      const isRequiredType = requiredTypes.has(docType);
      const docSet = doc.set ?? 1;
      const isMinSet = minSetByType[docType] === docSet;
      return {
        ...doc,
        isRequired: isRequiredType && isMinSet,
        displayName: doc.displayName || displayNameMap.get(docType) || null,
      };
    });

    // Combine: existing docs (with updated flags) + new placeholders
    const finalDocs = [...updatedDocs, ...newPlaceholders];

    // Sort by: 1) isRequired (required first), 2) documentType, 3) set number
    finalDocs.sort((a, b) => {
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
      const typeA = a.documentType || '';
      const typeB = b.documentType || '';
      if (typeA !== typeB) return typeA.localeCompare(typeB);
      return (a.set ?? 1) - (b.set ?? 1);
    });

    setValue(`titles.${titleIndex}.documents`, finalDocs, { shouldDirty: false });
    prevCollateralTypeRef.current = collateralType;
  }, [data, collateralType, titleDocuments, titleIndex, setValue]);
};
