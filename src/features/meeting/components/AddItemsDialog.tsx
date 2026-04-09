import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useAddMeetingItems, useGetMeetingQueue } from '../api/meetings';

interface AddItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

const AddItemsDialog = ({ isOpen, onClose, meetingId }: AddItemsDialogProps) => {
  const { data, isLoading } = useGetMeetingQueue({ status: 'Queued', pageSize: 100 });
  const addItems = useAddMeetingItems();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) setSelected(new Set());
  }, [isOpen]);

  const items = data?.items ?? [];

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map(item => item.id));
    });
  };

  const handleClose = () => {
    if (!addItems.isPending) onClose();
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    addItems.mutate(
      { id: meetingId, body: { queueItemIds: Array.from(selected) } },
      {
        onSuccess: () => {
          toast.success(`Added ${selected.size} appraisal${selected.size === 1 ? '' : 's'}`);
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to add appraisals');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Appraisals from Queue" size="lg">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Icon name="hourglass-half" style="regular" className="w-10 h-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              No appraisals are currently waiting in the queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-[55vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === items.length && items.length > 0}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Appraisal #
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Facility Limit
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Enqueued
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map(item => (
                  <tr
                    key={item.id}
                    className={selected.has(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        aria-label={`Select ${item.appraisalNo ?? item.appraisalId}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {item.appraisalNo ?? item.appraisalId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                      {formatCurrency(item.facilityLimit)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(item.enqueuedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-500">
            {selected.size} of {items.length} selected
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={handleClose}
              disabled={addItems.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0 || addItems.isPending}
            >
              {addItems.isPending
                ? 'Adding...'
                : `Add ${selected.size > 0 ? selected.size : ''}`.trim()}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddItemsDialog;
