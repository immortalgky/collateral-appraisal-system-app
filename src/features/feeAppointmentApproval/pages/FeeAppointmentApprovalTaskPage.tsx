import '@/features/feeAppointmentApproval/i18n';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import {
  useWorkflowInstanceId,
  useIsTaskOwner,
} from '@/features/appraisal/context/AppraisalContext';
import {
  useGetFeeAppointmentApprovalByWorkflowInstance,
  useResolveFeeAppointmentApproval,
} from '../api/feeAppointmentApproval';
import type { FeeAppointmentApprovalLine } from '../types/feeAppointmentApproval';

// ---- Helpers ----

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd/MM/yyyy HH:mm');
  } catch {
    return d;
  }
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return '—';
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ---- Decision block component ----

type Decision = 'approve' | 'reject' | '';

interface DecisionBlockProps {
  title: string;
  icon: string;
  iconColor: string;
  children: ReactNode;
  decision: Decision;
  reason: string;
  onDecisionChange: (d: Decision) => void;
  onReasonChange: (r: string) => void;
  reasonError?: string;
  disabled?: boolean;
}

function DecisionBlock({
  title,
  icon,
  iconColor,
  children,
  decision,
  reason,
  onDecisionChange,
  onReasonChange,
  reasonError,
  disabled,
}: DecisionBlockProps) {
  const { t } = useTranslation('feeAppointmentApproval');
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center gap-2 ${iconColor} border-b border-gray-200`}>
        <Icon name={icon} style="solid" className="size-4 text-white" />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>

      {/* Content */}
      <div className="p-4 bg-white">
        {children}

        {/* Approve / Reject buttons */}
        {!disabled && (
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => onDecisionChange(decision === 'approve' ? '' : 'approve')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                decision === 'approve'
                  ? 'bg-success border-success text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-success/5 hover:border-success/60'
              }`}
            >
              <Icon name="check" style="solid" className="size-4" />
              {t('decisions.approve')}
            </button>
            <button
              type="button"
              onClick={() => onDecisionChange(decision === 'reject' ? '' : 'reject')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                decision === 'reject'
                  ? 'bg-danger border-danger text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-danger/5 hover:border-danger/60'
              }`}
            >
              <Icon name="xmark" style="solid" className="size-4" />
              {t('decisions.reject')}
            </button>
          </div>
        )}

        {/* Reason textarea — shown when rejecting */}
        {decision === 'reject' && !disabled && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('decisions.reasonLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
              rows={2}
              placeholder={t('decisions.reasonPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
            />
            {reasonError && <p className="text-xs text-danger mt-1">{reasonError}</p>}
          </div>
        )}

        {/* Read-only decision badge (when disabled / already resolved) */}
        {disabled && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                decision === 'approve'
                  ? 'bg-success/10 text-success'
                  : decision === 'reject'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {decision === 'approve'
                ? t('decisions.approved')
                : decision === 'reject'
                  ? t('decisions.rejected')
                  : t('decisions.pending')}
            </span>
            {reason && (
              <span className="text-xs text-gray-500 italic">
                {t('decisions.reasonPrefix')} {reason}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Appointment block content ----

interface AppointmentBlockContentProps {
  line: FeeAppointmentApprovalLine;
}

function AppointmentBlockContent({ line }: AppointmentBlockContentProps) {
  const { t } = useTranslation('feeAppointmentApproval');
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-orange-100 flex items-center justify-center">
          <Icon name="calendar-clock" style="solid" className="size-4 text-orange-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('appointment.newDate')}</p>
          <p className="text-sm font-semibold text-gray-800">
            {line.newDate ? formatDate(line.newDate) : '—'}
          </p>
        </div>
      </div>
      {(line.rescheduleCount ?? 0) > 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <Icon name="rotate" style="solid" className="size-3" />
          {t('appointment.rescheduleCount', { count: line.rescheduleCount })}
        </p>
      )}
    </div>
  );
}

// ---- Fee group block content ----

interface FeeGroupBlockContentProps {
  feeLines: FeeAppointmentApprovalLine[];
}

function FeeGroupBlockContent({ feeLines }: FeeGroupBlockContentProps) {
  const { t } = useTranslation('feeAppointmentApproval');
  const total = feeLines.reduce((sum, l) => sum + (l.feeAmount ?? 0), 0);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                {t('fee.columns.code')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                {t('fee.columns.description')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                {t('fee.columns.amount')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {feeLines.map(line => (
              <tr key={line.id}>
                <td className="px-3 py-2.5 text-gray-600">{line.feeCode ?? '—'}</td>
                <td className="px-3 py-2.5 text-gray-700">{line.feeDescription ?? '—'}</td>
                <td className="px-3 py-2.5 text-right text-gray-700">
                  {formatCurrency(line.feeAmount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-emerald-50">
              <td colSpan={2} className="px-3 py-2.5 text-sm font-semibold text-emerald-800">
                {t('fee.total')}
              </td>
              <td className="px-3 py-2.5 text-right text-base font-bold text-emerald-700">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-gray-400">{t('fee.groupHint')}</p>
    </div>
  );
}

// ---- Main Page ----

function FeeAppointmentApprovalTaskPage() {
  const { t } = useTranslation(['feeAppointmentApproval', 'common']);
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const workflowInstanceId = useWorkflowInstanceId();
  const isTaskOwner = useIsTaskOwner();

  const { data: approval, isLoading, isError } = useGetFeeAppointmentApprovalByWorkflowInstance(
    workflowInstanceId,
  );
  const resolveMutation = useResolveFeeAppointmentApproval();

  // Per-component decision state (controlled, not RHF — simpler for this two-decision UI)
  const [appointmentDecision, setAppointmentDecision] = useState<Decision>('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [feeDecision, setFeeDecision] = useState<Decision>('');
  const [feeReason, setFeeReason] = useState('');
  const [appointmentReasonError, setAppointmentReasonError] = useState('');
  const [feeReasonError, setFeeReasonError] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
        <Icon name="spinner" style="solid" className="size-4 animate-spin" />
        {t('page.loading')}
      </div>
    );
  }

  if (isError || !approval) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="size-10 text-red-400" />
        <p className="text-gray-600 font-medium">{t('page.loadError')}</p>
        <p className="text-sm text-gray-400">{t('page.loadErrorDetail')}</p>
      </div>
    );
  }

  const appointmentLines = approval.lines.filter(l => l.lineType === 'Appointment');
  const feeLines = approval.lines.filter(l => l.lineType === 'Fee');
  const hasAppointment = appointmentLines.length > 0;
  const hasFee = feeLines.length > 0;

  const isResolved = approval.status !== 'Open';

  // Determine current resolved decisions from line statuses (read-only mode)
  const appointmentLineStatus = appointmentLines[0]?.lineStatus;
  const feeLineStatus = feeLines[0]?.lineStatus;

  const resolvedAppointmentDecision: Decision =
    appointmentLineStatus === 'Approved'
      ? 'approve'
      : appointmentLineStatus === 'Rejected'
        ? 'reject'
        : '';
  const resolvedFeeDecision: Decision =
    feeLineStatus === 'Approved'
      ? 'approve'
      : feeLineStatus === 'Rejected'
        ? 'reject'
        : '';

  const resolvedAppointmentReason = appointmentLines[0]?.decisionReason ?? '';
  const resolvedFeeReason = feeLines[0]?.decisionReason ?? '';

  // Validate before opening confirm dialog
  const validateAndConfirm = () => {
    let valid = true;
    if (hasAppointment && !appointmentDecision) {
      // No error shown for "not yet selected" — just block submit
      valid = false;
    }
    if (hasAppointment && appointmentDecision === 'reject' && !appointmentReason.trim()) {
      setAppointmentReasonError(t('validation.reasonRequired'));
      valid = false;
    } else {
      setAppointmentReasonError('');
    }
    if (hasFee && !feeDecision) {
      valid = false;
    }
    if (hasFee && feeDecision === 'reject' && !feeReason.trim()) {
      setFeeReasonError(t('validation.reasonRequired'));
      valid = false;
    } else {
      setFeeReasonError('');
    }
    if (valid) setIsConfirmOpen(true);
  };

  const canSubmit =
    isTaskOwner &&
    !isResolved &&
    (!hasAppointment || !!appointmentDecision) &&
    (!hasFee || !!feeDecision);

  const handleSubmit = () => {
    if (!approval) return;

    const body: {
      appointmentDecision?: 'approve' | 'reject';
      appointmentReason?: string;
      feeDecision?: 'approve' | 'reject';
      feeReason?: string;
    } = {};

    if (hasAppointment && appointmentDecision) {
      body.appointmentDecision = appointmentDecision as 'approve' | 'reject';
      if (appointmentDecision === 'reject') body.appointmentReason = appointmentReason;
    }
    if (hasFee && feeDecision) {
      body.feeDecision = feeDecision as 'approve' | 'reject';
      if (feeDecision === 'reject') body.feeReason = feeReason;
    }

    resolveMutation.mutate(
      { id: approval.id, body },
      {
        onSuccess: () => {
          setIsConfirmOpen(false);
          toast.success(t('toasts.resolveSuccess'));
          navigate('/tasks?activityId=fee-appointment-approval');
        },
        onError: (error: unknown) => {
          setIsConfirmOpen(false);
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 409) {
            toast.error(t('toasts.alreadyResolved'));
            navigate('/tasks?activityId=fee-appointment-approval');
          } else {
            const apiError = error as { response?: { data?: { detail?: string } }; message?: string };
            const message =
              apiError?.response?.data?.detail ?? apiError?.message ?? t('toasts.resolveFailed');
            toast.error(message);
          }
        },
      },
    );
  };

  const parentHref = `/tasks/${taskId}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Back-link breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to={parentHref}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
        >
          <Icon name="arrow-left" style="solid" className="size-3.5" />
          {t('page.back')}
        </Link>
      </div>

      {/* Header card */}
      <FormCard title={t('page.title')} icon="clipboard-check" iconColor="primary">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-6">
          <Icon name="circle-info" style="solid" className="size-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-800">{t('page.infoTitle')}</p>
            <p className="text-xs text-indigo-600 mt-0.5">{t('page.infoBody')}</p>
            <p className="text-xs text-indigo-400 mt-1">
              {t('page.raisedAt', { date: formatDate(approval.raisedAt) })}
            </p>
          </div>
        </div>

        {/* Resolved banner */}
        {isResolved && (
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-green-50 border border-green-100">
            <Icon name="circle-check" style="solid" className="size-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">{t('page.alreadyResolved')}</p>
          </div>
        )}

        {/* Decision blocks */}
        <div className="flex flex-col gap-4">
          {/* Appointment decision block */}
          {hasAppointment && (
            <DecisionBlock
              title={t('appointment.blockTitle')}
              icon="calendar-clock"
              iconColor="bg-orange-500"
              decision={isResolved ? resolvedAppointmentDecision : appointmentDecision}
              reason={isResolved ? resolvedAppointmentReason : appointmentReason}
              onDecisionChange={setAppointmentDecision}
              onReasonChange={v => { setAppointmentReason(v); setAppointmentReasonError(''); }}
              reasonError={appointmentReasonError}
              disabled={isResolved || !isTaskOwner}
            >
              <AppointmentBlockContent line={appointmentLines[0]} />
            </DecisionBlock>
          )}

          {/* Fee group decision block */}
          {hasFee && (
            <DecisionBlock
              title={t('fee.blockTitle')}
              icon="file-invoice-dollar"
              iconColor="bg-emerald-600"
              decision={isResolved ? resolvedFeeDecision : feeDecision}
              reason={isResolved ? resolvedFeeReason : feeReason}
              onDecisionChange={setFeeDecision}
              onReasonChange={v => { setFeeReason(v); setFeeReasonError(''); }}
              reasonError={feeReasonError}
              disabled={isResolved || !isTaskOwner}
            >
              <FeeGroupBlockContent feeLines={feeLines} />
            </DecisionBlock>
          )}
        </div>

        {/* Submit button */}
        {isTaskOwner && !isResolved && (
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end items-center gap-3">
            {(!hasAppointment || !appointmentDecision) || (!hasFee || !feeDecision) ? (
              <p className="text-xs text-gray-400">{t('page.decisionHint')}</p>
            ) : null}
            <button
              type="button"
              disabled={!canSubmit || resolveMutation.isPending}
              onClick={validateAndConfirm}
              className="px-5 py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {resolveMutation.isPending && (
                <Icon name="spinner" style="solid" className="size-4 animate-spin" />
              )}
              <Icon name="paper-plane" style="solid" className="size-4" />
              {t('page.submitDecision')}
            </button>
          </div>
        )}
      </FormCard>

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleSubmit}
        title={t('page.confirmTitle')}
        message={t('page.confirmMessage')}
        confirmText={t('page.confirmSubmit')}
        cancelText={t('common:actions.cancel')}
        variant="primary"
        isLoading={resolveMutation.isPending}
      />
    </div>
  );
}

export default FeeAppointmentApprovalTaskPage;
