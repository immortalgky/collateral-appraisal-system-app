import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetRequiredDocuments } from '../api';
import type { UploadedDocument } from '../types/document';

/**
 * Creates an empty placeholder document for a required document type
 */
const createRequiredPlaceholder = (documentType: string): UploadedDocument => ({
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
  isRequired: true,
  uploadedBy: null,
  uploadedByName: null,
});

/**
 * Hook for managing request-level required documents based on purpose.
 * Automatically initializes and refreshes required document placeholders.
 */
export const useRequestLevelRequiredDocuments = () => {
  const { setValue, watch } = useFormContext();
  const purpose = useWatch({ name: 'purpose' });
  const { data } = useGetRequiredDocuments({ purpose });
  const prevPurposeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!data?.documents) return;

    const currentDocs: UploadedDocument[] = watch('documents') || [];
    const requiredTypes = new Set(data.documents.map(d => d.documentType));

    // Keep docs that have files OR are required for the new purpose
    const docsToKeep = currentDocs.filter(
      doc => doc.fileName || requiredTypes.has(doc.documentType || ''),
    );

    // Find which required types are not yet in the docs
    const existingTypes = new Set(docsToKeep.map(d => d.documentType));
    const missingTypes = data.documents.filter(d => !existingTypes.has(d.documentType));

    // Create placeholders for missing required types
    const newPlaceholders = missingTypes.map(d => createRequiredPlaceholder(d.documentType));

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

    // Update isRequired flag: only the doc with the minimum set number is required
    const updatedDocs = docsToKeep.map(doc => {
      const docType = doc.documentType || '';
      const isRequiredType = requiredTypes.has(docType);
      const docSet = doc.set ?? 1;
      // Only mark as required if it's the minimum set for this type
      const isMinSet = minSetByType[docType] === docSet;
      return {
        ...doc,
        isRequired: isRequiredType && isMinSet,
      };
    });

    // Combine: existing docs (with updated flags) + new placeholders
    const finalDocs = [...updatedDocs, ...newPlaceholders];

    // Sort by: 1) isRequired (required first), 2) documentType, 3) set number
    finalDocs.sort((a, b) => {
      // Required documents first
      if (a.isRequired !== b.isRequired) {
        return a.isRequired ? -1 : 1;
      }
      // Then by documentType
      const typeA = a.documentType || '';
      const typeB = b.documentType || '';
      if (typeA !== typeB) {
        return typeA.localeCompare(typeB);
      }
      // Then by set number
      return (a.set ?? 1) - (b.set ?? 1);
    });

    // Only update if purpose changed or if we need to add/update docs
    if (
      prevPurposeRef.current !== purpose ||
      finalDocs.length !== currentDocs.length ||
      missingTypes.length > 0
    ) {
      setValue('documents', finalDocs, { shouldDirty: false });
    }

    prevPurposeRef.current = purpose;
  }, [data, purpose, setValue, watch]);
};

/**
 * Hook for managing title-level required documents based on collateral type.
 * Automatically initializes and refreshes required document placeholders for a specific title.
 */
export const useTitleLevelRequiredDocuments = (titleIndex: number) => {
  const { setValue, watch } = useFormContext();
  const collateralType = useWatch({ name: `titles.${titleIndex}.collateralType` });
  const { data } = useGetRequiredDocuments({ collateralType });
  const prevCollateralTypeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!data?.documents) return;

    const currentDocs: UploadedDocument[] =
      watch(`titles.${titleIndex}.documents`) || [];
    const requiredTypes = new Set(data.documents.map(d => d.documentType));

    // Keep docs that have files OR are required for the new collateral type
    const docsToKeep = currentDocs.filter(
      doc => doc.fileName || requiredTypes.has(doc.documentType || ''),
    );

    // Find which required types are not yet in the docs
    const existingTypes = new Set(docsToKeep.map(d => d.documentType));
    const missingTypes = data.documents.filter(d => !existingTypes.has(d.documentType));

    // Create placeholders for missing required types
    const newPlaceholders = missingTypes.map(d => createRequiredPlaceholder(d.documentType));

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

    // Update isRequired flag: only the doc with the minimum set number is required
    const updatedDocs = docsToKeep.map(doc => {
      const docType = doc.documentType || '';
      const isRequiredType = requiredTypes.has(docType);
      const docSet = doc.set ?? 1;
      // Only mark as required if it's the minimum set for this type
      const isMinSet = minSetByType[docType] === docSet;
      return {
        ...doc,
        isRequired: isRequiredType && isMinSet,
      };
    });

    // Combine: existing docs (with updated flags) + new placeholders
    const finalDocs = [...updatedDocs, ...newPlaceholders];

    // Sort by: 1) isRequired (required first), 2) documentType, 3) set number
    finalDocs.sort((a, b) => {
      // Required documents first
      if (a.isRequired !== b.isRequired) {
        return a.isRequired ? -1 : 1;
      }
      // Then by documentType
      const typeA = a.documentType || '';
      const typeB = b.documentType || '';
      if (typeA !== typeB) {
        return typeA.localeCompare(typeB);
      }
      // Then by set number
      return (a.set ?? 1) - (b.set ?? 1);
    });

    // Only update if collateral type changed or if we need to add/update docs
    if (
      prevCollateralTypeRef.current !== collateralType ||
      finalDocs.length !== currentDocs.length ||
      missingTypes.length > 0
    ) {
      setValue(`titles.${titleIndex}.documents`, finalDocs, { shouldDirty: false });
    }

    prevCollateralTypeRef.current = collateralType;
  }, [data, collateralType, titleIndex, setValue, watch]);
};
