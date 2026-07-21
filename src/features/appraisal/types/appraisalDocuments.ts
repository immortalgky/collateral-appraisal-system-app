// Valuation Document Checklist types (Appraisal Documents feature).
//
// Backend: Modules/Appraisal/Appraisal/Application/Features/Appraisals/
//   GetAppraisalDocuments / AddAppraisalDocument / RemoveAppraisalDocument / UpdateAppraisalDocumentNotes
// Hand-authored here — this contract isn't part of the generated `@shared/schemas/v1`
// bundle yet (that needs a live backend run to regenerate). Fold these in later.
import { z } from 'zod';

// ==================== GET /appraisals/{appraisalId}/documents ====================

export const AppraisalDocumentFileSchema = z.object({
  id: z.string(),
  documentId: z.string().nullish(),
  fileName: z.string().nullish(),
  mimeType: z.string().nullish(),
  fileSizeBytes: z.number().nullish(),
  notes: z.string().nullish(),
  sortOrder: z.number(),
  uploadedAt: z.string().nullish(),
  /** A bank user code (e.g. P5229), not a display name — fallback when uploadedByName is absent
   * (e.g. rows attached before uploadedByName was wired on the FE). */
  uploadedBy: z.string().nullish(),
  uploadedByName: z.string().nullish(),
});

export const AppraisalDocumentTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
  nameTh: z.string().nullish(),
  /** e.g. 'VAL_DOC' (user-uploaded) or 'VAL_REPORT' (system-generated) — drives the
   * Generate-report button in ValuationDocumentChecklist.tsx. */
  category: z.string().nullish(),
  totalFiles: z.number(),
  files: z.array(AppraisalDocumentFileSchema),
});

export const GetAppraisalDocumentsResponseSchema = z.object({
  totalTypes: z.number(),
  typesWithFiles: z.number(),
  types: z.array(AppraisalDocumentTypeSchema),
});

export type AppraisalDocumentFile = z.infer<typeof AppraisalDocumentFileSchema>;
export type AppraisalDocumentType = z.infer<typeof AppraisalDocumentTypeSchema>;
export type GetAppraisalDocumentsResponse = z.infer<typeof GetAppraisalDocumentsResponseSchema>;

// ==================== POST /appraisals/{appraisalId}/documents ====================

export interface AddAppraisalDocumentRequest {
  documentTypeCode: string;
  documentId: string;
  fileName: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  notes?: string | null;
  sortOrder?: number | null;
  uploadedByName?: string | null;
}

export const AddAppraisalDocumentResponseSchema = z.object({
  id: z.string(),
});

export type AddAppraisalDocumentResponse = z.infer<typeof AddAppraisalDocumentResponseSchema>;

// ==================== DELETE /appraisals/{appraisalId}/documents/{id} ====================

export const RemoveAppraisalDocumentResponseSchema = z.object({
  success: z.boolean(),
});

export type RemoveAppraisalDocumentResponse = z.infer<typeof RemoveAppraisalDocumentResponseSchema>;

// ==================== PUT /appraisals/{appraisalId}/documents/{id} ====================

export interface UpdateAppraisalDocumentNotesRequest {
  notes?: string | null;
}

export const UpdateAppraisalDocumentNotesResponseSchema = z.object({
  id: z.string(),
  notes: z.string().nullish(),
});

export type UpdateAppraisalDocumentNotesResponse = z.infer<
  typeof UpdateAppraisalDocumentNotesResponseSchema
>;
