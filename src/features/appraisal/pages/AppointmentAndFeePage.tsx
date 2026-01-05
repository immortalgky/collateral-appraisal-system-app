import { useState, useEffect } from 'react';
import { FormProvider, type SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useAppraisalContext } from '../context/AppraisalContext';
import {
  AppointmentAndFeeFormSchema,
  appointmentAndFeeFormDefaults,
} from '../schemas/appointmentAndFee';
import type { AppointmentAndFeeFormType } from '../types/appointmentAndFee';
import AppointmentInfoCard from '../components/AppointmentInfoCard';
import RescheduleModal from '../components/RescheduleModal';
import FeeInformationSection from '../components/FeeInformationSection';
import PaymentInformationSection from '../components/PaymentInformationSection';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

/**
 * Appointment & Fee page for the appraisal workflow
 * Allows users to manage appointment scheduling, fee breakdown, and payment tracking
 */
export default function AppointmentAndFeePage() {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const navigate = useNavigate();
  const { appraisal } = useAppraisalContext();

  // Initialize form with default values or data from context
  const methods = useForm<AppointmentAndFeeFormType>({
    defaultValues: {
      ...appointmentAndFeeFormDefaults,
      appointment: {
        dateTime: appraisal?.appointmentDateTime || null,
        location: appraisal?.appointmentLocation || null,
      },
    },
    resolver: zodResolver(AppointmentAndFeeFormSchema),
  });

  const {
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { isDirty },
  } = methods;

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Watch appointment data for display
  const appointmentDateTime = watch('appointment.dateTime');
  const appointmentLocation = watch('appointment.location');

  const onSubmit: SubmitHandler<AppointmentAndFeeFormType> = async data => {
    setIsSubmitting(true);
    try {
      // TODO: Add API call to save data
      console.log('Form submitted:', data);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Appointment & Fee saved successfully');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to save. Please try again.');
      console.error('Save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const data = getValues();
      // TODO: Add API call to save draft
      console.log('Save draft:', data);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success('Draft saved successfully');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to save draft. Please try again.');
      console.error('Save draft error:', error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setIsCancelModalOpen(true);
    } else {
      navigate(-1);
    }
  };

  const handleConfirmCancel = () => {
    setIsCancelModalOpen(false);
    navigate(-1);
  };

  const handleReschedule = (data: { dateTime: string; location: string }) => {
    const isNewAppointment = !appointmentDateTime;
    setValue('appointment.dateTime', data.dateTime, { shouldDirty: true });
    setValue('appointment.location', data.location, { shouldDirty: true });
    setIsRescheduleModalOpen(false);
    toast.success(isNewAppointment ? 'Appointment scheduled' : 'Appointment rescheduled');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
          {/* Main Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-6 pb-6 pr-4">
              {/* Appointment Information Section */}
              <AppointmentInfoCard
                dateTime={appointmentDateTime}
                location={appointmentLocation}
                appraiser={appraisal?.requestor}
                onReschedule={() => setIsRescheduleModalOpen(true)}
              />

              {/* Divider */}
              <div className="border-b border-gray-200" />

              {/* Fee and Payment Section - Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
                {/* Fee Information (Left Column) */}
                <FeeInformationSection />

                {/* Payment Information (Right Column) */}
                <PaymentInformationSection />
              </div>
            </div>
          </div>

          {/* Sticky Action Buttons */}
          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 pr-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button variant="ghost" type="button" onClick={handleCancel}>
                  Cancel
                </Button>
                {isDirty && (
                  <span className="text-xs text-warning flex items-center gap-1">
                    <Icon name="circle-exclamation" style="solid" className="w-3 h-3" />
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  type="button"
                  disabled={!isDirty || isSavingDraft}
                  onClick={handleSaveDraft}
                  isLoading={isSavingDraft}
                >
                  {!isSavingDraft && (
                    <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                  )}
                  Save Draft
                </Button>
                <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                  {!isSubmitting && (
                    <Icon style="solid" name="floppy-disk" className="size-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>

      {/* Reschedule / Schedule Modal */}
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSubmit={handleReschedule}
        defaultValues={{
          dateTime: appointmentDateTime,
          location: appointmentLocation,
        }}
        isNewAppointment={!appointmentDateTime}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to leave? All changes will be lost."
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="warning"
      />
    </div>
  );
}
