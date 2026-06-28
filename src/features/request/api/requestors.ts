import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

export interface RequestorInfoDto {
  userId: string;
  employeeId: string;
  name: string;
  email: string | null;
  contactNo: string | null;
  aoCode: string | null;
  costCenterCode: string | null;
  costCenterDescription: string | null;
  department: string | null;
}

interface RequestorSearchResult {
  items: RequestorInfoDto[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * Search requestors by employee ID or name.
 * GET /auth/requestors?search=<text>&pageNumber=1&pageSize=20
 * Requires at least 1 character to trigger the search.
 */
export const useSearchRequestors = (search: string) => {
  return useQuery({
    queryKey: ['requestors', 'search', search],
    queryFn: async (): Promise<RequestorInfoDto[]> => {
      const { data } = await axios.get<RequestorSearchResult>('/auth/requestors', {
        params: { search, pageNumber: 1, pageSize: 20 },
      });
      return data.items;
    },
    enabled: search.trim().length >= 1,
    staleTime: 60 * 1000,
  });
};
