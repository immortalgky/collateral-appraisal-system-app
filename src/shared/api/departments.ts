import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

export interface DepartmentInfoDto {
  code: string;
  description: string | null;
}

interface DepartmentSearchResult {
  items: DepartmentInfoDto[];
}

/**
 * Search departments by code or description.
 * GET /auth/departments?search=<text>&pageSize=50
 */
export const useSearchDepartments = (search: string) => {
  return useQuery({
    queryKey: ['departments', 'search', search],
    queryFn: async (): Promise<DepartmentInfoDto[]> => {
      const { data } = await axios.get<DepartmentSearchResult>('/auth/departments', {
        params: { search, pageSize: 50 },
      });
      return data.items;
    },
    // Deliberately NOT gated on a minimum search length: department codes are AS400 codes the
    // user cannot guess, so an empty search must return a browsable list (endpoint caps at 50).
    staleTime: 60 * 1000,
  });
};
