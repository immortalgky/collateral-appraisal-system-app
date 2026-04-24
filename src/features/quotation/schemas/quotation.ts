import { z } from 'zod';

// ─── Status ───────────────────────────────────────────────────────────────────

export const QuotationStatusSchema = z.enum([
  'Draft',
  'Sent',
  'UnderAdminReview',
  'PendingRmSelection',
  'WinnerTentative',
  'Negotiating',
  'Finalized',
  'Cancelled',
]);

export const CompanyQuotationStatusSchema = z.enum([
  'Draft',
  'PendingCheckerReview',
  'Submitted',
  'UnderReview',
  'Tentative',
  'Negotiating',
  'Accepted',
  'Rejected',
  'Withdrawn',
  'Declined',
]);

// ─── Negotiation ──────────────────────────────────────────────────────────────

export const QuotationNegotiationSchema = z.object({
  id: z.string().uuid(),
  companyQuotationId: z.string().uuid(),
  roundNumber: z.number().int(),
  proposedPrice: z.number(),
  message: z.string().nullable().optional(),
  verb: z.string().nullable().optional(), // 'Accept' | 'Counter' | 'Reject' — populated after company responds
  counterPrice: z.number().nullable().optional(),
  responseMessage: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type QuotationNegotiationDto = z.infer<typeof QuotationNegotiationSchema>;

// ─── Company Quotation Item DTO ───────────────────────────────────────────────

export const CompanyQuotationItemDtoSchema = z.object({
  id: z.string().uuid(),
  companyQuotationId: z.string().uuid(),
  quotationRequestItemId: z.string().uuid(),
  appraisalId: z.string().uuid(),
  itemNumber: z.number().int(),
  quotedPrice: z.number(),
  feeAmount: z.number(),
  discount: z.number(),
  negotiatedDiscount: z.number().nullable(),
  vatPercent: z.number(),
  estimatedDays: z.number().int(),
  proposedCompletionDate: z.string().nullable().optional(),
  itemNotes: z.string().nullable().optional(),
});

export type CompanyQuotationItemDto = z.infer<typeof CompanyQuotationItemDtoSchema>;

// ─── Company Quotation ────────────────────────────────────────────────────────

export const CompanyQuotationSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  companyName: z.string(),
  quotationNumber: z.string().nullable().optional(),
  status: CompanyQuotationStatusSchema,
  isShortlisted: z.boolean(),
  totalQuotedPrice: z.number().nullable().optional(),
  originalQuotedPrice: z.number().nullable().optional(),
  currentNegotiatedPrice: z.number().nullable().optional(),
  negotiationRounds: z.number().int(),
  estimatedDays: z.number().int().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  items: z.array(CompanyQuotationItemDtoSchema).optional().default([]),
  negotiations: z.array(QuotationNegotiationSchema).optional().default([]),
});

export type CompanyQuotationDto = z.infer<typeof CompanyQuotationSchema>;

// ─── Appraisal Summary (per appraisal inside a quotation) ───────────────────

export const AppraisalSummarySchema = z.object({
  /** The appraisal's primary ID — field name matches backend QuotationAppraisalResult. */
  appraisalId: z.string().uuid(),
  appraisalNumber: z.string().nullable().optional(),
  propertyType: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  loanType: z.string().nullable().optional(),
  addedAt: z.string().datetime({ offset: true }).optional(),
  addedBy: z.string().nullable().optional(),
  /** v7: requestId from which documents are fetched for the share-docs picker. */
  requestId: z.string().uuid().nullable().optional(),
});

export type AppraisalSummaryDto = z.infer<typeof AppraisalSummarySchema>;

// ─── Draft Summary for the entry-modal picker ────────────────────────────────

export const QuotationDraftSummarySchema = z.object({
  id: z.string().uuid(),
  quotationNumber: z.string(),
  createdOn: z.string(),
  dueDate: z.string().nullable().optional(),
  bankingSegment: z.string().nullable().optional(),
  appraisalCount: z.number().int(),
  appraisalPreview: z.array(z.string()).optional().default([]), // first 3–5 appraisal numbers
  invitedCompanyCount: z.number().int(),
});

export type QuotationDraftSummaryDto = z.infer<typeof QuotationDraftSummarySchema>;

// ─── Shared document (v7) ────────────────────────────────────────────────────

/** v7: 'AppraisalLevel' renamed to 'RequestLevel'. 'TitleLevel' unchanged. */
export const SharedDocumentLevelSchema = z.enum(['RequestLevel', 'TitleLevel']);
export type SharedDocumentLevel = z.infer<typeof SharedDocumentLevelSchema>;

