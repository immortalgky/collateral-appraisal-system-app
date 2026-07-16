import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import type { CommitteeFollowup } from '../api/types';
import { formatLocaleDate } from '@/shared/utils/dateUtils';

interface Props {
  rows: CommitteeFollowup[];
  isLoading: boolean;
  onOpenAppraisal: (appraisalId: string) => void;
}

const SKELETON_COLUMNS = [
  { width: 'w-36' },
  { width: 'w-8' },
  { width: 'w-32' },
  { width: 'w-20' },
  { width: 'w-36' },
];

const baseCls =
  'px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap bg-gray-50';

function CommitteeFollowupTable({ rows, isLoading, onOpenAppraisal }: Props) {
  const { t, i18n } = useTranslation('monitoring');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full min-w-max">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={baseCls}>Name</th>
            <th className={baseCls}>Available Tasks</th>
            <th className={baseCls}>Customer Name</th>
            <th className={baseCls}>Meeting No.</th>
            <th className={baseCls}>Meeting Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <TableRowSkeleton columns={SKELETON_COLUMNS} rows={5} />}

          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-16 text-center text-sm text-gray-500">
                {t('common.noRecords')}
              </td>
            </tr>
          )}

          {!isLoading &&
            rows.map(row => {
              const isOpen = expanded.has(row.userId);
              const items = row.items ?? [];
              return (
                <Fragment key={row.userId}>
                  <tr
                    onClick={() => toggle(row.userId)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Icon
                          style="solid"
                          name="chevron-right"
                          className={`size-3 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        />
                        <span className="text-sm font-medium text-gray-900">{row.memberName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex min-w-6 justify-center px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                          row.availableTasks > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {row.availableTasks}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5" />
                  </tr>

                  {isOpen &&
                    items.map(item => (
                      <tr key={`${row.userId}-${item.appraisalId}`} className="bg-gray-50/60">
                        <td className="px-4 py-2 pl-11">
                          <button
                            type="button"
                            onClick={() => onOpenAppraisal(item.appraisalId)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {item.appraisalNumber}
                          </button>
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-xs text-gray-600 max-w-[200px] truncate">
                          {item.customerName ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">
                          {item.meetingNumber ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                          {formatLocaleDate(item.meetingDate, i18n.language ?? '—')}
                        </td>
                      </tr>
                    ))}

                  {isOpen && items.length === 0 && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={5} className="px-4 py-3 pl-11 text-xs text-gray-400">
                        {t('common.noRecords')}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

export default CommitteeFollowupTable;
