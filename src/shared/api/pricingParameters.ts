import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from './axiosInstance';
import { useParametersByGroup } from '../utils/parameterUtils';
import type { ListBoxItem } from '../components/inputs/Dropdown';

/**
 * Catalog data for pricing-analysis and property forms (assumption types, method matrix,
 * fire-insurance rates, etc). Moved here from features/pricingAnalysis so blockProject and
 * appraisal property forms can consume it too — see useFireInsuranceOptions below.
 * GET /pricing-parameters
 */
export const PRICING_PARAMETERS_QUERY_KEY = ['pricing-parameters'] as const;

export interface PricingAssumptionType {
  code: string;
  name: string;
  sectionType: 'income' | 'expenses' | 'any';
  displaySeq: number;
}

export interface PricingAssumptionMethodMatrix {
  assumptionType: string;
  allowedMethodCodes: string[];
}

/**
 * Fire-insurance coverage rate for one building condition. `condition` is the value already
 * persisted on Project/ProjectModel.FireInsuranceCondition and is what forms post back;
 * `code` reconciles the row with the 'FireInsuranceCondition' parameter group (used to resolve
 * a display label — see useFireInsuranceOptions).
 */
export interface FireInsuranceRate {
  code: string;
  condition: string;
  propertyKind: 'Condo' | 'LandAndBuilding';
  ratePerSqm: number;
  displaySeq: number;
}

export interface PricingParametersResponse {
  assumptionTypes: PricingAssumptionType[];
  assumptionMethodMatrix: PricingAssumptionMethodMatrix[];
  fireInsuranceRates: FireInsuranceRate[];
}

interface PricingParametersRaw {
  assumptionTypes: { code: string; name: string; category: string; displaySeq: number }[];
  assumptionMethodMatrix: { assumptionType: string; allowedMethodCodes: string[] }[];
  fireInsuranceRates: FireInsuranceRate[];
}

export function useGetPricingParameters() {
  return useQuery({
    queryKey: PRICING_PARAMETERS_QUERY_KEY,
    queryFn: async (): Promise<PricingParametersResponse> => {
      const { data } = await axios.get<PricingParametersRaw>('/pricing-parameters');
      // Backend Category uses 'income' | 'expenses' | 'other'; the form's
      // sectionType filter expects 'any' for cross-section types (e.g. M99).
      return {
        assumptionTypes: (data.assumptionTypes ?? []).map(a => ({
          code: a.code,
          name: a.name,
          sectionType: a.category === 'income' || a.category === 'expenses' ? a.category : 'any',
          displaySeq: a.displaySeq,
        })),
        assumptionMethodMatrix: data.assumptionMethodMatrix ?? [],
        fireInsuranceRates: data.fireInsuranceRates ?? [],
      };
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Fire-insurance condition dropdown options for a property kind, ordered by displaySeq.
 * `value` is the `condition` key (posted/persisted); `label` is resolved from the
 * 'FireInsuranceCondition' parameter group by matching `code`, so it follows the same
 * locale-driven description lookup every other parameter-group dropdown uses.
 */
export function useFireInsuranceOptions(propertyKind: 'Condo' | 'LandAndBuilding'): ListBoxItem[] {
  const { data } = useGetPricingParameters();
  const conditionParams = useParametersByGroup('FireInsuranceCondition');

  return useMemo(() => {
    const labelByCode = new Map(conditionParams.map(p => [p.code, p.description]));
    return (data?.fireInsuranceRates ?? [])
      .filter(r => r.propertyKind === propertyKind)
      .sort((a, b) => a.displaySeq - b.displaySeq)
      .map(r => ({
        value: r.condition,
        label: labelByCode.get(r.code) ?? r.condition,
        id: r.condition,
      }));
  }, [data, conditionParams, propertyKind]);
}
