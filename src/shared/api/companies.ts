import { useQuery } from '@tanstack/react-query';
import axios from './axiosInstance';
import { useCompanyStore } from '../store';

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
