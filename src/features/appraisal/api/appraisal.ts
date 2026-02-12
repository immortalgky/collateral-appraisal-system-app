import type { GetAppraisalByIdResponseType } from '@/shared/schemas/v1';
import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

/**
 * Hook for fetching appraisal data by ID
 * GET /appraisals/{appraisalId}
 */
export const useGetAppraisalById = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId],
    queryFn: async (): Promise<GetAppraisalByIdResponseType> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}`);

      return {
        appraisalId: data.id ?? '',
        requestId: data.requestId,
        appraisalReportNo: data.appraisalNumber,
        status: 'in_progress',
        workflowStage: 'Field Inspection',
        purpose: 'New Loan',
        priority: 'high',
        requestor: {
          id: 'user-001',
          name: 'Somchai Jaidee',
          avatar: null,
        },
        appointmentDateTime: '2025-01-15T10:00:00',
        appointmentLocation: 'Bangkok, Sukhumvit 23',
        feePaymentType: 'Transfer',
        paymentStatus: 'Paid',
        totalAppraisalFee: 15000,
      };
    },
    enabled: !!appraisalId,
  });
};
