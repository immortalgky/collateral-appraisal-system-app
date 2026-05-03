import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { projectModelPricingContextKeys } from '../api/queryKeys';
import {
  flattenPricingContext,
  type FlatContext,
  type ProjectModelPricingContextDto,
} from '../utils/flattenPricingContext';

interface UseProjectModelPricingContextOptions {
  appraisalId: string;
  projectId: string;
  modelId: string;
  enabled?: boolean;
}

interface UseProjectModelPricingContextResult {
  context: ProjectModelPricingContextDto | undefined;
  flat: FlatContext | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetch the combined Project + Tower + Model pricing context for a
 * projectModel subject.
 *
 * GET /appraisals/{appraisalId}/projects/{projectId}/models/{modelId}/pricing-context
 *
 * Returns both the raw DTO and a pre-flattened Record for direct factor
 * lookup by fieldName.
 */
export function useProjectModelPricingContext({
  appraisalId,
  projectId,
  modelId,
  enabled = true,
}: UseProjectModelPricingContextOptions): UseProjectModelPricingContextResult {
  const query = useQuery({
    queryKey: projectModelPricingContextKeys.detail(appraisalId, projectId, modelId),
    queryFn: async (): Promise<ProjectModelPricingContextDto> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/projects/${projectId}/models/${modelId}/pricing-context`,
      );
      return data as ProjectModelPricingContextDto;
    },
    enabled: enabled && !!appraisalId && !!projectId && !!modelId,
    // No caching — live edits to project/tower/model must reflect immediately
    staleTime: 0,
    retry: 1,
  });

  const flat = query.data ? flattenPricingContext(query.data) : undefined;

  return {
    context: query.data,
    flat,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
