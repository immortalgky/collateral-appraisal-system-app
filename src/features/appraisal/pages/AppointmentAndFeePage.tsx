import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import { useAppraisalContext } from '../context/AppraisalContext';
import { useAuthStore } from '@/features/auth/store';
import AppointmentInfoCard from '../components/AppointmentInfoCard';
import RescheduleModal from '../components/RescheduleModal';
import FeeInformationSection from '../components/FeeInformationSection';
import PaymentInformationSection from '../components/PaymentInformationSection';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import {
  useCancelAppointment,
  useCreateAppointment,
  useGetAppointments,
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
  useUpdateFeeItem,
  useUpdatePayment,
} from '../api/fee';

/**
 * Appointment & Fee page for the appraisal workflow
 * Allows users to manage appointment scheduling, fee breakdown, and payment tracking
 */
export default function AppointmentAndFeePage() {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelAppointmentModalOpen, setIsCancelAppointmentModalOpen] = useState(false);
  const navigate = useNavigate();
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId ?? '';
  const currentUser = useAuthStore(state => state.user);

  // API hooks - Appointments
  const { data: appointments = [] } = useGetAppointments(appraisalId);
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

  // Get the latest appointment (last in the array)
  const latestAppointment = appointments.length > 0 ? appointments[appointments.length - 1] : null;
  const isNewAppointment = !latestAppointment;

  // Get the first fee record
  const currentFee = fees.length > 0 ? fees[0] : null;

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
        toast.success('Appointment scheduled');
      } else {
        await rescheduleAppointment.mutateAsync({
          appraisalId,
          appointmentId: latestAppointment!.id,
          changedBy: currentUser?.id ?? '',
          newDateTime: data.dateTime,
          reason: data.reason || null,
        });
        toast.success('Appointment rescheduled');
      }
      setIsRescheduleModalOpen(false);
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to update appointment. Please try again.');
    }
  };

  const handleCancelAppointment = async () => {
    if (!latestAppointment) return;
    try {
      await cancelAppointment.mutateAsync({
        appraisalId,
        appointmentId: latestAppointment.id,
        changedBy: currentUser?.id ?? '',
        reason: null,
      });
      setIsCancelAppointmentModalOpen(false);
      toast.success('Appointment cancelled');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to cancel appointment. Please try again.');
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
      toast.success('Fee item approved');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to approve fee item.');
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
      toast.success('Fee item rejected');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to reject fee item.');
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
      feeId: currentFee.id,
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
        feeId: currentFee.id,
        paymentAmount: data.paymentAmount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod || null,
        paymentReference: data.paymentReference || null,
        remarks: data.remarks || null,
      });
      toast.success('Payment recorded');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to record payment.');
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
        feeId: currentFee.id,
        paymentId,
        ...data,
      });
      toast.success('Payment updated');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to update payment.');
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!currentFee) return;
    try {
      await removePayment.mutateAsync({
        appraisalId,
        feeId: currentFee.id,
        paymentId,
      });
      toast.success('Payment deleted');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to delete payment.');
    }
  };

  const handleUpdateFeePaymentType = async (value: string) => {
    if (!currentFee) return;
    try {
      await updateAppraisalFee.mutateAsync({
        appraisalId,
        feeId: currentFee.id,
        feePaymentType: value,
      });
      toast.success('Fee type updated');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to update fee type.');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Main Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-6 pb-6 pr-4">
          {/* Appointment Information Section */}
          <AppointmentInfoCard
            appointment={latestAppointment}
            onReschedule={() => setIsRescheduleModalOpen(true)}
            onCancel={() => setIsCancelAppointmentModalOpen(true)}
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
            />

            {/* Payment Information (Right Column) */}
            <PaymentInformationSection
              items={currentFee?.items ?? []}
              fee={currentFee}
              onRecordPayment={handleRecordPayment}
              onUpdatePayment={handleUpdatePayment}
              onRemovePayment={handleRemovePayment}
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
          dateTime: latestAppointment?.appointmentDateTime ?? null,
          location: latestAppointment?.locationDetail ?? null,
        }}
        isNewAppointment={isNewAppointment}
        isLoading={createAppointment.isPending || rescheduleAppointment.isPending}
      />

      {/* Cancel Appointment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelAppointmentModalOpen}
        onClose={() => setIsCancelAppointmentModalOpen(false)}
        onConfirm={handleCancelAppointment}
        title="Cancel Appointment?"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmText="Cancel Appointment"
        cancelText="Keep Appointment"
        variant="danger"
      />
    </div>
  );
}
