import { z } from 'zod';
import type { MeetingFollowupFilter } from '../api/types';

export const meetingFilterSchema = z.object({
  search: z.string().optional(),
});

export type MeetingFilterValues = z.infer<typeof meetingFilterSchema>;

export const defaultMeetingFilter: MeetingFollowupFilter = {
  page: 0,
  pageSize: 25,
};
