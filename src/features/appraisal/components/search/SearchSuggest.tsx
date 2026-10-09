import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import type { AppraisalDto } from '../../api/appraisalSearch';
import SearchTips from './SearchTips';

export interface SuggestFieldOption {
  value: string;
  label: string;
  icon: string;
}

interface SearchSuggestProps {
  /** The term as typed. Empty shows recent searches and the tips instead of results. */
  term: string;
  /** True once `items` and `counts` answer `term` — false while it is still being debounced. */
  isSettled: boolean;
  /** The table's search failed: its (absent) rows are not "no match". */
  failed?: boolean;
  minLength: number;
  items: AppraisalDto[];
  fieldOptions: SuggestFieldOption[];
  /** Rows each field would return. `undefined` while that count is in flight, `null` if it failed. */
  counts: Record<string, number | null | undefined>;
  recent: string[];
  /** Index into the selectable rows, for arrow-key navigation; -1 for none. */
  activeIndex: number;
  onPickItem: (item: AppraisalDto) => void;
  onPickField: (field: string) => void;
  onPickRecent: (term: string) => void;
}

/**
 * The panel under the search box.
 *
 * Results come from the query the table already runs — the first rows of the current page — so
 * "go to appraisal" costs no request of its own. Only the per-field counts do.
 *
 * Every selectable row carries `data-suggest-item`: the page's arrow-key handler walks those in
 * DOM order, so this component does not have to mirror the list it renders.
 */
function SearchSuggest({
  term,
  isSettled,
  failed = false,
  minLength,
  items,
  fieldOptions,
  counts,
  recent,
  activeIndex,
  onPickItem,
  onPickField,
  onPickRecent,
}: SearchSuggestProps) {
  const { t } = useTranslation('appraisal');
  const trimmed = term.trim();
  let index = -1;
  const rowClass = (i: number) =>
    `flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
      i === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
    }`;

  const section = (title: string, body: ReactNode) => (
    <div className="border-b border-gray-100 p-1.5 last:border-b-0">
      <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      {body}
    </div>
  );

  let content: ReactNode;
  if (!trimmed) {
    content = (
      <>
        {recent.length > 0 &&
          section(
            t('list.suggest.recent'),
            recent.map(r => {
              const i = ++index;
              return (
                <button
                  key={r}
                  type="button"
                  data-suggest-item
                  onClick={() => onPickRecent(r)}
                  className={rowClass(i)}
                >
                  <Icon style="solid" name="clock-rotate-left" className="size-3 text-gray-400" />
                  {r}
                </button>
              );
            }),
          )}
        <div className="p-3.5">
          <p className="text-sm font-medium text-gray-900">{t('list.searchTips.title')}</p>
          <SearchTips minLength={minLength} showCoverage className="mt-2" />
          <p className="mt-3 border-t border-gray-100 pt-2.5 text-[11px] text-gray-400">
            {t('list.suggest.shortcut')}
          </p>
        </div>
      </>
    );
  } else if (trimmed.length < minLength) {
    content = (
      <p className="p-3.5 text-xs text-amber-600">
        {t('list.searchTooShort', { count: minLength })}
      </p>
    );
  } else {
    content = (
      <>
        {section(
          t('list.suggest.goTo'),
          !isSettled ? (
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-gray-400">
              <Icon style="solid" name="spinner" className="size-3 animate-spin" />
            </div>
          ) : failed ? (
            <p className="px-2.5 py-2 text-xs text-gray-400">—</p>
          ) : items.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-gray-400">{t('list.suggest.noMatch')}</p>
          ) : (
            items.map(item => {
              const i = ++index;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-suggest-item
                  onClick={() => onPickItem(item)}
                  className={rowClass(i)}
                >
                  <span className="shrink-0 font-medium text-primary">{item.appraisalNumber}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-700">{item.customerName}</span>
                  <Badge type="status" value={item.status} size="sm">
                    {t(`list.status.${item.status}`, { defaultValue: item.status })}
                  </Badge>
                </button>
              );
            })
          ),
        )}
        {section(
          t('list.suggest.searchIn', { term: trimmed }),
          fieldOptions.map(f => {
            const i = ++index;
            const count = counts[f.value];
            return (
              <button
                key={f.value}
                type="button"
                data-suggest-item
                onClick={() => onPickField(f.value)}
                className={rowClass(i)}
              >
                <Icon style="solid" name={f.icon} className="size-3 text-primary" />
                {f.label}
                <span className="ml-auto text-xs tabular-nums text-gray-400">
                  {count === undefined ? (
                    <Icon style="solid" name="spinner" className="size-3 animate-spin" />
                  ) : count === null ? (
                    '—'
                  ) : count > 0 ? (
                    t('list.suggest.matches', { count: count.toLocaleString() })
                  ) : (
                    t('list.suggest.none')
                  )}
                </span>
              </button>
            );
          }),
        )}
      </>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-[min(70vh,calc(100dvh-16rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
      {content}
      <div className="flex flex-wrap gap-3 border-t border-gray-100 bg-gray-50 px-3.5 py-2 text-[11px] text-gray-500">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> {t('list.suggest.navigate')}
        </span>
        <span>
          <Kbd>Enter</Kbd> {t('list.suggest.submit')}
        </span>
        <span>
          <Kbd>Esc</Kbd> {t('list.suggest.close')}
        </span>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-b-2 border-gray-200 bg-white px-1 font-mono text-[10px] text-gray-500">
      {children}
    </kbd>
  );
}

export default SearchSuggest;
