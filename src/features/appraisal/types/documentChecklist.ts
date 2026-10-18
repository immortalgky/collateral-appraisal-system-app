// Document Checklist Types for Appraisal Module
import { schemas } from '@shared/schemas/v1';
import type { z } from 'zod';

// ==================== V1 Schema Types ====================

// Request Documents
// `fileSizeBytes`/`mimeType` are hand-extended here — the backend now returns them but the
// generated `@shared/schemas/v1` bundle hasn't been regenerated yet. Both are optional so this
// compiles pre-regen; fold into the generated schema once it's refreshed. Values are structurally
// present on the actual nested `DocumentSectionDto.documents` items too (same runtime shape),
// so an explicit `DocumentItemDto` annotation at each `.documents.map(...)` call site is needed
// to pick up these fields (the nested type is inferred independently by z.infer and won't
// otherwise see this extension).
export type DocumentItemDto = z.infer<typeof schemas.DocumentItemDto> & {
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  /** 'FOLLOWUP' for a file an appraiser asked for; absent while the API does not return it. */
  source?: string | null;
};
export type DocumentSectionDto = z.infer<typeof schemas.DocumentSectionDto>;
export type GetRequestDocumentsByRequestIdResponse = z.infer<
  typeof schemas.GetRequestDocumentsByRequestIdResponse
>;

// Appendix Documents
// `uploadedAt`/`uploadedBy`/`uploadedByName` are hand-extended for the same pre-regen reason —
// see the DocumentItemDto note above. Same caveat applies to `AppraisalAppendixDto.documents`.
export type AppendixDocumentDto = z.infer<typeof schemas.AppendixDocumentResponse> & {
  uploadedAt?: string | null;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
};
export type AppraisalAppendixDto = z.infer<typeof schemas.AppraisalAppendixResponse>;
export type GetAppraisalAppendicesResponse = z.infer<typeof schemas.GetAppraisalAppendicesResponse>;

// Appendix Mutations
// Hand-defined rather than `z.infer<typeof schemas.AddAppendixDocumentRequest>` — the backend now
// accepts EITHER `{ galleryPhotoId, displaySequence }` (images, existing gallery path) OR
// `{ documentId, displaySequence }` (PDFs, new direct-document path bypassing the gallery), but the
// generated `v1.ts` bundle still models the old gallery-only shape (see the pre-regen note on
// `DocumentItemDto` above). A union — not an intersection — is needed here since exactly one of the
// two ids is valid; fold back into the generated schema once `v1.ts` is refreshed.
export type AddAppendixDocumentRequest =
  | { galleryPhotoId: string; displaySequence: number }
  | { documentId: string; displaySequence: number };
export type AddAppendixDocumentResult = z.infer<typeof schemas.AddAppendixDocumentResponse>;
export type RemoveAppendixDocumentResult = z.infer<typeof schemas.RemoveAppendixDocumentResponse>;
export type UpdateAppendixLayoutResult = z.infer<typeof schemas.UpdateAppendixLayoutResponse>;
