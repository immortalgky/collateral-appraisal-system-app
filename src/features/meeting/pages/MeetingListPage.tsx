import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

import { useGetMeetings } from '../api/meetings';
import type { MeetingStatus } from '../api/types';
import MeetingFormDialog from '../components/MeetingFormDialog';
import MeetingStatusBadge from '../components/MeetingStatusBadge';

const STATUS_OPTIONS: MeetingStatus[] = ['DRAFT', 'SCHEDULED', 'ENDED', 'CANCELLED'];

const MeetingListPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | ''>('');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { data, isLoading } = useGetMeetings({
    status: statusFilter || undefined,
    pageNumber,
    pageSize,
  });

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Meetings</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Schedule tier-3 committee meetings and release appraisals for voting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate('/meetings/queue')}>
            <Icon name="hourglass-half" style="solid" className="size-3.5 mr-1.5" />
            View Queue
          </Button>
          <Button size="sm" onClick={onOpen}>
            <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
            New Meeting
          </Button>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3 pb-1">
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as MeetingStatus | '');
            setPageNumber(0);
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white min-w-32"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Title</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Status</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Scheduled</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Location</th>
                <th className="text-right font-medium text-gray-600 px-4 py-2.5">Items</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    <Icon
                      name="spinner"
                      style="solid"
                      className="w-5 h-5 animate-spin inline-block"
                    />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No meetings found.
                  </td>
                </tr>
              ) : (
                items.map(meeting => (
                  <tr
                    key={meeting.id}
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-gray-900 font-medium">{meeting.title}</td>
                    <td className="px-4 py-3">
                      <MeetingStatusBadge status={meeting.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {meeting.scheduledAt
                        ? new Date(meeting.scheduledAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{meeting.location ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{meeting.itemCount}</td>
                  </tr>
                ))
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

      <MeetingFormDialog
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={id => navigate(`/meetings/${id}`)}
      />
    </div>
  );
};

export default MeetingListPage;
