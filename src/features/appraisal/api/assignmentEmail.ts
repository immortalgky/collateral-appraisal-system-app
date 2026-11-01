import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  /** The assigned company's address, locked; null while the company is not known yet (auto, quotation). */
  companyTo: string | null;
  extraTo: string[];
  /** Role tokens (`IntAdminAll`, `FollowupStaff`, …) or addresses. */
  cc: string[];
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

/** Not cached: every open (and "restore template") reads the case as it is now. */
export const useGetAssignmentEmailPreview = (appraisalId: string) =>
  useQuery({
    queryKey: ['appraisal', appraisalId, 'assignment-email-preview'],
    queryFn: async (): Promise<AssignmentEmailPreview> => {
      const { data } = await axios.get<AssignmentEmailPreview>(
        `/appraisals/${appraisalId}/assignment-email/preview`,
      );
      return data;
    },
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

/**
 * Admin only: a 403 (or any failure) leaves the slip without the email row, so no retry. While the latest
 * email waits to go out the slip reads it again (no focus refetch in this app): every 15 s once Queued
 * (handed to the sender, about to end Sent or Failed), every minute while Pending (the handover can take
 * days).
 */
export const useGetAssignmentEmailHistory = (appraisalId: string, enabled: boolean) =>
  useQuery({
    queryKey: assignmentEmailHistoryKey(appraisalId),
    queryFn: async (): Promise<AssignmentEmailHistoryItem[]> => {
      const { data } = await axios.get<AssignmentEmailHistoryItem[]>(
        `/appraisals/${appraisalId}/assignment-emails`,
      );
      return data;
    },
    enabled: enabled && !!appraisalId,
    retry: false,
    // Read on every visit: a re-assignment since the last one adds a row the cache would not have.
    staleTime: 0,
    // Hidden tabs do not poll (React Query's default); a failed read stops it.
    refetchInterval: query => {
      if (query.state.status === 'error') return false;
      const status = query.state.data?.[0]?.status;
      return status === 'Queued' ? 15_000 : status === 'Pending' ? 60_000 : false;
    },
  });

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
