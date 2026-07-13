import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import axios from '@shared/api/axiosInstance';

// Backend: MachineryAppraisalSummary — appraisal-level (one row per appraisal),
// Section 3.1 (general machinery) + Section 3.3 (rights & legal).
// Types are hand-written here because the machinery-summary contract is not part
// of the generated `@shared/schemas/v1` bundle.

/** Editable fields shared by the request body and response. */
export interface MachinerySummaryFields {
  // Section 3.1 — general machinery
  inIndustrial: string | null;
  surveyedNumber: number | null;
  appraisalNumber: number | null;
  installedAndUseCount: number | null;
  appraisalScrapCount: number | null;
  appraisedByDocumentCount: number | null;
  notInstalledCount: number | null;
  maintenance: string | null;
  exterior: string | null;
  performance: string | null;
  marketDemandAvailable: boolean | null;
  marketDemand: string | null;
  // Section 3.3 — rights & legal
  proprietor: string | null;
  owner: string | null;
  machineAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  obligation: string | null;
  other: string | null;
}

export type SaveMachinerySummaryRequest = Partial<MachinerySummaryFields>;

export interface MachinerySummaryResponse extends MachinerySummaryFields {
  summaryId: string;
  appraisalId: string;
}

export const machinerySummaryKeys = {
  detail: (appraisalId: string | undefined) =>
    ['appraisal', appraisalId, 'machinery-summary'] as const,
};

/**
 * Get the appraisal-level machinery summary.
 * GET /appraisals/{appraisalId}/machinery-summary
 *
 * The backend returns 404 when nothing has been saved yet — that is a valid
 * "empty form" state, not an error, so we resolve it to `null`.
 */
export const useGetMachinerySummary = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: machinerySummaryKeys.detail(appraisalId),
    queryFn: async (): Promise<MachinerySummaryResponse | null> => {
      try {
        const { data } = await axios.get(`/appraisals/${appraisalId}/machinery-summary`);
        return data;
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!appraisalId,
  });
};

/**
 * Create or update (upsert) the machinery summary.
 * PUT /appraisals/{appraisalId}/machinery-summary
 */
export const useSaveMachinerySummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      ...body
    }: SaveMachinerySummaryRequest & {
      appraisalId: string;
    }): Promise<MachinerySummaryResponse> => {
      const { data } = await axios.put(`/appraisals/${appraisalId}/machinery-summary`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: machinerySummaryKeys.detail(variables.appraisalId),
      });
    },
  });
};