/** Entry inside quotationDetail.sharedDocuments — enriched in v7. */
export const SharedDocumentEntrySchema = z.object({
  appraisalId: z.string().uuid(),
  documentId: z.string().uuid(),
  level: SharedDocumentLevelSchema,
  fileName: z.string().nullable().optional(),
  fileType: z.string().nullable().optional(),
  documentTypeName: z.string().nullable().optional(),
});
export type SharedDocumentEntryDto = z.infer<typeof SharedDocumentEntrySchema>;

/** Body item for PUT /quotations/{id}/shared-documents */
export const SharedDocumentSelectionSchema = z.object({
  appraisalId: z.string().uuid(),
  documentId: z.string().uuid(),
  level: SharedDocumentLevelSchema,
});
export type SharedDocumentSelectionDto = z.infer<typeof SharedDocumentSelectionSchema>;

// ─── Quotation Request Detail ─────────────────────────────────────────────────

export const QuotationRequestDetailSchema = z.object({
  id: z.string().uuid(),
  quotationNumber: z.string(),
  requestDate: z.string(),
  dueDate: z.string(),
  status: QuotationStatusSchema,
  requestedBy: z.string().uuid(),
  requestedByName: z.string(),
  description: z.string().nullable().optional(),
  specialRequirements: z.string().nullable().optional(),
  totalAppraisals: z.number().int(),
  totalCompaniesInvited: z.number().int(),
  totalQuotationsReceived: z.number().int(),
  // Extended IBG fields — v2: appraisals is now an array; appraisalId kept for backwards compat
  appraisals: z.array(AppraisalSummarySchema).optional().default([]),
  appraisalId: z.string().uuid().nullable().optional(),
  requestId: z.string().uuid().nullable().optional(),
  workflowInstanceId: z.string().uuid().nullable().optional(),
  taskExecutionId: z.string().uuid().nullable().optional(),
  bankingSegment: z.string().nullable().optional(),
  rmUserId: z.string().uuid().nullable().optional(),
  submissionsClosedAt: z.string().nullable().optional(),
  shortlistSentToRmAt: z.string().nullable().optional(),
  shortlistSentByAdminId: z.string().uuid().nullable().optional(),
  totalShortlisted: z.number().int().nullable().optional(),
  tentativeWinnerQuotationId: z.string().uuid().nullable().optional(),
  tentativelySelectedAt: z.string().nullable().optional(),
  tentativelySelectedBy: z.string().nullable().optional(),
  tentativelySelectedByRole: z.string().nullable().optional(),
  // Legacy selection fields (pre-IBG flow)
  selectedCompanyId: z.string().uuid().nullable().optional(),
  selectedQuotationId: z.string().uuid().nullable().optional(),
  selectedAt: z.string().nullable().optional(),
  selectionReason: z.string().nullable().optional(),
  // Company submissions (populated when status >= UnderAdminReview)
  companyQuotations: z.array(CompanyQuotationSchema).optional().default([]),
  // v4: shared documents (visible to all roles; ExtCompany filtered to these in UI)
  sharedDocuments: z.array(SharedDocumentEntrySchema).optional().default([]),
  // v4: RM negotiation recommendation (set when RM picks winner)
  rmRequestsNegotiation: z.boolean().optional(),
  rmNegotiationNote: z.string().nullable().optional(),
});

export type QuotationRequestDetailDto = z.infer<typeof QuotationRequestDetailSchema>;

// ─── Form schemas ─────────────────────────────────────────────────────────────

export const openNegotiationFormSchema = z.object({
  proposedPrice: z.number({ required_error: 'Proposed price is required' }).positive('Must be positive'),
  message: z.string().min(1, 'Message is required'),
});

export type OpenNegotiationFormValues = z.infer<typeof openNegotiationFormSchema>;

export const respondNegotiationFormSchema = z.object({
  verb: z.enum(['Accept', 'Counter', 'Reject']),
  counterPrice: z.number().positive('Must be positive').nullable().optional(),
  message: z.string().nullable().optional(),
});

export type RespondNegotiationFormValues = z.infer<typeof respondNegotiationFormSchema>;

export const finalizeFormSchema = z.object({
  finalPrice: z.number({ required_error: 'Final price is required' }).positive('Must be positive'),
  reason: z.string().nullable().optional(),
});

export type FinalizeFormValues = z.infer<typeof finalizeFormSchema>;

export const rejectTentativeFormSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export type RejectTentativeFormValues = z.infer<typeof rejectTentativeFormSchema>;

