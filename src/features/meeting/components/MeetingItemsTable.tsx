import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useRemoveMeetingItem } from '../api/meetings';
import type { MeetingItemDto, MeetingStatus } from '../api/types';

interface MeetingItemsTableProps {
  meetingId: string;
  meetingStatus: MeetingStatus;
  items: MeetingItemDto[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

const MeetingItemsTable = ({ meetingId, meetingStatus, items }: MeetingItemsTableProps) => {
  const removeItem = useRemoveMeetingItem();
  const canRemove = meetingStatus === 'Draft' || meetingStatus === 'Scheduled';

  const handleRemove = (appraisalId: string, label: string) => {
    if (!confirm(`Remove ${label} from this meeting? It will return to the queue.`)) return;
    removeItem.mutate(
      { id: meetingId, appraisalId },
      {
        onSuccess: () => {
          toast.success('Appraisal returned to queue');
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to remove appraisal');
        },
      },
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Icon name="folder-open" style="regular" className="w-10 h-10 text-gray-300" />
        <p className="text-sm text-gray-500">No appraisals in this meeting yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Appraisal #
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Facility Limit
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Added
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map(item => {
            const label = item.appraisalNo ?? item.appraisalId.slice(0, 8);
            return (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  <Link
                    to={`/appraisals/${item.appraisalId}/summary`}
                    className="text-blue-600 hover:underline"
                  >
                    {label}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                  {formatCurrency(item.facilityLimit)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {new Date(item.addedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="xs"
                      type="button"
                      onClick={() => handleRemove(item.appraisalId, label)}
                      disabled={removeItem.isPending}
                    >
                      <Icon name="xmark" style="solid" className="size-3.5 mr-1" />
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MeetingItemsTable;
