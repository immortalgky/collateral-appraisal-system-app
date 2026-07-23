import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { type RecallFormValues, useRecallSchema } from '../schemas/meeting';
import { useRecallMeetingItem } from '../api/meetings';

interface RecallItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  appraisalId: string;
  appraisalNo: string | null;
}

const RecallItemDialog = ({
  isOpen,
  onClose,
  meetingId,
  appraisalId,
  appraisalNo,
}: RecallItemDialogProps) => {
  const { t } = useTranslation('meeting');
  const recall = useRecallMeetingItem();
  const schema = useRecallSchema();

  // Set when a first-pass recall 409s because an approver already voted — offers
  // a second-stage force confirm instead of silently blocking the recall. Force
  // is gated the same way as Recall itself (MEETING_SECRETARY), so anyone who
  // can see this dialog can reach this path.
  const [forceReason, setForceReason] = useState<string | null>(null);
  // `recall.isPending` only flips after a render, which isn't fast enough to stop
  // a double-click from firing two force mutations — force-recall discards
  // approver votes, so this path gets its own synchronous in-flight guard.
  const forceInFlightRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecallFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ reason: '' });
      setForceReason(null);
      forceInFlightRef.current = false;
    }
  }, [isOpen, reset]);

  const handleClose = () => {
    if (!recall.isPending) onClose();
  };

  const label = appraisalNo ?? appraisalId.slice(0, 8);

  const onSubmit = (values: RecallFormValues) => {
    const reason = values.reason.trim();
    recall.mutate(
      { meetingId, appraisalId, body: { reason } },
      {
        onSuccess: () => {
          toast.success(t('toasts.itemRecalled'));
          onClose();
        },
        onError: (error: unknown) => {
          const apiError = (
            error as { apiError?: { status?: number; detail?: string; errorCode?: string } }
          )?.apiError;

          if (apiError?.status === 409) {
            // Several distinct 409 cases share the status code — the backend tells
            // them apart via a stable errorCode extension on the ProblemDetails body.
            if (apiError.errorCode === 'RECALL_VOTES_EXIST') {
              setForceReason(reason);
              return;
            }
            if (apiError.errorCode === 'RECALL_ALREADY_RESOLVED') {
              toast.error(t('toasts.itemRecallAlreadyResolved'));
              return;
            }
            if (apiError.errorCode === 'RECALL_NOT_RELEASED') {
              toast.error(t('toasts.itemRecallNotReleased'));
              return;
            }
            if (apiError.errorCode === 'RECALL_BUSY') {
              toast.error(t('toasts.itemRecallBusy'));
              return;
            }
            toast.error(apiError.detail || t('toasts.itemRecallFailed'));
            return;
          }

          toast.error(apiError?.detail || t('toasts.itemRecallFailed'));
        },
      },
    );
  };

  const handleForceConfirm = () => {
    if (!forceReason || forceInFlightRef.current) return;
    forceInFlightRef.current = true;
    recall.mutate(
      { meetingId, appraisalId, body: { reason: forceReason, force: true } },
      {
        onSuccess: () => {
          forceInFlightRef.current = false;
          toast.success(t('toasts.itemForceRecalled'));
          onClose();
        },
        onError: (error: unknown) => {
          forceInFlightRef.current = false;
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.itemRecallFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.recallAppraisal')} size="sm">
      {forceReason ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-red-800">{t('recallDialog.forceWarning', { label })}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={recall.isPending}>
              {t('buttons.cancel')}
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleForceConfirm}
              disabled={recall.isPending}
            >
              {recall.isPending ? t('recallDialog.forceRecalling') : t('buttons.forceRecall')}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-gray-600">{t('recallDialog.description', { label })}</p>

          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-amber-800">{t('recallDialog.confirm', { label })}</p>
          </div>

          <div>
            <label htmlFor="recall-reason" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.reasonRequired')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="recall-reason"
              rows={3}
              {...register('reason')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={t('fields.recallReasonPlaceholder')}
            />
            {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={recall.isPending}>
              {t('buttons.cancel')}
            </Button>
            <Button variant="danger" type="submit" disabled={recall.isPending}>
              {recall.isPending ? t('recallDialog.recalling') : t('buttons.recall')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default RecallItemDialog;
