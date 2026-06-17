import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface CompanyWeight {
  companyId: string;
  weight: number;
}

export interface CompanyRoundRobinConfigDto {
  id: string;
  loanType: string | null;
  entries: CompanyWeight[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface SaveCompanyRoundRobinConfigBody {
  loanType?: string | null;
  entries: CompanyWeight[];
  isActive: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────────────────────────────────────

const BASE = '/api/workflow/company-roundrobin-configs';

export const companyRoundRobinConfigKeys = {
  all: ['company-roundrobin-configs'] as const,
  list: () => [...companyRoundRobinConfigKeys.all, 'list'] as const,
};

// ──────────────────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────────────────

export const useListCompanyRoundRobinConfigs = () => {
  return useQuery({
    queryKey: companyRoundRobinConfigKeys.list(),
    queryFn: async (): Promise<CompanyRoundRobinConfigDto[]> => {
      const { data } = await axios.get<CompanyRoundRobinConfigDto[]>(BASE);
      return data ?? [];
    },
    staleTime: 30_000,
  });
};

export const useCreateCompanyRoundRobinConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: SaveCompanyRoundRobinConfigBody,
    ): Promise<CompanyRoundRobinConfigDto> => {
      const { data } = await axios.post<CompanyRoundRobinConfigDto>(BASE, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyRoundRobinConfigKeys.all });
    },
  });
};

export const useUpdateCompanyRoundRobinConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: SaveCompanyRoundRobinConfigBody;
    }): Promise<CompanyRoundRobinConfigDto> => {
      const { data } = await axios.put<CompanyRoundRobinConfigDto>(`${BASE}/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyRoundRobinConfigKeys.all });
    },
  });
};

export const useDeleteCompanyRoundRobinConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`${BASE}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyRoundRobinConfigKeys.all });
    },
  });
};
