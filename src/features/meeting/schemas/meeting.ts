/**
 * Zod schemas for meeting form inputs.
 *
 * These validate user input on the client. The corresponding wire types
 * (e.g. `CreateMeetingRequest`) live in `../api/types.ts`.
 */
import { z } from 'zod';

/** Create / update meeting metadata. */
export const meetingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  location: z
    .string()
    .trim()
    .max(200, 'Location must be 200 characters or fewer')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes must be 2000 characters or fewer')
    .optional()
    .or(z.literal('')),
});

export type MeetingFormValues = z.infer<typeof meetingFormSchema>;

/** Schedule a draft meeting. `scheduledAt` must be in the future. */
export const scheduleMeetingSchema = z.object({
  scheduledAt: z
    .string()
    .min(1, 'Scheduled date is required')
    .refine(value => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getTime() > Date.now();
    }, 'Scheduled date must be in the future'),
  location: z
    .string()
    .trim()
    .max(200, 'Location must be 200 characters or fewer')
    .optional()
    .or(z.literal('')),
});

export type ScheduleMeetingFormValues = z.infer<typeof scheduleMeetingSchema>;

/** Cancel a meeting (reason is optional but capped). */
export const cancelMeetingSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'Reason must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),
});

export type CancelMeetingFormValues = z.infer<typeof cancelMeetingSchema>;
