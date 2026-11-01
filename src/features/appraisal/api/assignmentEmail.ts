import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import axios from '@shared/api/axiosInstance';

/** Where an attachment comes from: the request's or the appraisal's documents, or a file uploaded for the email only. */
export type AssignmentEmailSource = 'request' | 'appraisal' | 'upload';

export interface AssignmentEmailAttachment {
  documentId: string;
  source: AssignmentEmailSource;
  fileName: string | null;
  fileSizeBytes: number | null;
}

/** GET /appraisals/{id}/assignment-email/preview: the bank template filled from the saved assignment row. */
export interface AssignmentEmailPreview {
  /** The chosen company's name; null while the company is not known yet (auto, quotation). */
  companyName?: string | null;
  /** The assigned company's address, locked; null when the company is unknown or has no email. */
  companyTo: string | null;
  extraTo: string[];
  /** Addresses of people already known, plus role tokens (`IntAdminAll`, …) the system resolves at send. */
  cc: string[];
  /** A display name for each known address in `cc` (absent on older servers and when resending). */
  ccPeople?: { email: string; name: string | null }[];
  subject: string;
  /** Holds `{{company}}` / `{{responsible}}` placeholders; the send fills them in. */
  bodyHtml: string;
  attachments: AssignmentEmailAttachment[];
  maxAttachments: number;
  maxAttachmentBytes: number;
}

/** The `email` of POST /appraisals/{id}/assignments. There is no To: the company address cannot be replaced. */
export interface AssignmentEmailInput {
  extraTo: string[];
  cc: string[];
  subject: string;
  bodyHtml: string;
  attachments: { documentId: string; source: AssignmentEmailSource }[];
}

export const CC_ROLES = [
  'IntAdminAll',
  'FollowupStaff',
  'FollowupSupervisor',
  'Keyer',
  'KeyerSupervisor',
] as const;

/**
 * Not cached: every open (and "restore template") reads the case as it is now.
 * `from` (resend): the same shape, but subject, body, extra To and attachments come from that stored
 * email, and its Cc has the role tokens expanded to the people the row knows (names in `ccPeople`).
 * Without it, the template. `enabled: false` leaves the read to `refetch()` ("restore template").
 */
export const useGetAssignmentEmailPreview = (
  appraisalId: string,
  options: { from?: string | null; enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: ['appraisal', appraisalId, 'assignment-email-preview', options.from ?? 'template'],
    queryFn: async (): Promise<AssignmentEmailPreview> => {
      const { data } = await axios.get<AssignmentEmailPreview>(
        `/appraisals/${appraisalId}/assignment-email/preview`,
        { params: options.from ? { from: options.from } : undefined },
      );
      return data;
    },
    enabled: options.enabled ?? true,
    gcTime: 0,
    staleTime: 0,
    // Coming back from another window must not reload it under the admin's edits; a failure shows
    // the "assign without the email" fallback after one retry, not three.
    refetchOnWindowFocus: false,
    retry: 1,
  });

/** Size of a picked document whose list row carries none (request documents). GET /documents/{id} */
export const documentSizeQuery = (documentId: string) => ({
  queryKey: ['documents', documentId, 'size'],
  queryFn: async (): Promise<number | null> => {
    const { data } = await axios.get<{ fileSizeBytes?: number | null }>(`/documents/${documentId}`);
    return data.fileSizeBytes ?? null;
  },
  staleTime: Infinity,
  // A failure blocks Send until the file is removed: say so after one retry, not three.
  retry: 1,
});

export type AssignmentEmailStatus = 'Pending' | 'Queued' | 'Sent' | 'Failed' | 'NotSent';

/** GET /appraisals/{id}/assignment-emails: one email of the case, newest first. */
export interface AssignmentEmailHistoryItem {
  id: string;
  /** Sent again from the read-only slip, not the email of the assignment itself. */
  isResend: boolean;
  status: AssignmentEmailStatus;
  /** Null when the system wrote it (an assignment the system made). */
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string | null;
  sentAt: string | null;
  /** Resolved addresses; empty until it is handed to the sender. */
  sentTo: string[];
  ccCount: number;
  attachmentCount: number;
  /** Failed only: when the send gave up, and why (short, from the server). */
  failedAt?: string | null;
  failureReason?: string | null;
}