export const pickWinnerFormSchema = z.object({
  reason: z.string().min(1, 'Please provide a reason for your selection'),
  requestNegotiation: z.boolean().optional().default(false),
  negotiationNote: z.string().max(500, 'Note must be 500 characters or fewer').nullable().optional(),
});

export type PickWinnerFormValues = z.infer<typeof pickWinnerFormSchema>;

/** Per-appraisal line item within the submit form. */
export const submitQuotationItemSchema = z.object({
  appraisalId: z.string().uuid(),
  /**
   * Legacy total price field. In the new Maker/Checker flow this is derived from
   * feeAmount in the submit handler and is not rendered as an input. Keep optional
   * so the fee-breakdown path does not require it at validation time.
   */
  quotedPrice: z.number().positive('Must be positive').optional(),
  estimatedDays: z
    .number({ required_error: 'Days is required' })
    .int('Must be a whole number')
    .positive('Must be positive'),
  // Fee-breakdown fields — used in the Maker/Checker path.
  feeAmount: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  negotiatedDiscount: z.number().nonnegative().nullable().optional(),
  vatPercent: z.number().nonnegative().optional(),
}).superRefine((item, ctx) => {
  if (item.feeAmount === undefined) return;
  const discount = item.discount ?? 0;
  const negotiated = item.negotiatedDiscount ?? 0;
  if (discount + negotiated > item.feeAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['negotiatedDiscount'],
      message: 'Discount + Negotiated Discount cannot exceed Fee Amount',
    });
  }
});

export type SubmitQuotationItemValues = z.infer<typeof submitQuotationItemSchema>;

export const submitQuotationFormSchema = z.object({
  quotationNumber: z.string().min(1, 'Quotation number is required'),
  /** Per-appraisal line items — at least one required. */
  items: z
    .array(submitQuotationItemSchema)
    .min(1, 'At least one appraisal item is required'),
  validUntil: z.string().nullable().optional(),
  proposedStartDate: z.string().nullable().optional(),
  proposedCompletionDate: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  termsAndConditions: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email('Invalid email').nullable().optional(),
  contactPhone: z.string().nullable().optional(),
});

export type SubmitQuotationFormValues = z.infer<typeof submitQuotationFormSchema>;

// ─── Save Draft (Maker/Checker) ───────────────────────────────────────────────

/** Per-appraisal line item for the draft save endpoint — fee breakdown is required. */
export const SaveDraftQuotationItemSchema = z.object({
  quotationRequestItemId: z.string().uuid(),
  appraisalId: z.string().uuid(),
  itemNumber: z.number().int(),
  feeAmount: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  negotiatedDiscount: z.number().nonnegative().nullable(),
  vatPercent: z.number().nonnegative(),
  estimatedDays: z.number().int(),
}).superRefine((item, ctx) => {
  const discount = item.discount ?? 0;
  const negotiated = item.negotiatedDiscount ?? 0;
  if (discount + negotiated > item.feeAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['negotiatedDiscount'],
      message: 'Discount + Negotiated Discount cannot exceed Fee Amount',
    });
  }
});

export type SaveDraftQuotationItemInput = z.infer<typeof SaveDraftQuotationItemSchema>;

export const SaveDraftQuotationSchema = z.object({
  quotationRequestId: z.string().uuid(),
  companyId: z.string().uuid(),
  quotationNumber: z.string(),
  estimatedDays: z.number().int(),
  items: z.array(SaveDraftQuotationItemSchema),
  validUntil: z.string().nullable().optional(),
  proposedStartDate: z.string().nullable().optional(),
  proposedCompletionDate: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  termsAndConditions: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
});

export type SaveDraftQuotationInput = z.infer<typeof SaveDraftQuotationSchema>;

// ─── Submit Draft to Checker ──────────────────────────────────────────────────

export const SubmitDraftToCheckerSchema = z.object({
  quotationRequestId: z.string().uuid(),
  companyId: z.string().uuid(),
});

export type SubmitDraftToCheckerInput = z.infer<typeof SubmitDraftToCheckerSchema>;

// ─── Quotation Activity Log ───────────────────────────────────────────────────

export const QuotationActivityLogRowSchema = z.object({
  id: z.string().uuid(),
  quotationRequestId: z.string().uuid(),
  companyQuotationId: z.string().uuid().nullable(),
  companyId: z.string().uuid().nullable(),
  activityName: z.string(),
  actionAt: z.string(), // ISO datetime string — components parse as needed
  actionBy: z.string(),
  actionByRole: z.string().nullable(),
  remark: z.string().nullable(),
});

export type QuotationActivityLogRow = z.infer<typeof QuotationActivityLogRowSchema>;
