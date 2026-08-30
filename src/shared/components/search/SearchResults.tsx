import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import SearchResultItem from './SearchResultItem';
import { groupKey } from '@shared/utils/searchGrouping';
import type { MatchKind, SearchAppraisal, SearchGroup } from '@shared/types/search';

interface Props {
  /** Exact document-number hits, pinned above the rest. Ordered by the hook. */
  exactGroups: SearchGroup[];
  restGroups: SearchGroup[];
  collapsedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  isLoading: boolean;
  isError: boolean;
  isShowingResults: boolean;
  expandSubstring: boolean;
  highlightedIndex: number;
  seeAllIndex: number;
  totalMatched: number;
  recentSearches: string[];
  onOpenResult: (item: SearchAppraisal) => void;
  onOpenFullResults: () => void;
  onSelectRecentSearch: (term: string) => void;
  onSearchSubstring: () => void;
  onRetry: () => void;
}

const matchKindIcon: Record<MatchKind, string> = {
  document: 'hashtag',
  customer: 'user',
  property: 'building',
  request: 'pen-to-square',
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-base-300" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-200 dark:bg-base-300 rounded w-2/3" />
        <div className="h-3 bg-gray-100 dark:bg-base-300 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function SearchResults({
  exactGroups,
  restGroups,
  collapsedGroups,
  onToggleGroup,
  isLoading,
  isError,
  isShowingResults,
  expandSubstring,
  highlightedIndex,
  seeAllIndex,
  totalMatched,
  recentSearches,
  onOpenResult,
  onOpenFullResults,
  onSelectRecentSearch,
  onSearchSubstring,
  onRetry,
}: Props) {
  const { t } = useTranslation('nav');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    listRef.current
      .querySelector(`#search-result-${highlightedIndex}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  if (!isShowingResults) {
    return (
      <div className="p-2">
        <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {t('search.recent')}
        </p>
        {recentSearches.length === 0 ? (
          <p className="px-2 py-3 text-sm text-gray-400 text-center">
            {t('search.noRecentSearches')}
          </p>
        ) : (
          <div className="mt-1 space-y-0.5">
            {recentSearches.map(term => (
              <button
                key={term}
                type="button"
                onClick={() => onSelectRecentSearch(term)}
                className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-base-300 transition-colors"
              >
                <Icon name="clock-rotate-left" style="regular" className="size-4 text-gray-400" />
                {term}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <Icon
          name="circle-exclamation"
          style="regular"
          className="size-8 text-red-400 mx-auto mb-2"
        />
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('search.error')}</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {t('search.retry')}
        </button>
      </div>
    );
  }

  if (exactGroups.length === 0 && restGroups.length === 0) {
    return (
      <div className="p-6 text-center">
        <Icon name="magnifying-glass" style="regular" className="size-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{t('search.noResults')}</p>
        {/*
          Names are matched by prefix, so a surname alone finds nothing. Rather than make every
          keystroke pay for a substring scan, offer it here — once, and only when the fast search
          has already come up empty.
        */}
        {!expandSubstring && (
          <button
            type="button"
            onClick={onSearchSubstring}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-base-300 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-base-300 transition-colors"
          >
            <Icon name="magnifying-glass-plus" style="regular" className="size-3.5" />
            {t('search.searchSubstring')}
          </button>
        )}
      </div>
    );
  }

  // Index must advance in exactly the order the hook flattened: exact groups first, and rows
  // inside a folded group contribute nothing.
  let runningIndex = 0;

  return (
    <div ref={listRef} role="listbox" className="max-h-[28rem] overflow-y-auto">
      {expandSubstring && (
        <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-base-300 border-b border-amber-100 dark:border-base-300">
          {t('search.substringActive')}
        </p>
      )}

      {exactGroups.length > 0 && (
        <div className="p-2 border-b border-gray-100 dark:border-base-300">
          <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('search.exactMatch')}
          </p>
          <div className="space-y-0.5">
            {exactGroups.flatMap(group =>
              group.appraisals.map(item => {
                const index = runningIndex++;
                return (
                  <SearchResultItem
                    key={item.appraisalId}
                    item={item}
                    index={index}
                    isHighlighted={highlightedIndex === index}
                    onClick={() => onOpenResult(item)}
                  />
                );
              }),
            )}
          </div>
        </div>
      )}

      {restGroups.map(group => {
        const key = groupKey(group);
        const isCollapsed = collapsedGroups.has(key);

        // A group of one is just a result. Searching a common given name produces a group per
        // person, and a header reading "1 appraisal" over every single row is noise — the row's own
        // badge already names the field and value that matched.
        if (group.appraisals.length === 1) {
          const item = group.appraisals[0];
          const index = runningIndex++;
          return (
            <div key={key} className="p-2 border-b border-gray-100 dark:border-base-300 last:border-b-0">
              <SearchResultItem
                item={item}
                index={index}
                isHighlighted={highlightedIndex === index}
                onClick={() => onOpenResult(item)}
              />
            </div>
          );
        }

        return (
          <div key={key} className="border-b border-gray-100 dark:border-base-300 last:border-b-0">
            <button
              type="button"
              onClick={() => onToggleGroup(key)}
              aria-expanded={!isCollapsed}
              className="flex items-center gap-2 w-full px-3 py-2 text-left bg-gray-50 dark:bg-base-300 hover:bg-gray-100 dark:hover:bg-base-200 transition-colors"
            >
              <Icon
                name={matchKindIcon[group.matchKind]}
                style="solid"
                className="size-3 text-gray-400 shrink-0"
              />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 shrink-0">
                {t(`search.fields.${group.matchField}` as never, { defaultValue: group.matchField })}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-base-content truncate">
                {group.matchLabel}
              </span>
              <span className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold text-primary-700 bg-primary-50">
                {t('search.appraisalCount', { count: group.appraisalCount })}
              </span>
              <Icon
                name="chevron-down"
                style="solid"
                className={clsx(
                  'size-3 text-gray-400 shrink-0 transition-transform',
                  isCollapsed && '-rotate-90',
                )}
              />
            </button>

            {!isCollapsed && (
              <div className="p-2 space-y-0.5">
                {group.appraisals.map(item => {
                  const index = runningIndex++;
                  return (
                    <SearchResultItem
                      key={item.appraisalId}
                      item={item}
                      index={index}
                      isHighlighted={highlightedIndex === index}
                      suppressField={group.matchField}
                      onClick={() => onOpenResult(item)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        id={`search-result-${seeAllIndex}`}
        onClick={onOpenFullResults}
        className={clsx(
          'flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-primary-600 border-t border-gray-100 dark:border-base-300 transition-colors',
          highlightedIndex === seeAllIndex ? 'bg-primary-50' : 'hover:bg-primary-50/60',
        )}
      >
        <Icon name="arrow-up-right-from-square" style="solid" className="size-3.5" />
        {t('search.seeAll', { count: totalMatched })}
      </button>
    </div>
  );
}
