import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { useBulkCreateMeetings } from '../api/meetings';

interface BulkCreateMeetingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (meetingIds: string[]) => void;
}

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const BulkCreateMeetingsDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: BulkCreateMeetingsDialogProps) => {
  const bulkCreate = useBulkCreateMeetings();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [defaultTitle, setDefaultTitle] = useState('');

  const handleClose = () => {
    if (bulkCreate.isPending) return;
    setSelectedDates([]);
    setDefaultTitle('');
    onClose();
  };

  const handleSubmit = () => {
    if (selectedDates.length === 0) {
      toast.error('Pick at least one date');
      return;
    }

    // Convert local Date objects to ISO strings (noon UTC to avoid date boundary issues)
    const dates = selectedDates.map(d => {
      const noon = new Date(d);
      noon.setHours(12, 0, 0, 0);
      return noon.toISOString();
    });

    bulkCreate.mutate(
      {
        dates,
        defaultTitle: defaultTitle.trim() || undefined,
      },
      {
        onSuccess: data => {
          toast.success(
            `${data.meetingIds.length} meeting draft${data.meetingIds.length === 1 ? '' : 's'} created`,
          );
          onSuccess?.(data.meetingIds);
          handleClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to create meetings');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Create Meetings" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select one or more dates. A New meeting will be created for each selected date. Members
          can be added to each meeting afterwards.
        </p>

        {/* Date picker */}
        <div className="flex justify-center border border-gray-200 rounded-lg p-3">
          <DayPicker
            className="react-day-picker"
            mode="multiple"
            selected={selectedDates}
            onSelect={dates => setSelectedDates(dates ?? [])}
            disabled={{ before: new Date() }}
          />
        </div>

        {selectedDates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedDates
              .slice()
              .sort((a, b) => a.getTime() - b.getTime())
              .map(d => (
                <span
                  key={d.toISOString()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                >
                  {formatDate(d)}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDates(prev => prev.filter(x => x.getTime() !== d.getTime()))
                    }
                    className="hover:text-blue-900 focus:outline-none"
                    aria-label={`Remove ${formatDate(d)}`}
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* Optional default title */}
        <div>
          <label
            htmlFor="bulk-defaultTitle"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Default Title (optional)
          </label>
          <input
            id="bulk-defaultTitle"
            type="text"
            value={defaultTitle}
            onChange={e => setDefaultTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Committee Meeting"
            maxLength={200}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-500">
            {selectedDates.length} date{selectedDates.length === 1 ? '' : 's'} selected
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={handleClose}
              disabled={bulkCreate.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={selectedDates.length === 0 || bulkCreate.isPending}
            >
              {bulkCreate.isPending
                ? 'Creating...'
                : `Create ${selectedDates.length > 0 ? selectedDates.length : ''}`.trim()}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BulkCreateMeetingsDialog;
