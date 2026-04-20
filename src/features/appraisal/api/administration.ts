import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AssignAppraisalRequestType, AssignAppraisalResponseType } from '@shared/schemas/v1';
import type {
  AddToQuotationRequest,
  CreateQuotationRequest,
  CurrentAssignment,
  ExternalCompany,
  InternalStaff,
  Quotation,
} from '../types/administration';


/**
 * Get a user by ID
 * GET /auth/users/{userId}
 */
export const useGetUserById = (userId: string | null) => {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async (): Promise<InternalStaff> => {
      const { data } = await axios.get(`/auth/users/${userId}`);
      return {
        id: data.id,
        employeeId: data.username,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email ?? '',
        department: data.department ?? '',
        avatar: data.avatarUrl ?? null,
        currentWorkload: 0,
      };
    },
    enabled: !!userId,
  });
};

/**
 * Get a company by ID
 * GET /companies/{companyId}
 */
export const useGetCompanyById = (companyId: string | null) => {
  return useQuery({
    queryKey: ['companies', 'by-id', companyId],
    queryFn: async (): Promise<ExternalCompany> => {
      const { data } = await axios.get(`/companies/${companyId}`);
      const company = data.company ?? data;
      return {
        id: company.id,
        companyName: company.name,
        registrationNo: company.taxId ?? '',
        contactPerson: company.contactPerson ?? '',
        contactPhone: company.phone ?? '',
        contactEmail: company.email ?? '',
        rating: 0,
        activeAssignments: 0,
      };
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
};

/**
 * Get current assignment for an appraisal
 * GET /appraisals/{appraisalId}/assignments
 */
export const useGetAssignment = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'assignments'],
    queryFn: async (): Promise<CurrentAssignment[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/assignments`);
      return data.assignments ?? [];
    },
    enabled: !!appraisalId,
  });
};

/**
 * Create new assignment
 * POST /appraisals/{appraisalId}/assignments
 */
export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: AssignAppraisalRequestType & { appraisalId: string },
    ): Promise<AssignAppraisalResponseType> => {
      const { appraisalId, ...body } = request;
      const { data } = await axios.post(`/appraisals/${appraisalId}/assignments`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'assignments'],
      });
    },
  });
};

/**
 * Get eligible assignees for a workflow activity (same pool as round-robin)
 * GET /api/workflows/instances/{workflowInstanceId}/activities/{targetActivityId}/eligible-assignees
 */
export const useGetEligibleStaff = (
  workflowInstanceId: string | undefined,
  targetActivityId: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['eligible-assignees', workflowInstanceId, targetActivityId],
    queryFn: async (): Promise<InternalStaff[]> => {
      const { data } = await axios.get(
        `/api/workflows/instances/${workflowInstanceId}/activities/${targetActivityId}/eligible-assignees`,
      );
      return (data.eligibleAssignees ?? []).map(
        (a: { userId: string; displayName: string }) => ({
          id: a.userId,
          employeeId: a.userId,
          name: a.displayName,
          email: '',
          department: '',
          avatar: null,
          currentWorkload: 0,
        }),
      );
    },
    enabled: enabled && !!workflowInstanceId,
  });
};

/**
 * Get eligible external companies for assignment by loan type / banking segment
 * GET /companies/eligible?loanType={bankingSegment}
 */
export const useGetEligibleCompanies = (
  bankingSegment: string | undefined,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['eligible-companies', bankingSegment],
    queryFn: async (): Promise<ExternalCompany[]> => {
      const { data } = await axios.get('/companies/eligible', {
        params: { loanType: bankingSegment },
      });
      return (data.companies ?? []).map((c: { id: string; name: string; taxId?: string; contactPerson?: string; phone?: string; email?: string }) => ({
        id: c.id,
        companyName: c.name,
        registrationNo: c.taxId ?? '',
        contactPerson: c.contactPerson ?? '',
        contactPhone: c.phone ?? '',
        contactEmail: c.email ?? '',
        rating: 0,
        activeAssignments: 0,
      }));
    },
    enabled: enabled && !!bankingSegment,
  });
};

/**
 * Get quotations that include this appraisal
 * GET /quotations?AppraisalId={appraisalId}
 */
export const useGetAppraisalQuotations = (appraisalId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['quotations', { appraisalId }],
    queryFn: async (): Promise<Quotation[]> => {
      const { data } = await axios.get('/quotations', {
        params: { AppraisalId: appraisalId, PageNumber: 0, PageSize: 100 },
      });
      const result = data.quotations ?? data;
      return result.items ?? [];
    },
    enabled: enabled && !!appraisalId,
  });
};

/**
 * Get pending quotations (status = 'Pending') for adding appraisals
 * GET /quotations?Status=Pending
 */
export const useGetPendingQuotations = (_companyId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['quotations', 'pending'],
    queryFn: async (): Promise<Quotation[]> => {
      const { data } = await axios.get('/quotations', {
        params: { Status: 'Pending', PageNumber: 0, PageSize: 100 },
      });
      const result = data.quotations ?? data;
      return result.items ?? [];
    },
    enabled,
  });
};

/**
 * Create a new quotation
 * POST /quotations
 */
export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateQuotationRequest): Promise<{ id: string }> => {
      const { data } = await axios.post('/quotations', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

/**
 * Add appraisal to existing quotation
 * POST /quotations/{quotationId}/appraisals
 */
export const useAddToQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_request: AddToQuotationRequest): Promise<{ success: boolean }> => {
      // TODO: Replace with real API call
      // const { data } = await axios.post(
      //   `/quotations/${request.quotationId}/appraisals`,
      //   { appraisalId: request.appraisalId }
      // );

      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};
