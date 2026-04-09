import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

import { useGetMeetingQueue, useAddMeetingItems, useCreateMeeting } from '../api/meetings';
import MeetingFormDialog from '../components/MeetingFormDialog';
import toast from 'react-hot-toast';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

const MeetingQueuePage = () => {
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { data, isLoading } = useGetMeetingQueue({
    status: 'Queued',
    pageNumber,
    pageSize,
  });

  const createMeeting = useCreateMeeting();
  const addItems = useAddMeetingItems();

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

  /**
   * "Add to new meeting" flow:
   * 1. Open dialog → user fills in title/notes.
   * 2. On submit, dialog calls onSuccess(meetingId).
   * 3. We immediately add the selected queue items to that meeting and navigate.
   */
  const handleNewMeetingCreated = (meetingId: string) => {
    if (selected.size === 0) {
      navigate(`/meetings/${meetingId}`);
      return;
    }
    addItems.mutate(
      { id: meetingId, body: { queueItemIds: Array.from(selected) } },
      {
        onSuccess: () => {
          toast.success(`Added ${selected.size} appraisal${selected.size === 1 ? '' : 's'}`);
          setSelected(new Set());
          navigate(`/meetings/${meetingId}`);
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Meeting created but failed to add items');
          navigate(`/meetings/${meetingId}`);
        },
      },
    );
  };

  const isBusy = createMeeting.isPending || addItems.isPending;

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Awaiting Meeting Queue</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Tier-3 appraisals (facility limit &gt; 30M) waiting to be assigned to a meeting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate('/meetings')}>
            <Icon name="list" style="solid" className="size-3.5 mr-1.5" />
            All Meetings
          </Button>
          <Button size="sm" disabled={selected.size === 0 || isBusy} onClick={onOpen}>
            <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
            Add to New Meeting{selected.size > 0 ? ` (${selected.size})` : ''}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Appraisal #</th>
                <th className="text-right font-medium text-gray-600 px-4 py-2.5">Facility Limit</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Enqueued</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    <Icon
                      name="spinner"
                      style="solid"
                      className="w-5 h-5 animate-spin inline-block"
                    />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    No appraisals waiting in the queue.
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const label = item.appraisalNo ?? item.appraisalId.slice(0, 8);
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 ${
                        selected.has(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-label={`Select ${label}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        <Link
                          to={`/appraisals/${item.appraisalId}/summary`}
                          className="text-blue-600 hover:underline"
                        >
                          {label}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-right">
                        {formatCurrency(item.facilityLimit)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(item.enqueuedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalCount > 0 && (
          <div className="shrink-0 border-t border-gray-200">
            <Pagination
              currentPage={pageNumber}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPageNumber}
              onPageSizeChange={size => {
                setPageSize(size);
                setPageNumber(0);
              }}
            />
          </div>
        )}
      </div>

      <MeetingFormDialog isOpen={isOpen} onClose={onClose} onSuccess={handleNewMeetingCreated} />
    </div>
  );
};

export default MeetingQueuePage;
