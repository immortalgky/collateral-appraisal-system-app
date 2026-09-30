import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import DataErrorState from '@/shared/components/DataErrorState';
import { formatDate, formatLocaleDate } from '@/shared/utils/dateUtils';
import { useGetAppraisalDocuments } from '@/features/appraisal/api/appraisalDocuments';
import type { PropertyGroupItemDtoType } from '@shared/schemas/v1';
import { useGetPropertyCorrections } from '../api/appraisalDataCorrection';
import { documentTypeName } from '@/features/appraisal/utils/valuationDocuments';
import { ChangeValues } from './LatestCorrectionCard';
import {
  historyFieldLabel,
  isActionField,
  SUMMARY_HISTORY_FIELD,
} from '../utils/documentCorrection';
import {
  DOCUMENTS_PANE,
  filterByKind,
  groupByDay,
  entryKind,
  propertyFieldLabel,
  targetOf,
  type HistoryEntryKind,
  type HistoryFilter,
} from '../utils/correctionHistory';

const FILTERS: HistoryFilter[] = ['all', 'property', 'documents'];

/** Selected chip colour = the entry labels it filters to (property blue, documents violet). */
const FILTER_STYLE: Record<HistoryFilter, string> = {
  all: 'bg-primary/10 text-primary ring-primary/30',
  property: 'bg-blue-50 text-blue-700 ring-blue-200',
  documents: 'bg-violet-50 text-violet-700 ring-violet-200',
};

/** Timeline dot + label colours per kind of entry (same palette as the layout mock). */
const KIND_STYLE: Record<HistoryEntryKind, { dot: string; pill: string }> = {
  property: { dot: 'bg-blue-400', pill: 'bg-blue-50 text-blue-700' },
  regenerate: { dot: 'bg-violet-400', pill: 'bg-violet-50 text-violet-700' },
  notify: { dot: 'bg-sky-400', pill: 'bg-sky-50 text-sky-700' },
  attach: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700' },
  replace: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700' },
  delete: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700' },
};

/** Filter chips — rendered by the page on the drawer's title row, so the state lives there. */
export const HistoryFilterChips = ({
  value,
  onChange,
}: {
  value: HistoryFilter;
  onChange: (next: HistoryFilter) => void;
}) => {
  const { t } = useTranslation('appraisalDataCorrection');
  return (
    <div className="flex gap-1.5" role="group" aria-label={t('history.title')}>
      {FILTERS.map(f => (
        <button
          key={f}
          type="button"
          aria-pressed={value === f}
          onClick={() => onChange(f)}
          className={clsx(
            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            value === f
              ? clsx('ring-1', FILTER_STYLE[f])
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
          )}
        >
          {t(`history.filter.${f}`)}
        </button>
      ))}
    </div>
  );
};

interface CorrectionHistoryPanelProps {
  appraisalId: string;
  /**
   * Every property on the appraisal, used to label each entry. The history is deliberately
   * NOT filtered to the selected property: corrections usually come in batches across
   * several properties of the same appraisal, and making the admin click through each one
   * to reconstruct what happened defeats the point of having an audit trail.
   */
  properties: PropertyGroupItemDtoType[];
  /** Receives a property id or DOCUMENTS_PANE — the rail entry the clicked row belongs to. */
  onSelectTarget: (id: string) => void;
  filter: HistoryFilter;
}

