import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ==================== Types ====================

export type PricingValidationStatus = 'Passed' | 'Failed' | 'Skipped';

export interface PricingValidationStep {
  /** Stable rule identifier, e.g. "MakerSurvey". */
  key: string;
  /** Human-readable label for the checklist UI. */
  displayName: string;
  status: PricingValidationStatus;
  /** Per-property failure detail; empty when passed/skipped. */
  messages: string[];
}

export interface PricingValidationResult {
  valid: boolean;
  steps: PricingValidationStep[];
}

// ==================== Query Keys ====================

export const pricingValidationKeys = {
  byGroup: (groupId: string) => ['pricing-analysis', 'validation', 'group', groupId] as const,
};

// ==================== Hook ====================

/**
 * Runs the pricing-analysis pre-flight validation for a property group.
 * Read-only GET; the result is intentionally not cached across opens
 * (gcTime/staleTime 0) so each open re-checks the current data.
 *
 * @param groupId  the property group to validate
 * @param enabled  only fires the request while truthy (e.g. modal open)
 */
export const useValidateGroupForPricing = (groupId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: pricingValidationKeys.byGroup(groupId ?? ''),
    enabled: !!groupId && enabled,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    queryFn: async (): Promise<PricingValidationResult> => {
      const { data } = await axios.get(`/property-groups/${groupId}/pricing-analysis/validation`);
      return data;
    },
  });
