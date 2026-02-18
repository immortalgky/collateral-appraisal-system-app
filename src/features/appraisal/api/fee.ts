import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AddFeeItemRequestType,
  AppraisalFeeDtoType,
  ApproveFeeItemRequestType,
  RecordPaymentRequestType,
  RejectFeeItemRequestType,
  UpdateFeeItemRequestType,
  UpdatePaymentRequestType,
} from '@shared/schemas/v1';

/**
 * Get fees for an appraisal
 * GET /appraisals/{appraisalId}/fees
 */
export const useGetAppraisalFees = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'fees'],
    queryFn: async (): Promise<AppraisalFeeDtoType[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/fees`);
      return data.fees ?? [];
    },
    enabled: !!appraisalId,
  });
};

/**
 * Create a new appraisal fee
 * POST /appraisals/{appraisalId}/fees
 */
// export const useCreateAppraisalFee = () => {
//   const queryClient = useQueryClient();
//
//   return useMutation({
//     mutationFn: async ({
//       appraisalId,
//       ...body
//     }: CreateAppraisalFeeRequestType & {
//       appraisalId: string;
//     }): Promise<CreateAppraisalFeeResponseType> => {
//       const { data } = await axios.post(`/appraisals/${appraisalId}/fees`, body);
//       return data;
//     },
//     onSuccess: (_, variables) => {
//       queryClient.invalidateQueries({
//         queryKey: ['appraisal', variables.appraisalId, 'fees'],
//       });
//     },
//   });
// };

/**
 * Update an appraisal fee
 * PATCH /appraisals/{appraisalId}/fees/{feeId}
 */
export const useUpdateAppraisalFee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      ...body
    }: {
      appraisalId: string;
      feeId: string;
      feePaymentType: string;
    }): Promise<void> => {
      await axios.patch(`/appraisals/${appraisalId}/fees/${feeId}`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};

/**
 * Approve a fee item
 * PATCH /appraisals/{appraisalId}/fees/{feeId}/items/{itemId}/approve
 */
export const useApproveFeeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      itemId,
      ...body
    }: ApproveFeeItemRequestType & {
      appraisalId: string;
      feeId: string;
      itemId: string;
    }): Promise<void> => {
      await axios.patch(`/appraisals/${appraisalId}/fees/${feeId}/items/${itemId}/approve`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};

/**
 * Reject a fee item
 * PATCH /appraisals/{appraisalId}/fees/{feeId}/items/{itemId}/reject
 */
export const useRejectFeeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      itemId,
      ...body
    }: RejectFeeItemRequestType & {
      appraisalId: string;
      feeId: string;
      itemId: string;
    }): Promise<void> => {
      await axios.patch(`/appraisals/${appraisalId}/fees/${feeId}/items/${itemId}/reject`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};

/**
 * Record a payment for a fee
 * POST /appraisals/{appraisalId}/fees/{feeId}/payments
 */
export const useRecordPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      ...body
    }: RecordPaymentRequestType & {
      appraisalId: string;
      feeId: string;
    }): Promise<void> => {
      await axios.post(`/appraisals/${appraisalId}/fees/${feeId}/payments`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};

/**
 * Update a payment
 * PUT /appraisals/{appraisalId}/fees/{feeId}/payments/{paymentId}
 */
export const useUpdatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      paymentId,
      ...body
    }: UpdatePaymentRequestType & {
      appraisalId: string;
      feeId: string;
      paymentId: string;
    }): Promise<void> => {
      await axios.put(`/appraisals/${appraisalId}/fees/${feeId}/payments/${paymentId}`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};

/**
 * Remove a payment
 * DELETE /appraisals/{appraisalId}/fees/{feeId}/payments/{paymentId}
 */
export const useRemovePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      paymentId,
    }: {
      appraisalId: string;
      feeId: string;
      paymentId: string;
    }): Promise<void> => {
      await axios.delete(`/appraisals/${appraisalId}/fees/${feeId}/payments/${paymentId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};

/**
 * Add fee item to an existing fee
 * POST /appraisals/{appraisalId}/fees/{feeId}/items
 */
export const useAddFeeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      ...body
    }: AddFeeItemRequestType & { appraisalId: string; feeId: string }) => {
      await axios.post(`/appraisals/${appraisalId}/fees/${feeId}/items`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};

/**
 * Update a fee item
 * PUT /appraisals/{appraisalId}/fees/{feeId}/items/{feeItemId}
 */
export const useUpdateFeeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      feeItemId,
      ...body
    }: UpdateFeeItemRequestType & {
      appraisalId: string;
      feeId: string;
      feeItemId: string;
    }): Promise<void> => {
      await axios.put(`/appraisals/${appraisalId}/fees/${feeId}/items/${feeItemId}`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};

/**
 * Remove a fee item
 * DELETE /appraisals/{appraisalId}/fees/{feeId}/items/{feeItemId}
 */
export const useRemoveFeeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      feeId,
      feeItemId,
    }: {
      appraisalId: string;
      feeId: string;
      feeItemId: string;
    }): Promise<void> => {
      await axios.delete(`/appraisals/${appraisalId}/fees/${feeId}/items/${feeItemId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'fees'],
      });
    },
  });
};
