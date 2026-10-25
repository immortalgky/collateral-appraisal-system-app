import { keepPreviousData, type QueryClient, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { FeePreview, FeePreviewParams } from '../types/feePreview';

export const feePreviewKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'fee-preview'] as const,
  detail: (appraisalId: string, params: FeePreviewParams) =>
    [...feePreviewKeys.all(appraisalId), params] as const,
};

/**
 * Marks fee-previews stale. Call it after anything that can change what an assignment would be
 * priced at (a quotation created, sent, cancelled, a winner picked or finalized...), since a
 * quotation is priced from its winner and the preview is cached. Pass the appraisals affected when
 * they are known; without them every appraisal's preview is marked.
 */
export const invalidateFeePreviews = (
  queryClient: QueryClient,
  appraisalIds?: readonly string[],
) => {
  if (appraisalIds && appraisalIds.length > 0) {
    for (const id of new Set(appraisalIds)) {
      queryClient.invalidateQueries({ queryKey: feePreviewKeys.all(id) });
    }
    return;
  }
  queryClient.invalidateQueries({
    predicate: query => query.queryKey[0] === 'appraisal' && query.queryKey[2] === 'fee-preview',
  });
};

/**
 * Read-only fee estimate for the selected assignment type / method (no DB write); no params = the
 * appraisal's actual assignment. (The endpoint also takes a companyId, but only its quotation path
 * reads it, and the admin page prices a quotation by its winner, so it is not sent.)
 * GET /appraisals/{appraisalId}/fee-preview
 *
 * The previous result stays on screen while a new selection loads (isPlaceholderData), so the card
 * does not flash empty on every radio click.
 */
export const useGetFeePreview = (
  appraisalId: string,
  params: FeePreviewParams = {},
  enabled = true,
) => {
  const normalized: FeePreviewParams = {
    assignmentType: params.assignmentType,
    assignmentMethod: params.assignmentMethod,
  };
  return useQuery({
    queryKey: feePreviewKeys.detail(appraisalId, normalized),
    queryFn: async (): Promise<FeePreview> => {
      const { data } = await axios.get<FeePreview>(`/appraisals/${appraisalId}/fee-preview`, {
        params: normalized,
      });
      return data;
    },
    enabled: enabled && !!appraisalId,
    placeholderData: keepPreviousData,
    // Quotation work happens on other pages: coming back must not show a cached estimate.
    refetchOnMount: 'always',
  });
};
