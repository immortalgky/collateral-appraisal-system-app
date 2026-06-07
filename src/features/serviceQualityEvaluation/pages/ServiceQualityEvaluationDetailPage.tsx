import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import { CancelButton } from '@shared/components/buttons';
import DataErrorState from '@shared/components/DataErrorState';
import ActionBar from '@shared/components/ActionBar';
import Icon from '@shared/components/Icon';
import { Textarea } from '@shared/components/inputs';
import toast from 'react-hot-toast';
import { formatLocaleDate } from '@shared/utils/dateUtils';
import { useBreadcrumbExtrasStore } from '@shared/store';
import { useGetAppraisalById } from '@/features/appraisal/api/appraisal';
import {
  useGetEvaluationByAppraisal,
  useGetEvaluationHeader,
  useCreateEvaluation,
  useUpdateEvaluation,
  useDetectDeliveryTime,
  useGetEvaluationConfig,
} from '../api';
import {
  evaluationSchema,
  defaultEvaluationValues,
  CRITERIA_LABELS,
  CRITERIA_WEIGHTS,
} from '../schemas/form';
import type { EvaluationFormValues } from '../schemas/form';
import type { EvaluationConfig } from '../api/types';
import RatingGuidelinesTable from '../components/RatingGuidelinesTable';
import EvaluationCriteriaRow from '../components/EvaluationCriteriaRow';
import StarRating from '../components/StarRating';

// ─── Info Grid ────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value || '—'}</dd>
    </div>
  );
}

// ─── Total Row ────────────────────────────────────────────────────────────────

interface EvaluationTotalRowProps {
  values: EvaluationFormValues;
  totalLabel: string;
  configs?: EvaluationConfig[];
}

