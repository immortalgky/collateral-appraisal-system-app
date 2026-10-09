import { useState } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import Icon from '@shared/components/Icon';
import { useGetLogById } from '../api/useGetLogById';
import { useGetLogTrace } from '../api/useGetLogs';
import {
  isKnownLevel,
  levelLookup,
  logLevelBadgeClass,
  logLevelDotColor,
  NEUTRAL_BADGE_CLASS,
  NEUTRAL_DOT_COLOR,
  type LogListItem,
} from '../types';
import {
  httpStatusClass,
  isHttpLoggingRow,
  parseHttpLogMessage,
} from '../utils/parseHttpLogMessage';
import { aroundRange, toApiDateTime } from '../utils/range';
import { copyToClipboard } from '../utils/clipboard';
import { canFilterExactMatch } from '../utils/queryTokens';

interface LogDetailDrawerProps {
  item: LogListItem | null;
  onClose: () => void;
  onFilter: (key: string, value: string) => void;
  /** Bare-GUID filter, for the id fields the search language doesn't have a `key:` for
   * (entityId, workflowInstanceId, collateralId, documentId) — pasting a plain GUID already
   * searches every id column at once, so the filter link just appends the value itself. */
  onFilterId: (id: string) => void;
  onAroundLog: (timeStamp: string) => void;
  /** "View all" from the trace tab's hasMore banner — applies `corr:<id>` to the main search with
   * the same ±60min window the trace itself was fetched with. */
  onViewFullTrace: (correlationId: string, from: string, to: string) => void;
}

type Tab = 'detail' | 'trace' | 'properties';

const LabelValue = ({
  label,
  value,
  onFilter,
  filterLabel,
}: {
  label: string;
  value: string | null;
  onFilter?: () => void;
  filterLabel?: string;
}) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-sm text-gray-900 break-all flex items-center gap-2">
      {value ?? <span className="text-gray-300">—</span>}
      {value && onFilter && (
        <button
          type="button"
          onClick={onFilter}
          className="text-xs text-primary underline shrink-0"
        >
          {filterLabel}
        </button>
      )}
    </span>
  </div>
);

const safeParseJson = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/** own = our modules, framework = infra noise, header = the exception type / inner-exception line. */
const stackLineClass = (line: string, index: number): string => {
  if (index === 0 || /^\s*--->/.test(line)) return 'text-red-300';
  if (
    /\bat (Appraisal|Request|Workflow|Auth|Collateral|Document|Integration|Notification|Parameter|Common|Reporting|Shared\.(?!Behaviors))/.test(
      line,
    )
  )
    return 'text-teal-300';
  if (/\bat (Microsoft|System|Dapper|MassTransit|Shared\.Behaviors)/.test(line))
    return 'opacity-40';
  return '';
};

const CopyButton = ({
  copyKey,
  activeKey,
  onCopy,
  label,
  copiedLabel,
}: {
  copyKey: string;
  activeKey: string | null;
  onCopy: (key: string) => void;
  label: string;
  copiedLabel: string;
}) => (
  <button
    type="button"
    onClick={() => onCopy(copyKey)}
    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
  >
    <Icon
      name={activeKey === copyKey ? 'circle-check' : 'copy'}
      style="regular"
      className="size-3.5"
    />
    {activeKey === copyKey ? copiedLabel : label}
  </button>
);

interface DrawerBodyProps {
  item: LogListItem;
  onFilter: (key: string, value: string) => void;
  onFilterId: (id: string) => void;
  onAroundLog: (timeStamp: string) => void;
  onViewFullTrace: (correlationId: string, from: string, to: string) => void;
}

/**
 * Everything below the drawer's open/close chrome — mounted fresh (via a `key={item.id}` at the
 * call site) whenever the selected row changes, so `tab`/`copiedKey` reset to their initial
 * values for free. A `useEffect` reset used to do this after the fact, which meant the FIRST
 * render for a newly-clicked row still had the previous row's `tab === 'trace'`, firing a trace
 * request for a tab the user hadn't chosen yet.
 */
