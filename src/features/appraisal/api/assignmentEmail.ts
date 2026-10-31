import { useQuery } from '@tanstack/react-query';
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
