import toast from 'react-hot-toast';

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
          toast.success('Cut-off completed — agenda snapshot frozen');
          onSuccess?.();
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to perform cut-off');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Confirm Cut-Off" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Cut-off freezes the agenda snapshot. All queued items below will be included in this
          meeting. This cannot be undone before Send Invitation.
        </p>

        {/* Queued items preview */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Queued Items to be Included
          </h3>
          {queueLoading ? (
            <div className="flex items-center justify-center py-4">
              <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : queuedItems.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-2">No queued items at this time.</p>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Appraisal #
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Facility Limit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {queuedItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {item.appraisalNo ?? item.appraisalId.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 text-right">
                        {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
                          item.facilityLimit,
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
        <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <Icon
            name="circle-info"
            style="regular"
            className="w-4 h-4 text-gray-400 shrink-0 mt-0.5"
          />
          <p className="text-xs text-gray-500">
            Acknowledgement items (sub-committee approvals pending since last meeting) are
            auto-included by the backend.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={cutOff.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={cutOff.isPending}>
            {cutOff.isPending ? 'Processing...' : 'Confirm Cut-Off'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CutOffReviewDialog;
