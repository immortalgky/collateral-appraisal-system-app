import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useCutOffMeeting, useGetMeetingQueue } from '../api/meetings';

interface CutOffReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  onSuccess?: () => void;
}

const CutOffReviewDialog = ({ isOpen, onClose, meetingId, onSuccess }: CutOffReviewDialogProps) => {
  const { t } = useTranslation('meeting');
  const cutOff = useCutOffMeeting();
  const { data: queueData, isLoading: queueLoading } = useGetMeetingQueue({
    status: 'Queued',
    pageSize: 100,
  });

  const queuedItems = queueData?.items ?? [];

  const handleClose = () => {
    if (!cutOff.isPending) onClose();
  };

  const handleConfirm = () => {
    cutOff.mutate(
      { id: meetingId },
      {
        onSuccess: () => {
          toast.success(t('toasts.cutOffCompleted'));
          onSuccess?.();
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.cutOffFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.confirmCutOff')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-(--palette-gray-600)">{t('cutOffDialog.description')}</p>

        {/* Queued items preview */}
        <div>
          <h3 className="text-xs font-semibold text-(--palette-gray-500) uppercase mb-2">
            {t('sections.queuedItemsToInclude')}
          </h3>
          {queueLoading ? (
            <div className="flex items-center justify-center py-4">
              <Icon
                name="spinner"
                style="solid"
                className="w-5 h-5 animate-spin text-(--palette-gray-400)"
              />
            </div>
          ) : queuedItems.length === 0 ? (
            <p className="text-sm text-(--palette-gray-500) italic py-2">
              {t('empty.noQueuedItems')}
            </p>
          ) : (
            <div className="rounded-lg border border-(--palette-line) overflow-hidden max-h-48 overflow-y-auto">
              <table className="min-w-full divide-y divide-(--palette-line)">
                <thead className="bg-(--palette-surface-2) sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase">
                      {t('columns.appraisalNo')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-(--palette-gray-500) uppercase">
                      {t('columns.appraisalValue')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-(--palette-surface) divide-y divide-(--palette-line)">
                  {queuedItems.map(item => (
                    <tr key={item.id} className="hover:bg-(--palette-surface-2)">
                      <td className="px-3 py-2 text-sm text-(--palette-ink)">
                        {item.appraisalNo ?? item.appraisalId.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-sm text-(--palette-ink) text-right">
                        {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
                          item.appraisalValue,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Acknowledgement note */}
        <div className="flex items-start gap-2 px-3 py-2 bg-(--palette-surface-2) border border-(--palette-line) rounded-lg">
          <Icon
            name="circle-info"
            style="regular"
            className="w-4 h-4 text-(--palette-gray-400) shrink-0 mt-0.5"
          />
          <p className="text-xs text-(--palette-gray-500)">{t('cutOffDialog.ackNote')}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={cutOff.isPending}>
            {t('buttons.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={cutOff.isPending}>
            {cutOff.isPending ? t('cutOffDialog.processing') : t('buttons.confirmCutOff')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CutOffReviewDialog;
