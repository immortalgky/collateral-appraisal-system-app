import type { CreateLandRequestType, CreateLandResponseType } from '@/shared/forms/v2';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

export const useCreateLandRequest = () => {
  return useMutation({
    mutationFn: async (request: CreateLandRequestType): Promise<CreateLandResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/land-detail', request);
      return data;
    },
    // TODO: Change to actual logic
    onSuccess: data => {
      console.log(data);
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};
