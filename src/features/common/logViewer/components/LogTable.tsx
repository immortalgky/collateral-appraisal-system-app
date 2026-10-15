import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import DataErrorState from '@shared/components/DataErrorState';
import {
  isKnownLevel,
  levelLookup,
  logLevelBadgeClass,
  NEUTRAL_BADGE_CLASS,
  type LogListItem,
} from '../types';
import {
  httpStatusClass,
  isHttpLoggingRow,
  parseHttpLogMessage,
  type ParsedHttpLog,
} from '../utils/parseHttpLogMessage';
import { canFilterExactMatch } from '../utils/queryTokens';

interface LogTableProps {
  items: LogListItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelectRow: (item: LogListItem) => void;
  selectedId: number | null;
  onTagClick: (key: string, value: string) => void;
  onCopyLink: () => void;
}

const rowBorderClass: Record<LogListItem['level'], string> = {
  Information: 'border-l-transparent',
  Warning: 'border-l-amber-400',
  Error: 'border-l-red-500',
  Fatal: 'border-l-red-800',
};
const NEUTRAL_BORDER_CLASS = 'border-l-gray-300';

const shortSource = (source: string | null) =>
  source ? (source.split('.').at(-1) ?? source) : '—';
const shortId = (id: string) => id.slice(-6);

const Tag = ({
  label,
  onClick,
  title,
  variant = 'default',
}: {
  label: string;
  onClick?: () => void;
  title?: string;
  variant?: 'default' | 'ext';
}) => (
  <button
    type="button"
    onClick={e => {
      // The row itself opens the drawer on click — a tag sits inside that row, so its own click
      // must never bubble up and open the drawer too.
      e.stopPropagation();
      onClick?.();
    }}
    title={title}
    disabled={!onClick}
    className={clsx(
      'font-mono text-[11px] rounded px-1.5 py-0.5 border whitespace-nowrap',
      variant === 'ext'
        ? 'bg-blue-50 text-blue-700 border-transparent'
        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-primary hover:text-primary',
    )}
  >
    {label}
  </button>
);

interface ParsedRow {
  item: LogListItem;
  isHttp: boolean;
  http: ParsedHttpLog | null;
}

const LogTable = ({
  items,
  isLoading,
  isError,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectRow,
  selectedId,
  onTagClick,
  onCopyLink,
}: LogTableProps) => {
  const { t } = useTranslation('logAdmin');

  // Parsed once per item, keyed only on `items` — without this, every keystroke in the search
  // box re-renders this table (its own props haven't changed, but LogViewerPage re-renders on
  // every keystroke), and re-parsing 50+ HTTP messages on each one is pure waste.
  const rows = useMemo<ParsedRow[]>(
    () =>
      items.map(item => {
        const isHttp = isHttpLoggingRow(item.sourceContext);
        return { item, isHttp, http: isHttp ? parseHttpLogMessage(item.message) : null };
      }),
    [items],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {t('columns.timeStamp')}
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('columns.level')}
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('columns.message')}
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {t('columns.source')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableRowSkeleton
                columns={[
                  { width: 'w-24' },
                  { width: 'w-16' },
                  { width: 'w-96' },
                  { width: 'w-28' },
                ]}
                rows={10}
              />
            ) : isError ? (
              <tr>
                <td colSpan={4} className="py-4">
                  <DataErrorState
                    variant="inline"
                    title={t('error.failedToLoad')}
                    onRetry={onRetry}
                  />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                  <Icon
                    name="file-lines"
                    style="regular"
                    className="size-8 mx-auto mb-2 opacity-40"
                  />
                  <p>{t('emptyState')}</p>
                </td>
              </tr>
            ) : (
              rows.map(({ item, isHttp, http }) => {
                const date = new Date(item.timeStamp);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectRow(item)}
                    className={clsx(
                      'border-b border-gray-50 border-l-[3px] hover:bg-gray-50 transition-colors cursor-pointer',
                      levelLookup(rowBorderClass, item.level, NEUTRAL_BORDER_CLASS),
                      selectedId === item.id && 'bg-primary/5',
                    )}
                  >
                    <td className="px-3 py-2.5 align-top text-gray-500 whitespace-nowrap tabular-nums text-xs">
                      <div className="font-medium text-gray-700">
                        {format(date, 'HH:mm:ss.SSS')}
                      </div>
                      <div>{format(date, 'd/M')}</div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          levelLookup(logLevelBadgeClass, item.level, NEUTRAL_BADGE_CLASS),
                        )}
                      >
                        {isKnownLevel(item.level) ? t(`levels.${item.level}`) : item.level || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top max-w-md">
                      {http ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={clsx(
                              'font-mono text-xs font-semibold px-1.5 rounded',
                              httpStatusClass(http.statusCode),
                            )}
                          >
                            {http.statusCode}
                          </span>
                          <span className="font-mono text-xs font-semibold text-gray-700">
                            {http.method}
                          </span>
                          <span className="text-gray-700 truncate">{http.path}</span>
                          {http.durationMs != null && (
                            <span className="text-xs text-gray-400">· {http.durationMs} ms</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-900 line-clamp-2 break-words">{item.message}</p>
                      )}
                      {item.exception && (
                        <p className="font-mono text-[11px] text-danger truncate mt-0.5">
                          {item.exception.split('\n')[0]}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {isHttp && <Tag label={t('table.httpTag')} variant="ext" />}
                        {item.appraisalId && (
                          <Tag
                            label={`appraisal ${shortId(item.appraisalId)}`}
                            title={t('table.filterAppraisal')}
                            onClick={
                              canFilterExactMatch('appraisal', item.appraisalId)
                                ? () => onTagClick('appraisal', item.appraisalId!)
                                : undefined
                            }
                          />
                        )}
                        {item.userName && (
                          <Tag
                            label={`@${item.userName}`}
                            onClick={
                              canFilterExactMatch('user', item.userName)
                                ? () => onTagClick('user', item.userName!)
                                : undefined
                            }
                          />
                        )}
                        {item.requestPath && !isHttp && (
                          <Tag
                            label={
                              item.requestPath.length > 44
                                ? `${item.requestPath.slice(0, 42)}…`
                                : item.requestPath
                            }
                            onClick={() => onTagClick('path', item.requestPath!)}
                          />
                        )}
                        {item.correlationId && (
                          <Tag
                            label={`trace ${shortId(item.correlationId)}`}
                            title={t('table.filterTrace')}
                            onClick={
                              canFilterExactMatch('corr', item.correlationId)
                                ? () => onTagClick('corr', item.correlationId!)
                                : undefined
                            }
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-gray-500 whitespace-nowrap">
                      <div title={item.sourceContext ?? undefined}>
                        {shortSource(item.sourceContext)}
                      </div>
                      <div className="text-gray-400">{item.machineName}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !isError && items.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
          <span>
            {hasNextPage
              ? t('table.showingMore', { count: items.length })
              : t('table.showingAll', { count: items.length })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCopyLink}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              {t('table.copyLink')}
            </button>
            {hasNextPage && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isFetchingNextPage}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-50"
              >
                {isFetchingNextPage ? t('table.loadingMore') : t('table.loadMore')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(LogTable);
