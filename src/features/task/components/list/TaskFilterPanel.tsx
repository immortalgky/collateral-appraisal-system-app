import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { DateRangeInput } from '@/shared/components/inputs';
import type { FilterField } from '@/features/appraisal/components/search/tabConfigs';
import {
  hasValue,
  selectedValues,
  useFilterFieldOptions,
} from '@/features/appraisal/components/search/filterOptions';
import { ActivityTile } from './ActivityTile';

interface TaskFilterPanelProps {
  /** The filters with an input (the hidden legacy ones are left out). */
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
  /**
   * Tasks per task type for the shown tab (the API's per-activity counts), or null while they load.
   * The other facets have no count in any API response, so none is drawn for them.
   */
  taskTypeCounts: Map<string, number> | null;
}

const GROUP = 'border-b border-gray-100 px-4 py-3';

function GroupTitle({ label, active }: { label: string; active: string }) {
  return (
    <div className="mb-1 flex items-center justify-between text-sm font-semibold text-gray-800">
      {label}
      {active && <em className="text-xs font-medium text-primary not-italic">{active}</em>}
    </div>
  );
}

/** One list filter: a checkbox per value, several at once. */
function Facet({
  field,
  values,
  onChange,
  onRemove,
  counts,
}: {
  field: FilterField;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  counts: Map<string, number> | null;
}) {
  const { t } = useTranslation('task');
  const options = useFilterFieldOptions(field);
  const selected = selectedValues(values, field.key);
  const isTaskType = field.key === 'activityId';
  // Task types: only those with tasks (and any ticked) until asked for the rest — 21 rows, most 0
  const [showAll, setShowAll] = useState(false);
  const trimmed = isTaskType && counts !== null;
  const shown =
    trimmed && !showAll
      ? options.filter(o => (counts.get(o.value) ?? 0) > 0 || selected.includes(o.value))
      : options;

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    // Nothing ticked is no filter: drop the key rather than leave an empty one behind.
    if (next.length) onChange(field.key, next.join(','));
    else onRemove(field.key);
  };

  return (
    <div role="group" aria-label={field.label} className={GROUP}>
      <GroupTitle
        label={field.label}
        active={selected.length ? t('panel.selectedCount', { count: selected.length }) : ''}
      />
      {options.length === 0 ? (
        <p className="py-1 text-xs text-gray-400">{t('panel.noOptions')}</p>
      ) : (
        shown.map(option => {
          const on = selected.includes(option.value);
          const count = isTaskType && counts ? (counts.get(option.value) ?? 0) : undefined;
          return (
            <label
              key={option.value}
              className={`-mx-1.5 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-gray-50 ${
                count === 0 && !on ? 'text-gray-400' : 'text-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(option.value)}
                className="checkbox checkbox-xs checkbox-primary shrink-0 rounded-[4px]"
              />
              {isTaskType && <ActivityTile activityId={option.value} size="sm" />}
              <span className="min-w-0 flex-1 truncate" title={option.label}>
                {option.label}
              </span>
              {count !== undefined && (
                <span className="text-xs text-gray-400 tabular-nums">{count}</span>
              )}
            </label>
          );
        })
      )}
      {trimmed && (showAll || shown.length < options.length) && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {showAll ? t('panel.showFewer') : t('panel.showAll', { count: options.length })}
        </button>
      )}
    </div>
  );
}

/** One date range filter. */
function Range({
  field,
  values,
  onChange,
  onRemove,
}: {
  field: FilterField;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  const { t } = useTranslation('task');
  const fromKey = field.fromKey ?? '';
  const toKey = field.toKey ?? '';
  const write = (key: string, value: string) => (value ? onChange(key, value) : onRemove(key));
  return (
    <div role="group" aria-label={field.label} className={GROUP}>
      <GroupTitle label={field.label} active={hasValue(values, field) ? t('panel.inUse') : ''} />
      <DateRangeInput
        from={values[fromKey] || ''}
        to={values[toKey] || ''}
        onChange={(from, to) => {
          write(fromKey, from);
          write(toKey, to);
        }}
        placeholder={field.label}
        // two dd/MM/yyyy dates must fit the 224px panel, calendar button included
        className="pl-2! text-xs!"
      />
    </div>
  );
}

/**
 * The filters as a card beside the table, for a content area wide enough to spare the room: every
 * list filter at once with its values ticked in place, and the three date ranges. It edits the same
 * filter state as the chip bar, which it replaces.
 */
export function TaskFilterPanel({
  fields,
  values,
  onChange,
  onRemove,
  onClear,
  onClose,
  taskTypeCounts,
}: TaskFilterPanelProps) {
  const { t } = useTranslation(['task', 'common']);
  return (
    <aside
      aria-label={t('task:panel.title')}
      className="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-base font-semibold text-gray-800">
        {t('task:panel.title')}
        <span className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('common:actions.clearAll')}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('task:panel.hide')}
            title={t('task:panel.hide')}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            <Icon style="solid" name="xmark" className="text-xs" />
          </button>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {fields.map(field =>
          field.type === 'date-range' ? (
            <Range
              key={field.key}
              field={field}
              values={values}
              onChange={onChange}
              onRemove={onRemove}
            />
          ) : (
            <Facet
              key={field.key}
              field={field}
              values={values}
              onChange={onChange}
              onRemove={onRemove}
              counts={taskTypeCounts}
            />
          ),
        )}
      </div>
    </aside>
  );
}
