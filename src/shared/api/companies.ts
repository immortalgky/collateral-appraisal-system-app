import { useQuery } from '@tanstack/react-query';
import axios from './axiosInstance';
import { useCompanyStore } from '../store';

export interface CompanyOption {
  id: string;
  companyName: string;
}

/**
 * Fallback single-company fetch for autocomplete hydration when the global
 * company store has not yet loaded. Returns only the fields needed to render
 * a selected chip ({id, companyName}). For full company details (rating,
 * contact, etc.) use the feature-level useGetCompanyById in features/appraisal.
 */
export const useGetCompanyByIdMinimal = (companyId: string | null) => {
  return useQuery({
    queryKey: ['companies', 'minimal', companyId],
    queryFn: async (): Promise<CompanyOption> => {
      const { data } = await axios.get(`/companies/${companyId}`);
      const company = data.company ?? data;
      return { id: company.id, companyName: company.name };
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
};

export const useCompaniesQuery = () => {
  return useQuery({
    queryKey: ['companies', 'all'],
    queryFn: async () => {
      const store = useCompanyStore.getState();
      if (store.isLoaded) return store.companies;

      store.setLoading(true);
      try {
        const { data } = await axios.get('/companies');
        const raw: { id: string; name: string }[] = data.companies ?? data.items ?? [];
        const companies = raw.map(c => ({ id: c.id, companyName: c.name }));
        useCompanyStore.getState().setCompanies(companies);
        return companies;
      } catch {
        useCompanyStore.getState().setLoading(false);
        return [];
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};
