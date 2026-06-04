import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAppraisalContext } from '../context/AppraisalContext';
import { useAuthStore } from '@/features/auth/store';
import AppointmentInfoCard from '../components/AppointmentInfoCard';
import AppointmentHistoryDrawer from '../components/AppointmentHistoryDrawer';
import RescheduleModal from '../components/RescheduleModal';
import FeeInformationSection, { BANK_ABSORB_FEE_TYPES } from '../components/FeeInformationSection';
import PaymentInformationSection from '../components/PaymentInformationSection';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import {
  useCancelAppointment,
  useCreateAppointment,
  useGetAppointment,
  useRescheduleAppointment,
} from '../api/appointment';
import { useGetAppointmentHistory } from '../api/appointmentHistory';
import {
  useAddFeeItem,
  useApproveFeeItem,
  useGetAppraisalFees,
  useRecordPayment,
  useRejectFeeItem,
  useRemoveFeeItem,
  useRemovePayment,
  useUpdateAppraisalFee,
  useUpdateConstructionInspectionFee,
  useUpdateFeeItem,
  useUpdatePayment,
} from '../api/fee';
import { useSubmitFeeAppointmentApproval } from '../api/feeAppointmentApprovalSubmit';
import { deriveFeeApprovalState, buildApprovalSummaryParts } from '../utils/feeApprovalState';

/**
 * Appointment & Fee page for the appraisal workflow.
 * Inline edits persist immediately; the server decides whether they need approval.
 * A banner + per-section badges show when approval is pending.
 * A "Submit for Approval" button in the footer triggers the approval request.
 */
