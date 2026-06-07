import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import axios from '@shared/api/axiosInstance';

// The API serializes with DefaultIgnoreCondition.WhenWritingNull, so null fields are OMITTED
// from the JSON entirely. Use .nullish() (not .nullable()) for every optional field so a
// missing key parses as undefined instead of throwing. Only eventType/title/occurredAt are
// always present.
export const appointmentHistoryEventSchema = z.object({
  eventType: z.string(),
  title: z.string(),
  oldDate: z.string().nullish(),
  newDate: z.string().nullish(),
  feeCode: z.string().nullish(),
  feeDescription: z.string().nullish(),
  amount: z.number().nullish(),
  // Lenient: an unexpected status from the backend must not hard-fail the whole timeline parse.
  // Unknown values fall back to null (rendered as a neutral pill) instead of throwing.
  status: z.enum(['Approved', 'Rejected', 'Pending', 'Auto', 'Cancelled']).nullish().catch(null),
  actorCode: z.string().nullish(),
  actorName: z.string().nullish(),
  reason: z.string().nullish(),
  occurredAt: z.string(),
});

export type AppointmentHistoryEvent = z.infer<typeof appointmentHistoryEventSchema>;

const appointmentHistoryResponseSchema = z.object({
  events: z.array(appointmentHistoryEventSchema),
});

/**
 * Get the appointment + fee history timeline for an appraisal.
 * GET /appraisals/{appraisalId}/appointment-history
 */
export const useGetAppointmentHistory = (
  appraisalId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'appointment-history'],
    queryFn: async (): Promise<AppointmentHistoryEvent[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/appointment-history`);
      const parsed = appointmentHistoryResponseSchema.parse(data);
      return parsed.events;
    },
    // Caller may gate fetching (e.g. only when the history drawer is open). Same queryKey,
    // so the page's count query and the drawer share one cache entry.
    enabled: !!appraisalId && (options?.enabled ?? true),
  });
};
