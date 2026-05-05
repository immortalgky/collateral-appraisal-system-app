import { useState } from 'react';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import Pagination from '@shared/components/Pagination';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { formatLocaleDateTime } from '@shared/utils/dateUtils';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useGetBackfillReport, useStartBackfill, useReplayBackfill } from '../api/hooks';
import type { BackfillStatus } from '../api/types';

const STATUS_OPTIONS: { value: BackfillStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'Processed', label: 'Processed' },
  { value: 'SkippedMissingKey', label: 'Skipped (missing key)' },
  { value: 'Error', label: 'Error' },
];

function StatusBadge({ status }: { status: BackfillStatus }) {
  const cfg = {
    Processed: { bg: 'bg-green-50 text-green-700 ring-green-200', icon: 'check' },
    SkippedMissingKey: { bg: 'bg-amber-50 text-amber-700 ring-amber-200', icon: 'exclamation' },
    Error: { bg: 'bg-red-50 text-red-700 ring-red-200', icon: 'triangle-exclamation' },
  }[status] ?? { bg: 'bg-gray-50 text-gray-600 ring-gray-200', icon: 'circle-question' };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ring-1',
        cfg.bg,
      )}
    >
      <Icon name={cfg.icon} style="solid" className="size-2.5" />
      {status}
    </span>
  );
}

export default function BackfillReportPage() {
  const { i18n } = useTranslation();

  const [status, setStatus] = useState<BackfillStatus | ''>('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  const [confirmBackfill, setConfirmBackfill] = useState(false);
  const [replayId, setReplayId] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError } = useGetBackfillReport({
    status: status || undefined,
    page,
    pageSize,
  });

  const { mutate: startBackfill, isPending: isStarting } = useStartBackfill();
  const { mutate: replayBackfill, isPending: isReplaying } = useReplayBackfill();

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  const handleStartBackfill = () => {
    startBackfill(undefined, {
      onSuccess: () => {
        toast.success('Backfill started — results will appear as they are processed.');
        setConfirmBackfill(false);
      },
      onError: (e: any) => {
        toast.error(e.apiError?.detail ?? 'Failed to start backfill');
        setConfirmBackfill(false);
      },
    });
  };

  const handleReplay = (appraisalId: string) => {
    setReplayId(appraisalId);
    replayBackfill(appraisalId, {
      onSuccess: () => {
        toast.success('Replay submitted');
        setReplayId(null);
      },
      onError: (e: any) => {
        toast.error(e.apiError?.detail ?? 'Failed to replay');
        setReplayId(null);
      },
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Backfill Report</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            One-shot backfill of historical completed appraisals into the collateral master registry
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setConfirmBackfill(true)}
          isLoading={isStarting}
        >
          <Icon style="solid" name="play" className="size-3.5 mr-1.5" />
          Start Backfill
        </Button>
      </div>

      {/* Filters */}
      <div className="shrink-0 flex gap-3">
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as BackfillStatus | ''); setPage(0); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white hover:border-gray-300 min-w-44"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {isError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-lg text-sm text-red-700">
          <Icon name="triangle-exclamation" style="solid" className="size-4" />
          Failed to load backfill report
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Appraisal ID</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Status</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Message</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Run At</th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody
              className={clsx(
                'divide-y divide-gray-100',
                isRefetching && 'opacity-50 pointer-events-none',
              )}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-64' },
                    { width: 'w-24' },
                    { width: 'w-60' },
                    { width: 'w-32' },
                    { width: 'w-16' },
                  ]}
                  rows={6}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">No backfill records found</p>
                      <p className="text-xs text-gray-400">
                        {status ? 'Try a different status filter' : 'Run backfill to start processing historical appraisals'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">
                      {item.appraisalId}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">
                      {item.message ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                      {formatLocaleDateTime(item.runAt, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5">
                      {(item.status === 'SkippedMissingKey' || item.status === 'Error') && (
                        <button
                          type="button"
                          onClick={() => handleReplay(item.appraisalId)}
                          disabled={isReplaying && replayId === item.appraisalId}
                          className="px-2 py-1 text-xs text-primary border border-primary/30 rounded hover:bg-primary/10 transition-colors disabled:opacity-50"
                        >
                          {isReplaying && replayId === item.appraisalId ? (
                            <Icon name="spinner" style="solid" className="size-3 animate-spin" />
                          ) : (
                            'Replay'
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          showPageSizeSelector={false}
        />
      </div>

      {/* Backfill confirm */}
      <ConfirmDialog
        isOpen={confirmBackfill}
        onClose={() => setConfirmBackfill(false)}
        onConfirm={handleStartBackfill}
        title="Start Backfill?"
        message="This will process all completed appraisals that have not yet been registered in the collateral master. It is idempotent — safe to re-run."
        confirmText="Start Backfill"
        variant="primary"
        isLoading={isStarting}
      />
    </div>
  );
}
