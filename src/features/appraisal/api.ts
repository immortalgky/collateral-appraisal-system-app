import { useQuery } from '@tanstack/react-query';
// import axios from '@shared/api/axiosInstance';
import type { AppraisalData } from './context/AppraisalContext';

/**
 * Hook for fetching appraisal data by ID
 * GET /appraisals/{appraisalId}
 *
 * TODO: Remove mock and use real API
 */
export const useGetAppraisalById = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId],
    queryFn: async (): Promise<AppraisalData> => {
      // TODO: Replace mock with real API call
      // const { data } = await axios.get(`/appraisals/${appraisalId}`);

      // Mock response for testing
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      return {
        appraisalId: appraisalId ?? '',
        requestId: 'AE038AFF-FB7D-44F5-AA7E-09038B523E0F',
        appraisalReportNo: 'APR-2024-001234',
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