/** GET /appraisals/{id}/assignment-emails/{emailId}: what went out, and what the admin composed. */
export interface AssignmentEmailSent {
  id: string;
  status: AssignmentEmailStatus;
  sentAt: string | null;
  sentTo: string[];
  sentCc: string[];
  /** As composed (Cc role chips unresolved): what "Send again" pre-fills. */
  extraTo: string[];
  cc: string[];
  subject: string;
  bodyHtml: string;
  attachments: AssignmentEmailAttachment[];
}

export const assignmentEmailHistoryKey = (appraisalId: string) => [
  'appraisal',
  appraisalId,
  'assignment-emails',
];

/** A refusal that polling again cannot change (403 no permission, 404 no such case); 408 / 429 and 5xx are transient. */
const isTerminalFailure = (error: unknown) => {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return !!status && status >= 400 && status < 500 && status !== 408 && status !== 429;
};

/**
 * How long until the history is read again: 15 s while the latest email is Queued (about to end Sent or
 * Failed), a minute while Pending (the handover can take days), never once it is settled. A transient
 * failure (network, 5xx) backs the wait off (doubling, up to 5 minutes) instead of ending the polling; a
 * terminal one (403 and the like) stops it.
 */
export const historyPollInterval = (
  latest: AssignmentEmailStatus | undefined,
  error: unknown,
  failures: number,
): number | false => {
  if (error && isTerminalFailure(error)) return false;
  const base = latest === 'Queued' ? 15_000 : latest === 'Pending' ? 60_000 : false;
  return base === false ? false : Math.min(base * 2 ** failures, 300_000);
};

/**
 * Admin only: a 403 (or any other 4xx) leaves the slip without the email row, so no retry. While the latest
 * email waits to go out the slip reads it again (no focus refetch in this app); see `historyPollInterval`.
 */
export const useGetAssignmentEmailHistory = (appraisalId: string, enabled: boolean) => {
  // Failures in a row, for the back-off: a read that lands resets it.
  const failures = useRef(0);
  return useQuery({
    queryKey: assignmentEmailHistoryKey(appraisalId),
    queryFn: async (): Promise<AssignmentEmailHistoryItem[]> => {
      try {
        const { data } = await axios.get<AssignmentEmailHistoryItem[]>(
          `/appraisals/${appraisalId}/assignment-emails`,
        );
        failures.current = 0;
        return data;
      } catch (error) {
        failures.current += 1;
        throw error;
      }
    },
    enabled: enabled && !!appraisalId,
    retry: false,
    // Read on every visit: a re-assignment since the last one adds a row the cache would not have.
    staleTime: 0,
    // Hidden tabs do not poll (React Query's default).
    refetchInterval: query =>
      historyPollInterval(
        query.state.data?.[0]?.status,
        query.state.status === 'error' ? query.state.error : null,
        Math.max(0, failures.current - 1),
      ),
  });
};

/** One email as written and sent. Fixed once Sent; before that its status and sent fields still move. */
export const useGetAssignmentEmailSent = (appraisalId: string, emailId: string | null) =>
  useQuery({
    // Not under the history key: refreshing the list never touches the contents.
    queryKey: ['appraisal', appraisalId, 'assignment-email', emailId],
    queryFn: async (): Promise<AssignmentEmailSent> => {
      const { data } = await axios.get<AssignmentEmailSent>(
        `/appraisals/${appraisalId}/assignment-emails/${emailId}`,
      );
      return data;
    },
    enabled: !!appraisalId && !!emailId,
    staleTime: query => (query.state.data?.status === 'Sent' ? Infinity : 0),
  });

/** "Send again" / "Send email": sends the edited email now; the slip reads the history again. */
export const useResendAssignmentEmail = (appraisalId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: AssignmentEmailInput) => {
      const { data } = await axios.post<{ emailId: string }>(
        `/appraisals/${appraisalId}/assignment-emails/resend`,
        email,
      );
      return data;
    },
    // The new email heads the list at once (no second send while the list is read again), then the
    // list is read; not awaited, so a slow read does not hold the dialog.
    onSuccess: ({ emailId }) => {
      queryClient.setQueryData<AssignmentEmailHistoryItem[]>(
        assignmentEmailHistoryKey(appraisalId),
        list =>
          !list || list.some(e => e.id === emailId)
            ? list
            : [
                {
                  id: emailId,
                  isResend: true,
                  status: 'Queued',
                  createdBy: null,
                  createdByName: null,
                  createdAt: null,
                  sentAt: null,
                  sentTo: [],
                  ccCount: 0,
                  attachmentCount: 0,
                },
                ...list,
              ],
      );
      void queryClient.invalidateQueries({ queryKey: assignmentEmailHistoryKey(appraisalId) });
    },
  });
};
