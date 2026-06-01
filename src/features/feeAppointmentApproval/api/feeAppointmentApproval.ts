import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  FeeAppointmentApprovalDto,
  ResolveFeeAppointmentApprovalRequest,
} from '../types/feeAppointmentApproval';

// ----- Query key factory -----

export const feeAppointmentApprovalKeys = {
  all: ['fee-appointment-approvals'] as const,
  byWorkflowInstance: (workflowInstanceId: string) =>
    ['fee-appointment-approvals', 'by-workflow', workflowInstanceId] as const,
  detail: (id: string) =>
    ['fee-appointment-approvals', 'detail', id] as const,
};

// ----- Raw API functions -----

/**
 * GET /workflows/fee-appointment-approvals/by-workflow-instance/{workflowInstanceId}
 */
export async function getFeeAppointmentApprovalByWorkflowInstance(
  workflowInstanceId: string,
): Promise<FeeAppointmentApprovalDto> {
  const { data } = await axios.get<FeeAppointmentApprovalDto>(
    `/workflows/fee-appointment-approvals/by-workflow-instance/${workflowInstanceId}`,
  );
  return data;
}

/**
 * POST /workflows/fee-appointment-approvals/{id}/resolve
 */
export async function resolveFeeAppointmentApproval(
  id: string,
  body: ResolveFeeAppointmentApprovalRequest,
): Promise<void> {
  await axios.post(`/workflows/fee-appointment-approvals/${id}/resolve`, body);
}

// ----- React Query hooks -----

export function useGetFeeAppointmentApprovalByWorkflowInstance(
  workflowInstanceId: string | undefined,
) {
  return useQuery({
    queryKey: feeAppointmentApprovalKeys.byWorkflowInstance(workflowInstanceId ?? ''),
    queryFn: () => getFeeAppointmentApprovalByWorkflowInstance(workflowInstanceId!),
    enabled: !!workflowInstanceId,
    staleTime: 30 * 1000,
  });
}

export function useResolveFeeAppointmentApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ResolveFeeAppointmentApprovalRequest;
    }) => resolveFeeAppointmentApproval(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeAppointmentApprovalKeys.all });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });
    },
  });
}
