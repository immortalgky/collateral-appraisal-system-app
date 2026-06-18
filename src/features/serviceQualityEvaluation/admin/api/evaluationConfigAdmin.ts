import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { evaluationConfigKeys, useGetEvaluationConfig } from '../../api';

// Re-export useGetEvaluationConfig so the admin page can import from one place.
export { useGetEvaluationConfig };

// ─── PUT /appraisal-evaluation-configs/{id} ───────────────────────────────────

export interface UpdateEvaluationConfigBody {
  labelEn: string;
  labelTh: string;
  weight: number;
  maxScore: number;
  guidanceJson: string;
  thresholdsJson: string | null;
}

export const useUpdateEvaluationConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateEvaluationConfigBody;
    }): Promise<void> => {
      await axios.put(`/appraisal-evaluation-configs/${id}`, body);
    },
    onSuccess: () => {
      // Invalidate all segment variants so next fetch picks up fresh config.
      queryClient.invalidateQueries({ queryKey: evaluationConfigKeys.all });
    },
  });
};
