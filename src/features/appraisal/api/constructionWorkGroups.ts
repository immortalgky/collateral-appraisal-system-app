import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import axios from '@shared/api/axiosInstance';
import { schemas } from '@shared/schemas/v1';

type ConstructionWorkGroupDto = z.infer<typeof schemas.ConstructionWorkGroupDto>;

export const CONSTRUCTION_WORK_GROUPS_KEY = ['construction-work-groups'] as const;

export const useConstructionWorkGroups = () => {
  return useQuery({
    queryKey: CONSTRUCTION_WORK_GROUPS_KEY,
    queryFn: async (): Promise<ConstructionWorkGroupDto[]> => {
      const { data } = await axios.get<ConstructionWorkGroupDto[]>(
        '/construction-work-groups',
      );
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