export default function AppointmentAndFeePage() {
  const { t } = useTranslation(['appraisal', 'common']);
  const readOnly = usePageReadOnly();
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelAppointmentModalOpen, setIsCancelAppointmentModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId ?? '';
  const currentUser = useAuthStore(state => state.user);

  // API hooks - Appointments
  const { data: appointment = null } = useGetAppointment(appraisalId);
  const { data: historyEvents = [] } = useGetAppointmentHistory(appraisalId);

  // API hooks - Fees
  const { data: fees = [] } = useGetAppraisalFees(appraisalId);
  const addFeeItem = useAddFeeItem();
  const updateFeeItem = useUpdateFeeItem();
  const removeFeeItem = useRemoveFeeItem();
  const recordPayment = useRecordPayment();
  const updatePayment = useUpdatePayment();
  const removePayment = useRemovePayment();
  const approveFeeItem = useApproveFeeItem();
  const rejectFeeItem = useRejectFeeItem();
  const updateAppraisalFee = useUpdateAppraisalFee();
  const updateConstructionInspectionFee = useUpdateConstructionInspectionFee();

  const createAppointment = useCreateAppointment();
  const rescheduleAppointment = useRescheduleAppointment();
  const cancelAppointment = useCancelAppointment();

  // Submit-for-approval hook
  const submitApproval = useSubmitFeeAppointmentApproval(appraisalId);

  // Get the first fee record
  const currentFee = fees.length > 0 ? fees[0] : null;


  const isNewAppointment = !appointment;

  // Real assignment id — present on both appointment and fee DTOs (schema-typed field).
  // Prefer appointment; fall back to the fee record; undefined when neither is loaded yet.
  const assignmentId = appointment?.assignmentId ?? currentFee?.assignmentId;

  // ---- Approval state derivation ----
  const approvalState = deriveFeeApprovalState(appointment, currentFee?.items ?? []);
  const { hasDraft, hasSubmitted } = approvalState;

  // Summary string for the submit button label
  const summaryText = buildApprovalSummaryParts(approvalState, {
    dateLabel: t('approval.summary.dateChange'),
    feeLabel: (count) => t('approval.summary.fees', { count }),
  });

  // ---- Handlers ----
  const handleReschedule = async (data: {
    dateTime: string;
    location: string;
    reason?: string;
  }) => {
    try {
      if (isNewAppointment) {
        await createAppointment.mutateAsync({
          appraisalId,
          assignmentId: appraisal?.appraisalId ?? '',
          appointmentDateTime: data.dateTime,
          appointedBy: currentUser?.username ?? '',
          locationDetail: data.location,
          contactPerson: null,
          contactPhone: null,
        });
        toast.success(t('appointment.toasts.scheduled'));
      } else {
        await rescheduleAppointment.mutateAsync({
          appraisalId,
          appointmentId: appointment!.id,
          changedBy: currentUser?.username ?? '',
          newDateTime: data.dateTime,
          reason: data.reason || null,
        });
        toast.success(t('appointment.toasts.rescheduled'));
      }
      setIsRescheduleModalOpen(false);
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('appointment.toasts.scheduleFailed'));
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointment) return;
    try {
      await cancelAppointment.mutateAsync({
        appraisalId,
        appointmentId: appointment.id,
        changedBy: currentUser?.username ?? '',
        reason: null,
      });
      setIsCancelAppointmentModalOpen(false);
      toast.success(t('appointment.toasts.cancelled'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('appointment.toasts.cancelFailed'));
    }
  };

  const handleApproveFeeItem = async (feeId: string, itemId: string) => {
    try {
      await approveFeeItem.mutateAsync({
        appraisalId,
        feeId,
        itemId,
        approvedBy: currentUser?.username ?? '',
      });
      toast.success(t('fee.toasts.feeApproved'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeApproveFailed'));
    }
  };

  const handleRejectFeeItem = async (feeId: string, itemId: string, reason: string) => {
    try {
      await rejectFeeItem.mutateAsync({
        appraisalId,
        feeId,
        itemId,
        rejectedBy: currentUser?.username ?? '',
        reason: reason || 'Rejected',
      });
      toast.success(t('fee.toasts.feeRejected'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeRejectFailed'));
    }
  };

  const handleUpdateFeePaymentType = async (value: string) => {
    if (!currentFee) return;
    try {
      await updateAppraisalFee.mutateAsync({
        appraisalId,
        feeId: currentFee.id ?? '',
        feePaymentType: value,
        bankAbsorbAmount: BANK_ABSORB_FEE_TYPES.includes(value)
          ? (currentFee.bankAbsorbAmount ?? 0)
          : 0,
      });
      toast.success(t('fee.toasts.feeTypeUpdated'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeTypeUpdateFailed'));
    }
  };

  const handleUpdateBankAbsorbAmount = async (amount: number) => {
    if (!currentFee) return;
    await updateAppraisalFee.mutateAsync({
      appraisalId,
      feeId: currentFee.id ?? '',
      feePaymentType: currentFee.feePaymentType ?? '',
      bankAbsorbAmount: amount,
    });
  };

  const handleAddFeeItem = async (data: {
    feeCode: string;
    feeDescription: string;
    feeAmount: number;
  }) => {
    if (!currentFee) return;
    await addFeeItem.mutateAsync({
      appraisalId,
      feeId: currentFee.id ?? '',
      ...data,
    });
  };

  const handleUpdateFeeItem = async (
    feeId: string,
    feeItemId: string,
    data: { feeCode: string; feeDescription: string; feeAmount: number },
  ) => {
    await updateFeeItem.mutateAsync({
      appraisalId,
      feeId,
      feeItemId,
      ...data,
    });
  };

  const handleRemoveFeeItem = async (feeId: string, feeItemId: string) => {
    await removeFeeItem.mutateAsync({
      appraisalId,
      feeId,
      feeItemId,
    });
  };

  const handleRecordPayment = async (data: {
    paymentAmount: number;
    paymentDate: string;
    paymentMethod?: string;
    paymentReference?: string;
    remarks?: string;
  }) => {
    if (!currentFee) return;
    try {
      await recordPayment.mutateAsync({
        appraisalId,
        feeId: currentFee.id ?? '',
        paymentAmount: data.paymentAmount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod || null,
        paymentReference: data.paymentReference || null,
        remarks: data.remarks || null,
      });
      toast.success(t('payment.toasts.paymentRecorded'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('payment.toasts.paymentRecordFailed'));
    }
  };

  const handleUpdatePayment = async (
    paymentId: string,
    data: { paymentAmount: number; paymentDate: string },
  ) => {
    if (!currentFee) return;
    try {
      await updatePayment.mutateAsync({
        appraisalId,
        feeId: currentFee.id ?? '',
        paymentId,
        ...data,
      });
      toast.success(t('payment.toasts.paymentUpdated'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('payment.toasts.paymentUpdateFailed'));
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!currentFee) return;
    try {
      await removePayment.mutateAsync({
        appraisalId,
        feeId: currentFee.id ?? '',
        paymentId,
      });
      toast.success(t('payment.toasts.paymentDeleted'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('payment.toasts.paymentDeleteFailed'));
    }
  };

  const handleUpdateConstructionInspectionFee = async (amount: number | null) => {
    if (!currentFee) return;
    await updateConstructionInspectionFee.mutateAsync({
      appraisalId,
      feeId: currentFee.id!,
      amount,
    });
  };

  const handleSubmitApproval = () => {
    if (!assignmentId) return;
    submitApproval.mutate({ assignmentId });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Main Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-6 pb-6 pr-4">

          {/* Global approval banner */}
          {hasDraft && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-800">
              <Icon name="triangle-exclamation" style="solid" className="size-4 mt-0.5 shrink-0 text-amber-600" />
              <span className="text-sm">{t('approval.banner.needsApproval')}</span>
            </div>
          )}
          {hasSubmitted && !hasDraft && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-300 text-blue-800">
              <Icon name="clock" style="solid" className="size-4 mt-0.5 shrink-0 text-blue-600" />
              <span className="text-sm">{t('approval.banner.awaiting')}</span>
            </div>
          )}

          {/* Appointment Information Section */}
          <AppointmentInfoCard
            appointment={appointment}
            onReschedule={() => !readOnly && setIsRescheduleModalOpen(true)}
            onCancel={() => !readOnly && setIsCancelAppointmentModalOpen(true)}
            approvalDraft={approvalState.draftDateChange}
            approvalSubmitted={approvalState.submittedDateChange}
            onViewHistory={() => setIsHistoryDrawerOpen(true)}
            historyEventCount={historyEvents.length}
          />

          {/* Divider */}
          <div className="border-b border-gray-200" />

          {/* Fee and Payment Section - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
            {/* Fee Information (Left Column) */}
            <FeeInformationSection
              items={currentFee?.items ?? []}
              vatRate={currentFee?.vatRate}
              feePaymentType={(currentFee as any)?.feePaymentType ?? null}
              onUpdateFeePaymentType={handleUpdateFeePaymentType}
              onAddFeeItem={handleAddFeeItem}
              onUpdateFeeItem={handleUpdateFeeItem}
              onRemoveFeeItem={handleRemoveFeeItem}
              onApproveFeeItem={handleApproveFeeItem}
              onRejectFeeItem={handleRejectFeeItem}
              isFeePaymentTypeUpdating={updateAppraisalFee.isPending}
              editLocked={hasSubmitted}
              showConstructionInspectionFee={currentFee?.hasBuildingUnderConstruction ?? false}
              constructionInspectionFeeAmount={currentFee?.constructionInspectionFeeAmount ?? null}
              onUpdateConstructionInspectionFee={handleUpdateConstructionInspectionFee}
              isConstructionInspectionFeeUpdating={updateConstructionInspectionFee.isPending}
              totalFeePaid={currentFee?.totalPaidAmount ?? 0}
              bankAbsorbAmount={currentFee?.bankAbsorbAmount ?? null}
              totalFeeAfterVAT={currentFee?.totalFeeAfterVAT ?? undefined}
              onUpdateBankAbsorbAmount={handleUpdateBankAbsorbAmount}
              isAbsorbAmountUpdating={updateAppraisalFee.isPending}
            />

            {/* Payment Information (Right Column) */}
            <PaymentInformationSection
              items={currentFee?.items ?? []}
              fee={currentFee}
              onRecordPayment={handleRecordPayment}
              onUpdatePayment={handleUpdatePayment}
              onRemovePayment={handleRemovePayment}
              requestedAt={appraisal?.requestedAt}
              isPaymentPending={
                recordPayment.isPending || updatePayment.isPending || removePayment.isPending
              }
            />
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 pr-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>

          {/* Submit for Approval button — shown when there are unsubmitted draft items */}
          {hasDraft && !readOnly && (
            <Button
              variant="primary"
              type="button"
              onClick={handleSubmitApproval}
              disabled={submitApproval.isPending || !assignmentId}
              isLoading={submitApproval.isPending}
              leftIcon={<Icon name="paper-plane" style="solid" className="size-4" />}
            >
              {t('approval.submitButton', { summary: summaryText })}
            </Button>
          )}
        </div>
      </div>

      {/* Reschedule / Schedule Modal */}
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSubmit={handleReschedule}
        defaultValues={{
          dateTime: appointment?.appointmentDateTime ?? null,
          location: appointment?.locationDetail ?? null,
        }}
        isNewAppointment={isNewAppointment}
        isLoading={createAppointment.isPending || rescheduleAppointment.isPending}
        readOnly={readOnly}
      />

      {/* Cancel Appointment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelAppointmentModalOpen}
        onClose={() => setIsCancelAppointmentModalOpen(false)}
        onConfirm={handleCancelAppointment}
        title={t('appointment.cancelDialog.title')}
        message={t('appointment.cancelDialog.message')}
        confirmText={t('appointment.cancelDialog.confirm')}
        cancelText={t('appointment.cancelDialog.cancel')}
        variant="danger"
      />

      {/* Appointment & Fee History Drawer */}
      <AppointmentHistoryDrawer
        appraisalId={appraisalId}
        open={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
      />
    </div>
  );
}
