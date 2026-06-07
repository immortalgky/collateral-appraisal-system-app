import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { type RouteBackFormValues, useRouteBackSchema } from '../schemas/meeting';
import { useRouteBackMeetingItem } from '../api/meetings';

interface RouteBackItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  appraisalId: string;
  appraisalNo: string | null;
}

const RouteBackItemDialog = ({
  isOpen,
  onClose,
  meetingId,
  appraisalId,
  appraisalNo,
}: RouteBackItemDialogProps) => {
  const { t } = useTranslation('meeting');
  const routeBack = useRouteBackMeetingItem();
  const schema = useRouteBackSchema();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RouteBackFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (isOpen) reset({ reason: '' });
  }, [isOpen, reset]);

  const handleClose = () => {
    if (!routeBack.isPending) onClose();
  };

  const onSubmit = (values: RouteBackFormValues) => {
    routeBack.mutate(
      { meetingId, appraisalId, body: { reason: values.reason.trim() } },
      {
        onSuccess: () => {
          toast.success(t('toasts.itemRoutedBack'));
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.itemRouteBackFailed'));
        },
      },
    );
  };

  const label = appraisalNo ?? appraisalId.slice(0, 8);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.routeBackAppraisal')} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-600">{t('routeBackDialog.description', { label })}</p>

        <div>
          <label
            htmlFor="routeback-reason"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('fields.reasonRequired')} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="routeback-reason"
            rows={3}
            {...register('reason')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={t('fields.routeBackReasonPlaceholder')}
          />
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={routeBack.isPending}
          >
            {t('buttons.cancel')}
          </Button>
          <Button variant="danger" type="submit" disabled={routeBack.isPending}>
            {routeBack.isPending ? t('routeBackDialog.routingBack') : t('buttons.routeBack')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RouteBackItemDialog;
