import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';

import { useCreatePricingAnalysis } from '../api';
import { useReadiness } from '../hooks/useReadiness';
import type {
  ReadinessProblemDetails,
  RuleViolationDto,
} from '../types/readiness';

interface Props {
  appraisalId: string;
  groupId: string;
  /** Where to navigate once a pricing analysis is created. */
  buildPricingPath?: (pricingAnalysisId: string) => string;
  /** Called when the click results in 422 violations. Wire up your toast/snackbar here. */
  onValidationFailed?: (violations: RuleViolationDto[]) => void;
}

/**
 * "Analyze Price" (AP) button.
 *
 * Two layers of validation:
 *   1. Disabled state from useReadiness — fast UX feedback, no round trip.
 *   2. 422 fallback on click — defensive in case the readiness data was stale
 *      (e.g. another tab modified the property in between render and click).
 */
export function AnalyzePriceButton({
  appraisalId,
  groupId,
  buildPricingPath,
  onValidationFailed,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    isLoading,
    canStartPricingAnalysis,
    violations,
  } = useReadiness(appraisalId, groupId);

  const create = useCreatePricingAnalysis();

  const handleClick = async () => {
    try {
      const result = await create.mutateAsync({ groupId });
      if (buildPricingPath) navigate(buildPricingPath(result.id));
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data as ReadinessProblemDetails;
        onValidationFailed?.(data.violations ?? []);
        return;
      }
      throw err;
    }
  };

  const tooltip = !canStartPricingAnalysis && violations.length > 0
    ? violations.map(v => t(`readiness.${v.code}`, { defaultValue: v.message })).join('\n')
    : undefined;

  return (
    <button
      type="button"
      disabled={isLoading || !canStartPricingAnalysis || create.isPending}
      onClick={handleClick}
      title={tooltip}
      aria-label={t('readiness.analyzePrice', { defaultValue: 'Analyze Price' })}
      className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      {create.isPending
        ? t('readiness.starting', { defaultValue: 'Starting…' })
        : t('readiness.analyzePrice', { defaultValue: 'Analyze Price' })}
    </button>
  );
}
