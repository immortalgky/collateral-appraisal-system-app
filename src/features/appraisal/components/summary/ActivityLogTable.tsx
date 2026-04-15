import { useState } from 'react';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import type { ActivityLogItemDto } from '@/features/appraisal/api/workflow';

interface ActivityLogTableProps {
  activityLog: ActivityLogItemDto[];
  pageSize?: number;
}


/** Format an ISO datetime string to "dd/MM/yyyy HH:mm" */
const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const ActivityLogTable = ({ activityLog, pageSize = 10 }: ActivityLogTableProps) => {
  const [page, setPage] = useState(1);

  if (!activityLog || activityLog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Icon name="clock-rotate-left" style="regular" className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No activity recorded yet</p>
      </div>
    );
  }

  const totalPages = Math.ceil(activityLog.length / pageSize);
  const pageItems = activityLog.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <th className="w-10">No.</th>
              <th>Activity</th>
              <th>Assigned To</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Action</th>
              <th>Time Taken</th>
              <th>Remark</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item) => (
              <tr key={item.sequenceNo} className="border-b border-gray-100 last:border-0">
                <td className="text-gray-500 font-medium">{item.sequenceNo}</td>
                <td className="font-medium text-gray-800">
                  {item.taskDescription ?? item.activityName}
                </td>
                <td>
                  {item.assignedToDisplayName || item.assignedTo ? (
                    <div>
                      <span className="text-gray-700">{item.assignedToDisplayName ?? item.assignedTo}</span>
                      {item.assignedToDisplayName && item.assignedTo && (
                        <div className="text-xs text-gray-400">{item.assignedTo}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="text-gray-600 whitespace-nowrap">{formatDateTime(item.startDate)}</td>
                <td className="text-gray-600 whitespace-nowrap">
                  {item.endDate ? formatDateTime(item.endDate) : <span className="text-gray-400">—</span>}
                </td>
                <td>
                  {item.actionTaken ? (
                    <span className="text-gray-700">{item.actionTaken}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td>
                  {item.timeTaken ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium">
                      {item.timeTaken}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td>
                  {item.remark ? (
                    <div className="relative group inline-flex items-center justify-center">
                      <Icon
                        name="message"
                        style="regular"
                        className="w-4 h-4 text-blue-400 hover:text-blue-600 cursor-pointer transition-colors"
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-normal leading-relaxed">
                        {item.remark}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td>
                  <Badge
                    type="status"
                    value={item.status.toLowerCase() === 'completed' ? 'completed' : 'pending'}
                    size="xs"
                    dot={false}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-3 border-t border-gray-100 mt-1">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`rounded-full transition-all duration-150 ${
                  p === page
                    ? 'w-2.5 h-2.5 bg-blue-500'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogTable;
