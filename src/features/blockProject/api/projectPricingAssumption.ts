import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { ProjectPricingAssumption } from '../types';
import { projectUnitPriceKeys } from './projectUnitPrice';

// ==================== Query Keys ====================

export const projectPricingAssumptionKeys = {
  /** ['appraisal', appraisalId, 'project', 'pricing-assumptions'] */
  detail: (appraisalId: string) =>
    ['appraisal', appraisalId, 'project', 'pricing-assumptions'] as const,
};

// ==================== Request Types ====================

/**
 * id, projectId, and projectType are server-managed.
 * modelAssumptions: null = no change; [] = clear all; omit to keep current.
 */
type SaveProjectPricingAssumptionRequest = Omit<
  ProjectPricingAssumption,
  'id' | 'projectId' | 'projectType' | 'modelAssumptions'
> & {
  modelAssumptions?: ProjectPricingAssumption['modelAssumptions'] | null;
};

// ==================== Hooks ====================

/**
 * Get pricing assumptions for a project.
 * GET /appraisals/{appraisalId}/project/pricing-assumptions
 *
 * Returns 204 (null) if no assumptions have been saved yet.
 * Works for both Condo and LandAndBuilding project types.
 */
export const useGetProjectPricingAssumptions = (appraisalId: string) => {
  return useQuery({
    queryKey: projectPricingAssumptionKeys.detail(appraisalId),
    queryFn: async (): Promise<ProjectPricingAssumption | null> => {
      const { data } = await axios.get<ProjectPricingAssumption | null>(
        `/appraisals/${appraisalId}/project/pricing-assumptions`,
      );
      return data ?? null;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save (upsert) pricing assumptions for a project.
 * PUT /appraisals/{appraisalId}/project/pricing-assumptions
 *
 * The BE automatically routes to the correct domain method based on project type.
 * Condo-only fields (poolView, south, floorIncrement) are ignored for LB projects.
 * LB-only fields (nearGarden, landIncreaseDecreaseRate) are ignored for Condo projects.
 */
export const useSaveProjectPricingAssumptions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: SaveProjectPricingAssumptionRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/project/pricing-assumptions`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectPricingAssumptionKeys.detail(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: projectUnitPriceKeys.all(variables.appraisalId),
      });
    },
  });
};