const DrawerBody = ({
  item,
  onFilter,
  onFilterId,
  onAroundLog,
  onViewFullTrace,
}: DrawerBodyProps) => {
  const { t } = useTranslation('logAdmin');
  const [tab, setTab] = useState<Tab>('detail');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: detail, isLoading: isDetailLoading } = useGetLogById(item.id);
  // ±60min around the clicked row — an omitted range would default to the BE's last 24h, missing
  // the trace entirely once this is opened on an older row. Only fetched once the Trace tab is
  // actually open, not on every row click.
  const traceRangeDates = aroundRange(new Date(item.timeStamp), 60);
  const traceRange = {
    from: toApiDateTime(traceRangeDates.from),
    to: toApiDateTime(traceRangeDates.to),
  };
  const { data: traceResult, isLoading: isTraceLoading } = useGetLogTrace(
    item.correlationId,
    traceRange,
    tab === 'trace',
  );
  const trace = traceResult?.items ?? [];

  const row = detail ?? item;
  const isHttp = isHttpLoggingRow(row.sourceContext);
  const properties = safeParseJson(detail?.properties);
  // The stored document is the Serilog LogEvent JSON — the fields we care about (RequestBody,
  // ResponseBody, SourceContext, ...) live one level down, under a nested "Properties" key. The
  // Properties JSON tab still shows the whole `properties` document as-is.
  const props = (properties?.Properties ?? properties) as
    | Record<string, unknown>
    | null
    | undefined;
  const requestBody = props?.RequestBody;
  const responseBody = props?.ResponseBody;

  // The structured Properties.{Method,Path,StatusCode,Duration} (numbers, exact) are preferred
  // once the detail row has loaded; parseHttpLogMessage is a same-render-cycle fallback for the
  // instant the drawer opens (before useGetLogById resolves) and for the table, which only ever
  // has the message.
  const http = isHttp ? parseHttpLogMessage(row.message) : null;
  const propString = (key: string): string | null => {
    const v = props?.[key];
    return typeof v === 'string' ? v : null;
  };
  const propNumber = (key: string): number | null => {
    const v = props?.[key];
    return typeof v === 'number' ? v : null;
  };
  const httpMethod = propString('Method') ?? http?.method ?? null;
  const httpPath = propString('Path') ?? http?.path ?? null;
  const httpStatus = propNumber('StatusCode') ?? http?.statusCode ?? null;
  const httpDuration = propNumber('Duration') ?? http?.durationMs ?? null;
  const hasHttpFields = isHttp && httpMethod != null && httpPath != null && httpStatus != null;

  const copy = (key: string, text: string) => {
    copyToClipboard(
      text,
      () => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      },
      () => toast.error(t('drawer.copyFailed')),
    );
  };

  const prettyJson = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return JSON.stringify(value, null, 2);
  };

  const traceOrigin = trace[0]?.timeStamp ? new Date(trace[0].timeStamp).getTime() : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'detail', label: t('drawer.tabDetail') },
    {
      key: 'trace',
      label: traceResult
        ? t('drawer.tabTrace', { count: trace.length })
        : t('drawer.tabTracePlain'),
    },
    { key: 'properties', label: t('drawer.tabProperties') },
  ];

  let body: ReactNode;
  if (tab === 'detail') {
    body = (
      <div className="flex flex-col gap-5">
        {hasHttpFields ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <LabelValue label={t('drawer.request')} value={`${httpMethod} ${httpPath}`} />
              <LabelValue
                label={t('drawer.response')}
                value={`${httpStatus}${httpDuration != null ? ` · ${httpDuration} ms` : ''}`}
              />
              <LabelValue label={t('columns.userName')} value={row.userName} />
              <LabelValue
                label={t('columns.correlationId')}
                value={row.correlationId}
                onFilter={
                  row.correlationId && canFilterExactMatch('corr', row.correlationId)
                    ? () => onViewFullTrace(row.correlationId!, traceRange.from, traceRange.to)
                    : undefined
                }
                filterLabel={t('drawer.filterLink')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('drawer.requestBody')}
                </p>
                {requestBody != null && (
                  <CopyButton
                    copyKey="req"
                    activeKey={copiedKey}
                    onCopy={() => copy('req', prettyJson(requestBody))}
                    label={t('drawer.copy')}
                    copiedLabel={t('drawer.copied')}
                  />
                )}
              </div>
              {requestBody != null ? (
                <pre className="text-xs bg-gray-950 text-gray-100 rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-72 leading-relaxed whitespace-pre-wrap">
                  {prettyJson(requestBody)}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  {t('drawer.noBody')}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('drawer.responseBody')}
                </p>
                {responseBody != null && (
                  <CopyButton
                    copyKey="res"
                    activeKey={copiedKey}
                    onCopy={() => copy('res', prettyJson(responseBody))}
                    label={t('drawer.copy')}
                    copiedLabel={t('drawer.copied')}
                  />
                )}
              </div>
              {responseBody != null ? (
                <pre className="text-xs bg-gray-950 text-gray-100 rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-72 leading-relaxed whitespace-pre-wrap">
                  {prettyJson(responseBody)}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  {t('drawer.noBody')}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-400">{t('drawer.httpHint')}</p>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {t('columns.message')}
              </p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words bg-gray-50 rounded-lg px-3 py-2">
                {row.message ?? <span className="text-gray-300">—</span>}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <LabelValue
                label={t('columns.appraisalId')}
                value={row.appraisalId}
                onFilter={
                  row.appraisalId && canFilterExactMatch('appraisal', row.appraisalId)
                    ? () => onFilter('appraisal', row.appraisalId!)
                    : undefined
                }
                filterLabel={t('drawer.filterLink')}
              />
              <LabelValue
                label={t('columns.userName')}
                value={row.userName}
                onFilter={
                  row.userName && canFilterExactMatch('user', row.userName)
                    ? () => onFilter('user', row.userName!)
                    : undefined
                }
                filterLabel={t('drawer.filterLink')}
              />
              <LabelValue label={t('columns.requestPath')} value={row.requestPath} />
              <LabelValue label={t('columns.sourceContext')} value={row.sourceContext} />
              <LabelValue
                label={t('columns.correlationId')}
                value={row.correlationId}
                onFilter={
                  row.correlationId && canFilterExactMatch('corr', row.correlationId)
                    ? () => onViewFullTrace(row.correlationId!, traceRange.from, traceRange.to)
                    : undefined
                }
                filterLabel={t('drawer.filterLink')}
              />
              <LabelValue label={t('columns.requestId')} value={row.requestId} />
              <LabelValue
                label={t('columns.entityId')}
                value={row.entityId}
                onFilter={row.entityId ? () => onFilterId(row.entityId!) : undefined}
                filterLabel={t('drawer.filterLink')}
              />
              <LabelValue
                label={t('columns.workflowInstanceId')}
                value={row.workflowInstanceId}
                onFilter={
                  row.workflowInstanceId ? () => onFilterId(row.workflowInstanceId!) : undefined
                }
                filterLabel={t('drawer.filterLink')}
              />
              <LabelValue
                label={t('columns.collateralId')}
                value={row.collateralId}
                onFilter={row.collateralId ? () => onFilterId(row.collateralId!) : undefined}
                filterLabel={t('drawer.filterLink')}
              />
              <LabelValue
                label={t('columns.documentId')}
                value={row.documentId}
                onFilter={row.documentId ? () => onFilterId(row.documentId!) : undefined}
                filterLabel={t('drawer.filterLink')}
              />
            </div>
            {row.exception && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {t('drawer.exceptionHint')}
                  </p>
                  <CopyButton
                    copyKey="ex"
                    activeKey={copiedKey}
                    onCopy={() => copy('ex', row.exception!)}
                    label={t('drawer.copyStack')}
                    copiedLabel={t('drawer.copied')}
                  />
                </div>
                <pre className="text-xs bg-gray-950 text-red-300 rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-80 leading-relaxed whitespace-pre-wrap">
                  {row.exception.split('\n').map((line, i) => (
                    <span key={i} className={clsx('block', stackLineClass(line, i))}>
                      {line}
                    </span>
                  ))}
                </pre>
              </div>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => onAroundLog(row.timeStamp)}
          className="self-start text-xs font-mono rounded-lg border border-gray-200 px-2 py-1 text-gray-600 hover:border-primary hover:text-primary"
        >
          {t('drawer.aroundThisLog')}
        </button>
      </div>
    );
  } else if (tab === 'trace') {
    body = isTraceLoading ? (
      <p className="text-sm text-gray-400">{t('drawer.loading')}</p>
    ) : trace.length ? (
      <>
        <p className="text-xs text-gray-500 mb-3">{t('drawer.traceHint')}</p>
        <ul className="flex flex-col">
          {trace.map(x => {
            const offset =
              traceOrigin != null ? (new Date(x.timeStamp).getTime() - traceOrigin) / 1000 : 0;
            const xHttp = isHttpLoggingRow(x.sourceContext) ? parseHttpLogMessage(x.message) : null;
            return (
              <li
                key={x.id}
                className={clsx(
                  'grid grid-cols-[70px_auto_1fr] gap-2 items-start py-1.5 px-1 rounded-lg',
                  x.id === row.id && 'bg-primary/5',
                )}
              >
                <span className="font-mono text-[11px] text-gray-400 tabular-nums pt-0.5">
                  +{offset.toFixed(3)}s
                </span>
                <span
                  className="size-2 rounded-full mt-1.5"
                  style={{
                    backgroundColor: levelLookup(logLevelDotColor, x.level, NEUTRAL_DOT_COLOR),
                  }}
                />
                <span className="text-sm text-gray-800 min-w-0">
                  {xHttp ? (
                    <>
                      <span
                        className={clsx(
                          'font-mono text-xs font-semibold px-1 rounded mr-1',
                          httpStatusClass(xHttp.statusCode),
                        )}
                      >
                        {xHttp.statusCode}
                      </span>
                      {xHttp.method} {xHttp.path}
                    </>
                  ) : (
                    x.message
                  )}
                  <br />
                  <span className="text-xs text-gray-400">
                    {x.sourceContext?.split('.').at(-1)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {traceResult?.hasMore && row.correlationId && (
          <p className="text-xs text-gray-500 mt-2">
            {t('drawer.traceHasMoreText')}{' '}
            <button
              type="button"
              onClick={() => onViewFullTrace(row.correlationId!, traceRange.from, traceRange.to)}
              className="text-primary font-medium underline"
            >
              {t('drawer.traceHasMoreLink')}
            </button>
          </p>
        )}
      </>
    ) : (
      <p className="text-sm text-gray-400">{t('drawer.noTrace')}</p>
    );
  } else {
    body = (
      <pre className="text-xs bg-gray-950 text-gray-100 rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-[70vh] leading-relaxed whitespace-pre-wrap">
        {isDetailLoading
          ? t('drawer.loading')
          : JSON.stringify(
              {
                timeStamp: row.timeStamp,
                level: row.level,
                messageTemplate: detail?.messageTemplate ?? null,
                properties,
              },
              null,
              2,
            )}
      </pre>
    );
  }

  return (
    <div className="flex flex-col gap-4 -mt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              levelLookup(logLevelBadgeClass, row.level, NEUTRAL_BADGE_CLASS),
            )}
          >
            {isKnownLevel(row.level) ? t(`levels.${row.level}`) : row.level || '—'}
          </span>
          {isHttp && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {t('table.httpTag')}
            </span>
          )}
          <span className="text-xs font-mono text-gray-400">#{row.id}</span>
          <span className="text-xs text-gray-400">
            {format(new Date(row.timeStamp), 'd/M/yyyy HH:mm:ss.SSS')} · {row.machineName}
          </span>
        </div>
        <CopyButton
          copyKey="all"
          activeKey={copiedKey}
          onCopy={() => copy('all', JSON.stringify(row, null, 2))}
          label={t('drawer.copyAll')}
          copiedLabel={t('drawer.copied')}
        />
      </div>

      <div className="flex gap-4 border-b border-gray-200 -mx-6 px-6">
        {tabs.map(tabDef => (
          <button
            key={tabDef.key}
            type="button"
            onClick={() => setTab(tabDef.key)}
            className={clsx(
              'pb-2 -mb-px border-b-2 text-sm font-medium transition-colors',
              tab === tabDef.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {tabDef.label}
          </button>
        ))}
      </div>

      {body}
    </div>
  );
};

const LogDetailDrawer = ({
  item,
  onClose,
  onFilter,
  onFilterId,
  onAroundLog,
  onViewFullTrace,
}: LogDetailDrawerProps) => {
  const { t } = useTranslation('logAdmin');

  return (
    <SlideOverPanel
      isOpen={!!item}
      onClose={onClose}
      title={t('drawer.title')}
      subtitle={item?.level}
      width="2xl"
    >
      {item && (
        <DrawerBody
          key={item.id}
          item={item}
          onFilter={onFilter}
          onFilterId={onFilterId}
          onAroundLog={onAroundLog}
          onViewFullTrace={onViewFullTrace}
        />
      )}
    </SlideOverPanel>
  );
};

export default LogDetailDrawer;
