/**
 * Zod schemas for meeting form inputs.
 *
 * These validate user input on the client. The corresponding wire types
 * (e.g. `CreateMeetingRequest`) live in `../api/types.ts`.
 */
import { z } from 'zod';

// ==================== Shared sub-schemas ====================

const POSITION_VALUES = [
  'Chairman',
  'Director',
  'Secretary',
  'UW',
  'Risk',
  'Appraisal',
  'Credit',
  'Member',
] as const;

const titleField = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be 200 characters or fewer');

const locationField = z
  .string()
  .trim()
  .max(200, 'Location must be 200 characters or fewer')
  .optional()
  .or(z.literal(''));

const notesField = z
  .string()
  .trim()
  .max(2000, 'Notes must be 2000 characters or fewer')
  .optional()
  .or(z.literal(''));

const startAtField = z.string().datetime({ offset: true, message: 'Start date is required' });
const endAtField = z.string().datetime({ offset: true, message: 'End date is required' });

// ==================== Meeting form schemas (split create vs update) ====================

/**
 * Used by the Create Meeting dialog.
 * Members are added manually after creation — no committeeId required.
 */
export const createMeetingFormSchema = z
  .object({
    title: titleField,
    location: locationField,
    notes: notesField,
    startAt: startAtField,
    endAt: endAtField,
  })
  .refine(data => new Date(data.endAt) > new Date(data.startAt), {
    message: 'End must be after start',
    path: ['endAt'],
  });

export type CreateMeetingFormValues = z.infer<typeof createMeetingFormSchema>;

/**
 * Used by the Edit/Update Meeting dialog.
 * `committeeId` is omitted — the committee snapshot is fixed at creation.
 */
export const updateMeetingFormSchema = z
  .object({
    title: titleField,
    location: locationField,
    notes: notesField,
    startAt: startAtField,
    endAt: endAtField,
  })
  .refine(data => new Date(data.endAt) > new Date(data.startAt), {
    message: 'End must be after start',
    path: ['endAt'],
  });

export type UpdateMeetingFormValues = z.infer<typeof updateMeetingFormSchema>;

// ==================== Bulk create ====================

export const bulkCreateMeetingsSchema = z.object({
  dates: z
    .array(z.string().datetime({ offset: true }))
    .min(1, 'Pick at least one date'),
  defaultTitle: z.string().max(200).optional(),
});

export type BulkCreateMeetingsFormValues = z.infer<typeof bulkCreateMeetingsSchema>;

// ==================== Cancel ====================

/** Cancel a meeting — reason is now required. */
export const cancelMeetingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Reason is required')
    .max(500, 'Reason must be 500 characters or fewer'),
});

export type CancelMeetingFormValues = z.infer<typeof cancelMeetingSchema>;

// ==================== Secretary actions ====================

export const routeBackSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Reason is required')
    .max(500, 'Reason must be 500 characters or fewer'),
});

export type RouteBackFormValues = z.infer<typeof routeBackSchema>;

// ==================== Members ====================

export const memberFormSchema = z.object({
  userId: z.string().min(1).max(100),
  memberName: z.string().min(1).max(200),
  position: z.enum(POSITION_VALUES),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;

export const updateMemberPositionSchema = z.object({
  position: z.enum(POSITION_VALUES),
});

export type UpdateMemberPositionFormValues = z.infer<typeof updateMemberPositionSchema>;

// ==================== Agenda ====================

export const updateAgendaSchema = z.object({
  fromText: z.string().max(200).nullable().optional(),
  toText: z.string().max(200).nullable().optional(),
  agendaCertifyMinutes: z.string().max(2000).nullable().optional(),
  agendaChairmanInformed: z.string().max(2000).nullable().optional(),
  agendaOthers: z.string().max(2000).nullable().optional(),
});

export type UpdateAgendaFormValues = z.infer<typeof updateAgendaSchema>;
