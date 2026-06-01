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
import RescheduleModal from '../components/RescheduleModal';
import AddFeeModal from '../components/AddFeeModal';
import FeeInformationSection, { BANK_ABSORB_FEE_TYPES } from '../components/FeeInformationSection';
import PaymentInformationSection from '../components/PaymentInformationSection';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { VAT_PERCENTAGE } from '../types/appointmentAndFee';
import type { FeeItem } from '../types/appointmentAndFee';
import {
  useCancelAppointment,
  useCreateAppointment,
  useGetAppointment,
  useRescheduleAppointment,
} from '../api/appointment';
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
import { useSubmitFeeAppointmentChange } from '../api/feeAppointmentChange';
import type { FeeLineInput } from '../api/feeAppointmentChange';

/**
 * Appointment & Fee page for the appraisal workflow
 * Allows users to manage appointment scheduling, fee breakdown, and payment tracking
 */
export default function AppointmentAndFeePage() {
  const { t } = useTranslation(['appraisal', 'common']);
  const readOnly = usePageReadOnly();
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelAppointmentModalOpen, setIsCancelAppointmentModalOpen] = useState(false);
  const navigate = useNavigate();
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId ?? '';
  const currentUser = useAuthStore(state => state.user);

  // API hooks - Appointments
  const { data: appointment = null } = useGetAppointment(appraisalId);

  // ---- Change-request staging (company-side: bundle reschedule + fees) ----
  const [isChangeRequestMode, setIsChangeRequestMode] = useState(false);
  const [stagedNewDate, setStagedNewDate] = useState<string | null>(null);
  const [stagedFeeLines, setStagedFeeLines] = useState<FeeLineInput[]>([]);
  const [isStageRescheduleOpen, setIsStageRescheduleOpen] = useState(false);
  const [isStageAddFeeOpen, setIsStageAddFeeOpen] = useState(false);
  const [isConfirmChangeRequestOpen, setIsConfirmChangeRequestOpen] = useState(false);
  const submitChangeRequest = useSubmitFeeAppointmentChange(appraisalId);

  const handleStageReschedule = (data: { dateTime: string; location: string; reason?: string }) => {
    setStagedNewDate(data.dateTime);
    setIsStageRescheduleOpen(false);
  };

  const handleStageFee = (data: Omit<FeeItem, 'id'>) => {
    setStagedFeeLines(prev => [
      ...prev,
      { feeCode: data.type, feeDescription: data.description, feeAmount: data.amount },
    ]);
  };

  const handleRemoveStagedFee = (index: number) => {
    setStagedFeeLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelChangeRequest = () => {
    setIsChangeRequestMode(false);
    setStagedNewDate(null);
    setStagedFeeLines([]);
  };

  const handleSubmitChangeRequest = () => {
    if (!appointment) return;
    submitChangeRequest.mutate(
      {
        assignmentId: appraisalId,
        appointmentId: stagedNewDate ? appointment.id : undefined,
        newAppointmentDate: stagedNewDate ?? undefined,
        feeLines: stagedFeeLines.length > 0 ? stagedFeeLines : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('changeRequest.toasts.submitted'));
          setIsConfirmChangeRequestOpen(false);
          handleCancelChangeRequest();
        },
        onError: (error: unknown) => {
          setIsConfirmChangeRequestOpen(false);
          const apiError = error as { apiError?: { detail?: string }; message?: string };
          const message =
            apiError?.apiError?.detail ??
            apiError?.message ??
            t('changeRequest.toasts.submitFailed');
          toast.error(message);
        },
      },
    );
  };
  const createAppointment = useCreateAppointment();
  const rescheduleAppointment = useRescheduleAppointment();
  const cancelAppointment = useCancelAppointment();

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

  const isNewAppointment = !appointment;

  // Get the first fee record
  const currentFee = fees.length > 0 ? fees[0] : null;

  // Derive whether the current fee payment type is a bank-absorb type.
  // Used to override payment display in PaymentInformationSection (frontend-only, not persisted).
  const isBankAbsorb = BANK_ABSORB_FEE_TYPES.includes((currentFee as any)?.feePaymentType ?? '');

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
          appointedBy: currentUser?.id ?? '',
          locationDetail: data.location,
          contactPerson: null,
          contactPhone: null,
        });
        toast.success(t('appointment.toasts.scheduled'));
      } else {
        await rescheduleAppointment.mutateAsync({
          appraisalId,
          appointmentId: appointment!.id,
          changedBy: currentUser?.id ?? '',
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
        changedBy: currentUser?.id ?? '',
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
        approvedBy: currentUser?.id ?? '',
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
        rejectedBy: currentUser?.id ?? '',
        reason: reason || 'Rejected',
      });
      toast.success(t('fee.toasts.feeRejected'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeRejectFailed'));
    }
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
    const newItems = [...(currentFee.items ?? []), { feeAmount: data.feeAmount }];
    handleUpdateFeePaymentType(currentFee.feePaymentType ?? '', computeTotalFee(newItems));
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
    const newItems = (currentFee?.items ?? []).map(item =>
      item.id === feeItemId ? { ...item, feeAmount: data.feeAmount } : item,
    );
    handleUpdateFeePaymentType(currentFee?.feePaymentType ?? '', computeTotalFee(newItems));
  };

  const handleRemoveFeeItem = async (feeId: string, feeItemId: string) => {
    await removeFeeItem.mutateAsync({
      appraisalId,
      feeId,
      feeItemId,
    });
    const newItems = (currentFee?.items ?? []).filter(item => item.id !== feeItemId);
    handleUpdateFeePaymentType(currentFee?.feePaymentType ?? '', computeTotalFee(newItems));
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

  const computeTotalFee = (items: Array<{ feeAmount?: number }>) => {
    const vatRate = currentFee?.vatRate ?? VAT_PERCENTAGE;
    const subtotal = items.reduce((sum, item) => sum + (item.feeAmount ?? 0), 0);
    return subtotal * (1 + vatRate / 100);
  };

  const handleUpdateFeePaymentType = async (value: string, overrideTotalFee?: number) => {
    if (!currentFee) return;
    // Calculate totalFee to determine bankAbsorbAmount
    const totalFee = overrideTotalFee ?? computeTotalFee(currentFee.items ?? []);
    const isNewValueBankAbsorb = BANK_ABSORB_FEE_TYPES.includes(value);
    try {
      await updateAppraisalFee.mutateAsync({
        appraisalId,
        feeId: currentFee.id ?? '',
        feePaymentType: value,
        bankAbsorbAmount: isNewValueBankAbsorb ? totalFee : 0,
      });
      toast.success(t('fee.toasts.feeTypeUpdated'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeTypeUpdateFailed'));
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Main Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-6 pb-6 pr-4">
          {/* Appointment Information Section */}
          <AppointmentInfoCard
            appointment={appointment}
            onReschedule={() => !readOnly && setIsRescheduleModalOpen(true)}
            onCancel={() => !readOnly && setIsCancelAppointmentModalOpen(true)}
          />

          {/* Change Request Panel (company-side bundled reschedule + fee additions) */}
          {!readOnly && appointment && (
            <div className="border border-indigo-200 rounded-lg bg-indigo-50/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon name="file-circle-plus" style="solid" className="size-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-800">
                    {t('changeRequest.title')}
                  </span>
                </div>
                {!isChangeRequestMode ? (
                  <button
                    type="button"
                    onClick={() => setIsChangeRequestMode(true)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    {t('changeRequest.openButton')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelChangeRequest}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {t('changeRequest.cancelButton')}
                  </button>
                )}
              </div>

              {isChangeRequestMode && (
                <div className="space-y-3">
                  {/* Staged appointment */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsStageRescheduleOpen(true)}
                      className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-white border border-orange-200 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Icon name="calendar-clock" style="solid" className="size-3" />
                      {stagedNewDate ? t('changeRequest.changeDate') : t('changeRequest.addDate')}
                    </button>
                    {stagedNewDate && (
                      <span className="text-xs text-orange-800 font-medium flex items-center gap-1.5">
                        <Icon name="check" style="solid" className="size-3 text-orange-500" />
                        {new Date(stagedNewDate).toLocaleString()}
                        <button
                          type="button"
                          onClick={() => setStagedNewDate(null)}
                          className="ml-1 text-gray-400 hover:text-red-500"
                        >
                          <Icon name="xmark" style="solid" className="size-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Staged fee lines */}
                  <div className="space-y-1.5">
                    {stagedFeeLines.map((line, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-emerald-200 text-xs"
                      >
                        <span className="text-emerald-800 font-medium">
                          {line.feeDescription}{' '}
                          <span className="text-gray-500">
                            (
                            {line.feeAmount.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            )
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedFee(i)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Icon name="xmark" style="solid" className="size-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsStageAddFeeOpen(true)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Icon name="circle-plus" style="solid" className="size-3" />
                      {t('changeRequest.addFee')}
                    </button>
                  </div>

                  {/* Submit bundle button */}
                  {(stagedNewDate || stagedFeeLines.length > 0) && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsConfirmChangeRequestOpen(true)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Icon name="paper-plane" style="solid" className="size-4" />
                        {t('changeRequest.submitButton')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
              showConstructionInspectionFee={currentFee?.hasBuildingUnderConstruction ?? false}
              constructionInspectionFeeAmount={currentFee?.constructionInspectionFeeAmount ?? null}
              onUpdateConstructionInspectionFee={handleUpdateConstructionInspectionFee}
              isConstructionInspectionFeeUpdating={updateConstructionInspectionFee.isPending}
              totalFeePaid={currentFee?.totalPaidAmount ?? 0}
            />

            {/* Payment Information (Right Column) */}
            <PaymentInformationSection
              items={currentFee?.items ?? []}
              fee={currentFee}
              onRecordPayment={handleRecordPayment}
              onUpdatePayment={handleUpdatePayment}
              onRemovePayment={handleRemovePayment}
              requestedAt={appraisal?.requestedAt}
              isBankAbsorb={isBankAbsorb}
              isPaymentPending={
                recordPayment.isPending || updatePayment.isPending || removePayment.isPending
              }
            />
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 pr-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center">
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
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

      {/* Change Request: Stage reschedule modal */}
      <RescheduleModal
        isOpen={isStageRescheduleOpen}
        onClose={() => setIsStageRescheduleOpen(false)}
        onSubmit={handleStageReschedule}
        defaultValues={{
          dateTime: stagedNewDate,
          location: appointment?.locationDetail ?? null,
        }}
        isNewAppointment={false}
        isLoading={false}
      />

      {/* Change Request: Stage fee modal */}
      <AddFeeModal
        isOpen={isStageAddFeeOpen}
        onClose={() => setIsStageAddFeeOpen(false)}
        onSubmit={handleStageFee}
      />

      {/* Change Request: Confirm submit */}
      <ConfirmDialog
        isOpen={isConfirmChangeRequestOpen}
        onClose={() => setIsConfirmChangeRequestOpen(false)}
        onConfirm={handleSubmitChangeRequest}
        title={t('changeRequest.confirmTitle')}
        message={t('changeRequest.confirmMessage')}
        confirmText={t('changeRequest.confirmSubmit')}
        cancelText={t('common:actions.cancel')}
        variant="primary"
        isLoading={submitChangeRequest.isPending}
      />
    </div>
  );
}
