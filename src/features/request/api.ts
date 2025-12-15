import type { CreateRequestRequestType, CreateRequestResponseType } from '@/shared/forms/v1';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

export const useCreateRequest = () => {
  return useMutation({
    mutationFn: async (request: CreateRequestRequestType): Promise<CreateRequestResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/requests', request);
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

// TODO: (Wait for more info)
export const useUploadDocument = () => {
  return useMutation({
    mutationFn: async (files: FileList): Promise<any> => {
      axios
        .postForm('https://localhost:7111/documents/a/1', {
          Files: files,
        })
        .then(response => console.log(response))
        .catch(error => console.log(error));
    },
  });
};

// pending
export const useCreateCollateral = () => {
  return useMutation({
    mutationFn: async (collateral: any): Promise<any> => {
      const { data } = await axios.postForm('https://localhost:7111/collaterals', { collateral });
      return data;
    },

    onSuccess: data => {
      console.log(data);
    },

    onError: (error: Error) => {
      console.log(error);
    },
  });
};