function EvaluationTotalRow({ values, totalLabel, configs }: EvaluationTotalRowProps) {
  // Resolve weights from config (slot 1..5), fall back to hardcoded CRITERIA_WEIGHTS.
  const resolveWeight = (slot: 1 | 2 | 3 | 4 | 5): number => {
    if (configs && configs.length > 0) {
      const cfg = configs.find(c => c.criteriaSlot === slot);
      if (cfg) return cfg.weight;
    }
    return CRITERIA_WEIGHTS[slot - 1];
  };

  // Resolve max-score from config (slot 1..5), fall back to 5.
  const resolveMaxScore = (slot: 1 | 2 | 3 | 4 | 5): number => {
    const cfg = configs?.find(c => c.criteriaSlot === slot);
    return cfg?.maxScore ?? 5;
  };

  const w = [1, 2, 3, 4, 5].map(s => resolveWeight(s as 1 | 2 | 3 | 4 | 5));
  const maxScores = [1, 2, 3, 4, 5].map(s => resolveMaxScore(s as 1 | 2 | 3 | 4 | 5));

  const totalScore =
    w[0] * (values.criteria1Rating ?? 0) +
    w[1] * (values.criteria2Rating ?? 0) +
    w[2] * (values.criteria3Rating ?? 0) +
    w[3] * (values.criteria4Rating ?? 0) +
    w[4] * (values.criteria5Rating ?? 0);

  const totalWeight = w.reduce((a, b) => a + b, 0);
  // Max attainable = Σ weightᵢ·maxScoreᵢ (≈ 5 when maxScore=5 and weights sum to 1).
  const maxTotal = w.reduce((sum, wi, i) => sum + wi * maxScores[i], 0) || 5;
  const pct = ((totalScore / maxTotal) * 100).toFixed(0);
  // Normalise to the 5-star scale so StarRating stays correct if maxScore changes.
  const starScore = (totalScore / maxTotal) * 5;

  return (
    <tr className="bg-gray-50 font-medium">
      <td className="px-3 py-2.5 text-sm text-gray-500 text-center" />
      <td className="px-3 py-2.5 text-sm text-gray-700">{totalLabel}</td>
      <td className="px-3 py-2.5 text-sm text-gray-700 text-center tabular-nums">
        {totalWeight.toFixed(2)}
      </td>
      <td className="px-3 py-2.5" />
      <td className="px-3 py-2.5 text-sm text-gray-700 text-center tabular-nums">
        {totalScore.toFixed(2)}
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-700">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
            {pct}%
          </span>
          <StarRating score={starScore} />
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ServiceQualityEvaluationDetailPage() {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const { i18n, t } = useTranslation('serviceQualityEvaluation');

  const { data: appraisal, isLoading: appraisalLoading, isError: appraisalError, refetch: refetchAppraisal } = useGetAppraisalById(appraisalId);
  const { data: header, isLoading: headerLoading, isError: headerError, refetch: refetchHeader } = useGetEvaluationHeader(appraisalId ?? '');
  const { data: evaluation, isLoading: evalLoading, isError: evalError, refetch: refetchEval } = useGetEvaluationByAppraisal(
    appraisalId ?? '',
  );

  // Load config once we know the bankingSegment from the header.
  const bankingSegment = header?.bankingSegment ?? undefined;
  const { data: configs } = useGetEvaluationConfig(bankingSegment);

  const { mutate: createEvaluation, isPending: isCreating } = useCreateEvaluation();
  const { mutate: updateEvaluation, isPending: isUpdating } = useUpdateEvaluation();

  const isSaving = isCreating || isUpdating;

  // Tracks which button was clicked so only that button shows the spinner.
  const [savingStatus, setSavingStatus] = useState<'Pending' | 'Completed' | null>(null);
  useEffect(() => {
    if (!isSaving) setSavingStatus(null);
  }, [isSaving]);

  const methods = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: defaultEvaluationValues,
  });

  const { reset, handleSubmit, register } = methods;

  // Detect runs only when we need a fresh suggestion: brand-new row, or a saved
  // row whose criteria2Rating hasn't been filled in yet (incl. the inconsistent
  // saved-state where autoDetected=true but rating=null — re-detect that too).
  const detectEnabled =
    evaluation !== undefined && (evaluation === null || evaluation.criteria2Rating == null);

  const {
    data: detect,
    isFetching: detectFetching,
    isError: detectError,
  } = useDetectDeliveryTime(appraisalId ?? '', detectEnabled);

  // One reset per appraisalId after BOTH evaluation and (if applicable) detect
  // have settled. Single source of truth — no setValue race with useWatch.
  const hydratedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!appraisalId) return;
    if (evaluation === undefined) return;
    if (detectEnabled && detectFetching) return;
    if (hydratedForRef.current === appraisalId) return;
    hydratedForRef.current = appraisalId;

    const base: EvaluationFormValues = evaluation
      ? {
          criteria1Rating: evaluation.criteria1Rating,
          criteria2Rating: evaluation.criteria2Rating,
          criteria2IsAutoDetected: evaluation.criteria2IsAutoDetected ?? false,
          criteria2DetectedDays: evaluation.criteria2DetectedDays ?? null,
          criteria2AutoLocked: evaluation.criteria2IsAutoDetected === true,
          criteria3Rating: evaluation.criteria3Rating,
          criteria4Rating: evaluation.criteria4Rating,
          criteria5Rating: evaluation.criteria5Rating,
          additionalComments: evaluation.additionalComments ?? null,
          note: evaluation.note ?? null,
          evaluationStatus: evaluation.evaluationStatus === 'Completed' ? 'Completed' : 'Pending',
        }
      : { ...defaultEvaluationValues };

    if (detectEnabled && !detectError && detect) {
      if (detect.suggestedRating != null) base.criteria2Rating = detect.suggestedRating;
      if (detect.detectedDays != null) base.criteria2DetectedDays = detect.detectedDays;
      base.criteria2IsAutoDetected = true;
      base.criteria2AutoLocked = true;
    } else if (detectEnabled && detectError) {
      base.criteria2AutoLocked = false;
    }

    reset(base);
  }, [appraisalId, evaluation, detect, detectEnabled, detectFetching, detectError, reset]);

  const watchedValues = useWatch({ control: methods.control }) as EvaluationFormValues;

  // Complete button is only enabled when every criterion has a rating selected.
  const canComplete =
    watchedValues.criteria1Rating != null &&
    watchedValues.criteria2Rating != null &&
    watchedValues.criteria3Rating != null &&
    watchedValues.criteria4Rating != null &&
    watchedValues.criteria5Rating != null;

  const submitWithStatus = (status: 'Pending' | 'Completed') =>
    handleSubmit(
      values => {
        const body = {
          appraisalId: appraisalId ?? '',
          evaluationStatus: status,
          criteria1Rating: values.criteria1Rating ?? null,
          criteria2Rating: values.criteria2Rating ?? null,
          criteria2IsAutoDetected: values.criteria2IsAutoDetected ?? false,
          criteria2DetectedDays: values.criteria2DetectedDays ?? null,
          criteria3Rating: values.criteria3Rating ?? null,
          criteria4Rating: values.criteria4Rating ?? null,
          criteria5Rating: values.criteria5Rating ?? null,
          additionalComments: values.additionalComments ?? null,
          note: values.note ?? null,
        };

        const successMessage = t(
          status === 'Completed' ? 'detail.success.completed' : 'detail.success.draftSaved',
        );
        const errorMessage = t(
          status === 'Completed' ? 'detail.errors.completeFailed' : 'detail.errors.saveFailed',
        );

        setSavingStatus(status);
        if (!evaluation?.id) {
          createEvaluation(body, {
            onSuccess: () => toast.success(successMessage),
            onError: () => toast.error(errorMessage),
          });
        } else {
          updateEvaluation(
            { evaluationId: evaluation.id, appraisalId: appraisalId ?? '', body },
            {
              onSuccess: () => toast.success(successMessage),
              onError: () => toast.error(errorMessage),
            },
          );
        }
      },
      // Surface silent Zod-resolver rejections so a stray validation error never
      // makes the button look broken.
      errors => {
        // eslint-disable-next-line no-console
        console.warn('[ServiceQualityEvaluation] form validation failed', errors);
        toast.error('Form has invalid fields — check the console for details.');
      },
    );

  // Push the appraisal number as an extra crumb so the layout's auto-built
  // breadcrumb gets the dynamic segment without us rendering a second bar.
  const setBreadcrumbExtras = useBreadcrumbExtrasStore(s => s.setExtras);
  // Resolve from any source that actually carries the appraisal number.
  // Do NOT fall back to appraisalId (the URL UUID) — it flashes "019e36f3-..." in
  // the breadcrumb on refresh before the real number arrives.
  const dynamicCrumb =
    evaluation?.appraisalNumber ?? appraisal?.appraisalNumber ?? header?.appraisalNumber;
  useEffect(() => {
    if (!dynamicCrumb || !appraisalId) return;
    setBreadcrumbExtras([
      {
        label: dynamicCrumb,
        href: `/standalone/service-quality-evaluation/${appraisalId}`,
      },
    ]);
    return () => setBreadcrumbExtras([]);
  }, [dynamicCrumb, appraisalId, setBreadcrumbExtras]);

  const isLoading =
    appraisalLoading || headerLoading || evalLoading || (detectEnabled && detectFetching);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon style="solid" name="spinner" className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  if (appraisalError || headerError || evalError) {
    const handleRetry = () => {
      if (appraisalError) refetchAppraisal();
      if (headerError) refetchHeader();
      if (evalError) refetchEval();
    };
    return <DataErrorState title="Failed to load evaluation" onRetry={handleRetry} />;
  }

  const appraisalNumber = evaluation?.appraisalNumber ?? appraisal?.appraisalNumber ?? appraisalId;
  const isCompleted = evaluation?.evaluationStatus === 'Completed';

  /**
   * Resolve the display label for a given criteria slot (1-based).
   * Uses config label (locale-aware) if available, else falls back to CRITERIA_LABELS.
   */
  const getCriteriaLabel = (slot: 1 | 2 | 3 | 4 | 5): string => {
    if (configs && configs.length > 0) {
      const cfg = configs.find(c => c.criteriaSlot === slot);
      if (cfg) {
        return i18n.language.startsWith('th') ? (cfg.labelTh || cfg.labelEn) : cfg.labelEn;
      }
    }
    return CRITERIA_LABELS[slot - 1];
  };

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col gap-4 pb-24">
        {/* Appraisal Report Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('detail.infoTitle')}</h3>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
            {/* Row 1 — identity & subject of evaluation */}
            <InfoRow label={t('detail.info.appraisalNumber')} value={header?.appraisalNumber ?? appraisalNumber ?? '—'} />
            <InfoRow label={t('detail.info.customerName')} value={header?.customerName ?? '—'} />
            <InfoRow label={t('detail.info.appraiserCompany')} value={header?.appraiserCompanyName ?? '—'} />
            <InfoRow label={t('detail.info.appraisalDepartment')} value={header?.departmentOfAppraisal ?? '—'} />
            {/* Row 2 — what was appraised & when */}
            <InfoRow label={t('detail.info.propertyType')} value={header?.collateralTypes ?? '—'} />
            <InfoRow label={t('detail.info.appraisalDate')} value={header?.inspectionDates ?? '—'} />
            <InfoRow
              label={t('detail.info.reportReceivedDate')}
              value={formatLocaleDate(header?.reportReceivedDate, i18n.language)}
            />
          </dl>
        </div>

        {/* Rating Guidelines — pass configs so descriptions are locale-aware */}
        <RatingGuidelinesTable configs={configs} />

        {/* Evaluation Form */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Evaluation Criteria</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-12" />
                <col className="w-96" />
                <col className="w-20" />
                <col className="w-52" />
                <col className="w-20" />
                <col />
              </colgroup>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-center font-medium text-gray-600 px-3 py-2.5 text-xs">
                    No
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 text-xs">
                    Criteria for consideration
                  </th>
                  <th className="text-center font-medium text-gray-600 px-3 py-2.5 text-xs">
                    Weight
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 text-xs">
                    Rating
                  </th>
                  <th className="text-center font-medium text-gray-600 px-3 py-2.5 text-xs">
                    Score
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 text-xs">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {([1, 2, 3, 4, 5] as const).map(slot => {
                  const index = (slot - 1) as 0 | 1 | 2 | 3 | 4;
                  const cfg = configs?.find(c => c.criteriaSlot === slot);
                  return (
                    <EvaluationCriteriaRow
                      key={slot}
                      index={index}
                      criteriaLabel={getCriteriaLabel(slot)}
                      disabled={isCompleted}
                      forceDisabled={index === 1 ? (watchedValues.criteria2AutoLocked ?? false) : false}
                      deliveryAutoDetected={index === 1 ? (watchedValues.criteria2IsAutoDetected ?? false) : false}
                      deliveryDetectedDays={index === 1 ? (watchedValues.criteria2DetectedDays ?? null) : null}
                      weight={cfg?.weight}
                      guidance={cfg?.guidance}
                    />
                  );
                })}
                <EvaluationTotalRow values={watchedValues} totalLabel="Total" configs={configs} />
              </tbody>
            </table>
          </div>

          {/* Text areas */}
          <div className="p-4 border-t border-gray-200 flex flex-col gap-4">
            <Textarea
              label={t('detail.comments.additionalLabel')}
              placeholder={t('detail.comments.additionalPlaceholder')}
              rows={4}
              maxLength={4000}
              showCharCount
              disabled={isCompleted}
              value={watchedValues.additionalComments ?? ''}
              {...register('additionalComments')}
            />
            <Textarea
              label={t('detail.comments.notesLabel')}
              placeholder={t('detail.comments.notesPlaceholder')}
              rows={4}
              maxLength={4000}
              showCharCount
              disabled={isCompleted}
              value={watchedValues.note ?? ''}
              {...register('note')}
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <ActionBar>
        <ActionBar.Left>
          <CancelButton fallbackPath="/standalone/service-quality-evaluation" />
        </ActionBar.Left>
        {!isCompleted && (
          <ActionBar.Right>
            <Button
              variant="ghost"
              type="button"
              onClick={submitWithStatus('Pending')}
              isLoading={savingStatus === 'Pending'}
              disabled={isSaving}
              leftIcon={<Icon name="floppy-disk" style="regular" className="size-4" />}
            >
              {t('detail.actions.saveDraft')}
            </Button>
            <Button
              type="button"
              onClick={submitWithStatus('Completed')}
              isLoading={savingStatus === 'Completed'}
              disabled={isSaving || !canComplete}
              title={!canComplete ? t('detail.errors.allRatingsRequired') : undefined}
              leftIcon={<Icon name="check" style="solid" className="size-4" />}
            >
              {t('detail.actions.complete')}
            </Button>
          </ActionBar.Right>
        )}
      </ActionBar>
    </FormProvider>
  );
}

export default ServiceQualityEvaluationDetailPage;
