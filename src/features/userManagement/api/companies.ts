import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  Company,
  CompanyListResult,
  GetCompaniesParams,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  EligibleCompany,
} from '../types';

const QUERY_KEY = 'adminCompanies';

export const useGetAdminCompanies = (params: GetCompaniesParams = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async (): Promise<CompanyListResult> => {
      const { data } = await axios.get<CompanyListResult>('/companies', {
        params: {
          search: params.search || undefined,
          isActive: params.isActive,
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
  });
};

export const useGetAdminCompanyById = (id: string | null) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async (): Promise<Company> => {
      const { data } = await axios.get<{ company: Company }>(`/companies/${id}`);
      return data.company;
    },
    enabled: !!id,
  });
};

export const useCreateAdminCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateCompanyRequest) => {
      const { data } = await axios.post('/companies', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateAdminCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateCompanyRequest & { id: string }) => {
      const { data } = await axios.put(`/companies/${id}`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Invalidate eligible companies so callers see refreshed data
      queryClient.invalidateQueries({ queryKey: ['eligibleCompanies'] });
    },
  });
};

export const useDeleteAdminCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/companies/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['eligibleCompanies'] });
    },
  });
};

export const useGetEligibleCompanies = () => {
  return useQuery({
    queryKey: ['eligibleCompanies'],
    queryFn: async (): Promise<EligibleCompany[]> => {
      const { data } = await axios.get<{ companies: EligibleCompany[] }>('/companies/eligible');
      return data.companies ?? [];
    },
    staleTime: 30_000,
  });
};
