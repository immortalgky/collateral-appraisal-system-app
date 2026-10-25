import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import type { ApiError } from '@/shared/types/api';

import { useCreateProjectModelPricingAnalysis } from '../../../api/projectPricingAnalysis';
import { isCondo } from '../../../types';
import type { ProjectModel, ProjectType } from '../../../types';

type AppError = AxiosError & { apiError?: ApiError };

/**
 * The one pricing action of a Condo or village model, in its detail page: "View pricing" when the
 * model already has an analysis, "Calculate pricing" (creates the analysis, then opens it) when it
 * has none. Left out on a read-only page unless there is an analysis to view.
 */
export function ModelPricingButton({
  model,
  projectType = 'U',
}: {
  model: ProjectModel;
  projectType?: ProjectType;
}) {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const readOnly = usePageReadOnly();
  const { mutate: createAnalysis, isPending } = useCreateProjectModelPricingAnalysis();
  const hasAnalysis = Boolean(model.pricingAnalysisId);

  if (readOnly && !hasAnalysis) return null;

  // The village routes carry the same pricing-analysis pages as Condo's (router.tsx).
  const routeSegment = isCondo(projectType) ? 'block-condo' : 'block-village';
  const analysisPath = (analysisId: string) =>
    `${basePath}/${routeSegment}/model/${model.id}/pricing-analysis/${analysisId}`;

  const handleClick = () => {
    if (model.pricingAnalysisId) {
      navigate(analysisPath(model.pricingAnalysisId));
      return;
    }
    if (readOnly || !appraisalId) return;
    createAnalysis(
      { appraisalId, modelId: model.id },
      {
        onSuccess: data => {
          if (!data?.id) {
            toast.error(t('toasts.model.pricingNoId'));
            return;
          }
          navigate(analysisPath(data.id));
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.model.pricingCreateFailed'));
        },
      },
    );
  };

  return (
    <Button
      size="sm"
      variant={hasAnalysis ? 'outline' : 'primary'}
      onClick={handleClick}
      isLoading={isPending}
      leftIcon={<Icon name={hasAnalysis ? 'chart-line' : 'calculator'} style="solid" />}
      title={
        hasAnalysis
          ? t('modelListing.aria.viewPricingAnalysis')
          : t('modelListing.aria.runPricingAnalysis')
      }
    >
      {hasAnalysis ? t('modelListing.viewPricing') : t('modelListing.runPricing')}
    </Button>
  );
}