const CorrectionHistoryPanel = ({
  appraisalId,
  properties,
  onSelectTarget,
  filter,
}: CorrectionHistoryPanelProps) => {
  const { t, i18n } = useTranslation('appraisalDataCorrection');
  const { data, isLoading, isError, refetch } = useGetPropertyCorrections(appraisalId);
  // Already cached by the documents pane; gives document rows a readable name for their type code.
  const { data: documents } = useGetAppraisalDocuments(appraisalId);

  const propertyNameById = useMemo(
    () => new Map(properties.map(p => [p.propertyId, p.propertyName])),
    [properties],
  );

  const documentTypeNames = useMemo(
    () =>
      new Map((documents?.types ?? []).map(ty => [ty.code, documentTypeName(ty, i18n.language)])),
    [documents, i18n.language],
  );

  const corrections = data?.corrections;
  const days = useMemo(
    () => groupByDay(filterByKind(corrections ?? [], filter)),
    [corrections, filter],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="size-5 text-primary animate-spin" />
      </div>
    );
  }

  // A failed load is not "never edited" — saying so would hide the audit trail behind a false empty.
  if (isError && !corrections) {
    return (
      <DataErrorState variant="inline" title={t('history.loadFailed')} onRetry={() => refetch()} />
    );
  }

  if (!corrections || corrections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Icon style="regular" name="clock-rotate-left" className="size-8 text-gray-300" />
        <p className="text-sm text-gray-500">{t('history.empty')}</p>
      </div>
    );
  }

  const fieldLabel = (field: string, isDocument: boolean) =>
    isDocument
      ? historyFieldLabel(field, documentTypeNames, {
          summary: t('history.appraisalSummary'),
          notified: t('history.notifiedSourceSystem'),
          notNotified: t('history.notNotifiedSourceSystem'),
        })
      : propertyFieldLabel(field);

  return (
    <div>
      {days.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">{t('history.noneInFilter')}</p>
      )}

      {days.map(({ day, items }) => (
        <section key={day} className="mb-6">
          <h3 className="mb-3 text-xs font-semibold text-gray-500">
            {formatLocaleDate(items[0].changedAt, i18n.language)}
          </h3>
          <ol className="space-y-5">
            {items.map(correction => {
              // A null property id marks a document / summary-regeneration entry.
              const propertyId = correction.appraisalPropertyId;
              const isDocument = propertyId == null;
              const kind = entryKind(correction);
              const target = targetOf(correction);
              const targetLabel = isDocument
                ? t('history.documents')
                : propertyNameById.get(propertyId) || t('detail.unnamedProperty');
              // A property that is no longer on the appraisal has no rail entry to jump to.
              const canSelect = target === DOCUMENTS_PANE || propertyNameById.has(target);
              return (
                <li key={correction.id} className="grid grid-cols-[10px_minmax(0,1fr)] gap-3">
                  <span
                    aria-hidden="true"
                    className={clsx('mt-1.5 size-2.5 rounded-full', KIND_STYLE[kind].dot)}
                  />
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          KIND_STYLE[kind].pill,
                        )}
                      >
                        {t(`history.kind.${kind}`)}
                      </span>
                      {canSelect ? (
                        <button
                          type="button"
                          onClick={() => onSelectTarget(target)}
                          className="truncate rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          {targetLabel}
                        </button>
                      ) : (
                        <span className="truncate text-xs font-semibold text-gray-700">
                          {targetLabel}
                        </span>
                      )}
                    </div>

                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 rounded-md bg-gray-50 px-3 py-2 text-xs">
                      {correction.changes.map((change, idx) => (
                        <Fragment key={`${correction.id}-${idx}`}>
                          <dt className="text-gray-500">{fieldLabel(change.field, isDocument)}</dt>
                          <dd className="min-w-0 break-words text-gray-900">
                            {isDocument && isActionField(change.field) ? (
                              // One-off actions, not a value that changed: no struck-through "from".
                              // The backend writes an English literal for a regeneration; localize it.
                              change.field === SUMMARY_HISTORY_FIELD ? (
                                t('history.regenerationRequested')
                              ) : (
                                (change.to ?? '—')
                              )
                            ) : (
                              <ChangeValues
                                from={change.from}
                                to={change.to}
                                empty={isDocument ? t('history.deleted') : '—'}
                              />
                            )}
                          </dd>
                        </Fragment>
                      ))}
                    </dl>

                    {correction.reason && (
                      <p className="text-xs text-gray-600">
                        <span className="text-gray-400">{t('history.reasonLabel')}</span>{' '}
                        <span className="italic">{correction.reason}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400">
                      {formatDate(correction.changedAt, 'HH:mm')} · {correction.changedBy}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};

export default CorrectionHistoryPanel;
