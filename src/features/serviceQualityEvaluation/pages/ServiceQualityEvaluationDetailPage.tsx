import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import Breadcrumb from '@shared/components/Breadcrumb';
import Button from '@shared/components/Button';
import ActionBar from '@shared/components/ActionBar';
import Icon from '@shared/components/Icon';
import { Textarea } from '@shared/components/inputs';
import { formatLocaleDate } from '@shared/utils/dateUtils';
import { useGetAppraisalById } from '@/features/appraisal/api/appraisal';
import {
  useGetEvaluationByAppraisal,
  useCreateEvaluation,
  useUpdateEvaluation,
} from '../api';
import {
  evaluationSchema,
  defaultEvaluationValues,
  CRITERIA_LABELS,
  CRITERIA_WEIGHTS,
} from '../schemas/evaluation';
import type { EvaluationFormValues } from '../schemas/evaluation';
import RatingGuidelinesTable from '../components/RatingGuidelinesTable';
import EvaluationCriteriaRow from '../components/EvaluationCriteriaRow';

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

function EvaluationTotalRow({ values }: { values: EvaluationFormValues }) {
  const totalScore =
    CRITERIA_WEIGHTS[0] * (values.criteria1Rating ?? 1) +
    CRITERIA_WEIGHTS[1] * (values.criteria2Rating ?? 1) +
    CRITERIA_WEIGHTS[2] * (values.criteria3Rating ?? 1) +
    CRITERIA_WEIGHTS[3] * (values.criteria4Rating ?? 1) +
    CRITERIA_WEIGHTS[4] * (values.criteria5Rating ?? 1);

  const totalWeight = CRITERIA_WEIGHTS.reduce((a, b) => a + b, 0);
  const pct = ((totalScore / 4) * 100).toFixed(0);

  return (
    <tr className="bg-gray-50 font-medium">
      <td className="px-3 py-2.5 text-sm text-gray-500 text-center" />
      <td className="px-3 py-2.5 text-sm text-gray-700">Total</td>
      <td className="px-3 py-2.5 text-sm text-gray-700 text-center tabular-nums">
        {totalWeight.toFixed(2)}
      </td>
      <td className="px-3 py-2.5" />
      <td className="px-3 py-2.5 text-sm text-gray-700 text-center tabular-nums">
        {totalScore.toFixed(2)}
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-700">
        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
          {pct}%
        </span>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ServiceQualityEvaluationDetailPage() {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const { data: appraisal, isLoading: appraisalLoading } = useGetAppraisalById(appraisalId);
  const { data: evaluation, isLoading: evalLoading } = useGetEvaluationByAppraisal(
    appraisalId ?? '',
  );

  const { mutate: createEvaluation, isPending: isCreating } = useCreateEvaluation();
  const { mutate: updateEvaluation, isPending: isUpdating } = useUpdateEvaluation();

  const isSaving = isCreating || isUpdating;

  const methods = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: defaultEvaluationValues,
  });

  const { reset, handleSubmit, register } = methods;

  // Populate form when evaluation data arrives
  useEffect(() => {
    if (evaluation === undefined) return;
    if (evaluation === null) {
      reset(defaultEvaluationValues);
    } else {
      reset({
        criteria1Rating: evaluation.criteria1Rating,
        criteria1Description: evaluation.criteria1Description,
        criteria2Rating: evaluation.criteria2Rating,
        criteria2IsAutoDetected: evaluation.criteria2IsAutoDetected,
        criteria2DetectedDays: evaluation.criteria2DetectedDays,
        criteria2Description: evaluation.criteria2Description,
        criteria3Rating: evaluation.criteria3Rating,
        criteria3Description: evaluation.criteria3Description,
        criteria4Rating: evaluation.criteria4Rating,
        criteria4Description: evaluation.criteria4Description,
        criteria5Rating: evaluation.criteria5Rating,
        criteria5Description: evaluation.criteria5Description,
        additionalComments: evaluation.additionalComments,
        note: evaluation.note,
        evaluationStatus: (evaluation.evaluationStatus as 'Draft' | 'Completed') ?? 'Draft',
      });
    }
  }, [evaluation, reset]);

  const watchedValues = useWatch({ control: methods.control }) as EvaluationFormValues;

  const submitWithStatus = (status: 'Draft' | 'Completed') =>
    handleSubmit(values => {
      const body = {
        appraisalId: appraisalId ?? '',
        evaluationStatus: status,
        criteria1Rating: values.criteria1Rating,
        criteria1Description: values.criteria1Description ?? null,
        criteria2Rating: values.criteria2Rating,
        criteria2IsAutoDetected: values.criteria2IsAutoDetected,
        criteria2DetectedDays: values.criteria2DetectedDays ?? null,
        criteria2Description: values.criteria2Description ?? null,
        criteria3Rating: values.criteria3Rating,
        criteria3Description: values.criteria3Description ?? null,
        criteria4Rating: values.criteria4Rating,
        criteria4Description: values.criteria4Description ?? null,
        criteria5Rating: values.criteria5Rating,
        criteria5Description: values.criteria5Description ?? null,
        additionalComments: values.additionalComments ?? null,
        note: values.note ?? null,
      };

      if (!evaluation?.id) {
        createEvaluation(body);
      } else {
        updateEvaluation({
          evaluationId: evaluation.id,
          appraisalId: appraisalId ?? '',
          body,
        });
      }
    });

  const isLoading = appraisalLoading || evalLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon style="solid" name="spinner" className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  const appraisalNumber = evaluation?.appraisalNumber ?? appraisal?.appraisalNumber ?? appraisalId;
  const isCompleted = evaluation?.evaluationStatus === 'Completed';

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col gap-4 pb-24">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Service Quality Evaluation', href: '/standalone/service-quality-evaluation' },
            {
              label: appraisalNumber ?? '',
              href: `/standalone/service-quality-evaluation/${appraisalId}`,
            },
          ]}
        />

        {/* Appraisal Info Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Appraisal Information</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoRow label="Appraisal Report No" value={appraisalNumber ?? '—'} />
            <InfoRow
              label="Status"
              value={appraisal?.status ?? evaluation?.evaluationStatus ?? '—'}
            />
            <InfoRow
              label="Created Date"
              value={formatLocaleDate(appraisal?.createdOn, i18n.language)}
            />
            <InfoRow label="Appraisal Type" value={appraisal?.appraisalType ?? '—'} />
          </dl>
        </div>

        {/* Rating Guidelines */}
        <RatingGuidelinesTable />

        {/* Evaluation Form */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Evaluation Criteria</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-center font-medium text-gray-600 px-3 py-2.5 text-xs w-8">
                    No
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 text-xs">
                    Criteria for consideration
                  </th>
                  <th className="text-center font-medium text-gray-600 px-3 py-2.5 text-xs w-16">
                    Weight
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 text-xs w-44">
                    Rating
                  </th>
                  <th className="text-center font-medium text-gray-600 px-3 py-2.5 text-xs w-16">
                    Score
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 text-xs">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA_LABELS.map((label, i) => (
                  <EvaluationCriteriaRow
                    key={i}
                    index={i as 0 | 1 | 2 | 3 | 4}
                    criteriaLabel={label}
                    appraisalId={appraisalId ?? ''}
                    disabled={isCompleted}
                  />
                ))}
                <EvaluationTotalRow values={watchedValues} />
              </tbody>
            </table>
          </div>

          {/* Text areas */}
          <div className="p-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
              label="Additional Comments from the Evaluators"
              placeholder="Enter additional comments..."
              rows={4}
              disabled={isCompleted}
              {...register('additionalComments')}
            />
            <Textarea
              label="Note"
              placeholder="Enter notes..."
              rows={4}
              disabled={isCompleted}
              {...register('note')}
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <ActionBar>
        <ActionBar.Left>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/standalone/service-quality-evaluation')}
          >
            Cancel
          </Button>
        </ActionBar.Left>
        {!isCompleted && (
          <ActionBar.Right>
            <Button
              variant="outline"
              size="sm"
              onClick={submitWithStatus('Draft')}
              isLoading={isSaving}
              disabled={isSaving}
            >
              <Icon name="floppy-disk" style="solid" className="size-3.5 mr-1.5" />
              Save
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submitWithStatus('Completed')}
              isLoading={isSaving}
              disabled={isSaving}
            >
              <Icon name="check" style="solid" className="size-3.5 mr-1.5" />
              Complete
            </Button>
          </ActionBar.Right>
        )}
      </ActionBar>
    </FormProvider>
  );
}

export default ServiceQualityEvaluationDetailPage;
