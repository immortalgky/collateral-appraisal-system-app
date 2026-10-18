import { documentTypeLabel } from '@/features/request/api/documentTypes';
import type { AppraisalDocumentType } from '../types/appraisalDocuments';

/** Category of user-uploaded valuation documents (as opposed to system-generated VAL_REPORT). */
export const VAL_DOC_CATEGORY = 'VAL_DOC';

/** File types every valuation-document attach accepts — `accept` for the inputs that feed isAllowedValuationDocumentFile. */
export const VALUATION_DOCUMENT_ACCEPT = '.jpg,.jpeg,.png,.pdf';

export const isAllowedValuationDocumentFile = (file: File) => /\.(jpe?g|png|pdf)$/i.test(file.name);

/** One locale-appropriate document type name, no code alongside it (the shared helper: a blank Thai name falls back to English). */
export const documentTypeName = (type: AppraisalDocumentType, language: string) =>
  documentTypeLabel(type, language);
