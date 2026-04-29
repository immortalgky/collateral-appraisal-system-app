import Icon from '@/shared/components/Icon';
import { useGetQuotationActivityLog } from '../api/quotation';

interface QuotationTrackingLogProps {
  quotationId: string;
}

/** Format an ISO datetime string as DD/MM/YYYY HH:mm */
const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Full-width tracking log panel.
 * Fetches via useGetQuotationActivityLog (Phase 2a hook).
 * Rows are displayed chronologically (backend sorts ASC).
 */
const QuotationTrackingLog = ({ quotationId }: QuotationTrackingLogProps) => {
  const { data: rows, isLoading, isError } = useGetQuotationActivityLog(quotationId);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <div className="size-7 rounded-lg bg-gray-200 flex items-center justify-center">
          <Icon name="clock-rotate-left" style="solid" className="size-3.5 text-gray-600" />
        </div>
        <h2 className="text-sm font-semibold text-gray-700">Quotation Tracking Log</h2>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Icon name="spinner" style="solid" className="size-5 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-500">Unable to load activity log.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {(rows ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No activity yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action Date Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(rows ?? []).map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {row.activityName}
                        </span>
                        {row.remark && <p className="text-xs text-gray-400 mt-0.5">{row.remark}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {formatDateTime(row.actionAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{row.actionBy}</span>
                        {row.actionByRole && (
                          <p className="text-xs text-gray-400">{row.actionByRole}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuotationTrackingLog;
