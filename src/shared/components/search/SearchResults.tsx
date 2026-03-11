import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import SearchResultItem from './SearchResultItem';
import type { SearchCategory, SearchFilter, SearchResponse, SearchResultItem as SearchResultItemType } from '@shared/types/search';

interface Props {
  data: SearchResponse | undefined;
  filter: SearchFilter;
  isLoading: boolean;
  isError: boolean;
  isShowingResults: boolean;
  highlightedIndex: number;
  flatResults: SearchResultItemType[];
  recentSearches: string[];
  onSelectResult: (item: SearchResultItemType) => void;
  onSelectRecentSearch: (term: string) => void;
  onRetry: () => void;
}

const categoryLabels: Record<SearchCategory, string> = {
  requests: 'search.filters.requests',
  customers: 'search.filters.customers',
  properties: 'search.filters.properties',
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function SearchResults({
  data,
  filter,
  isLoading,
  isError,
  isShowingResults,
  highlightedIndex,
  flatResults,
  recentSearches,
  onSelectResult,
  onSelectRecentSearch,
  onRetry,
}: Props) {
  const { t } = useTranslation('nav');
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  // Recent searches view
  if (!isShowingResults) {
    return (
      <div className="p-2">
        <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {t('search.recent')}
        </p>
        {recentSearches.length === 0 ? (
          <p className="px-2 py-3 text-sm text-gray-400 text-center">
            {t('search.noRecentSearches', 'Your recent searches will appear here')}
          </p>
        ) : (
          <div className="mt-1 space-y-0.5">
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectRecentSearch(term)}
                className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
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

  // Loading state
  if (isLoading) {
    return (
      <div className="p-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6 text-center">
        <Icon name="circle-exclamation" style="regular" className="size-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-2">{t('search.error', 'Something went wrong')}</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {t('search.retry', 'Try again')}
        </button>
      </div>
    );
  }

  // Empty state
  if (!data || flatResults.length === 0) {
    return (
      <div className="p-6 text-center">
        <Icon name="magnifying-glass" style="regular" className="size-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{t('search.noResults', 'No results found')}</p>
      </div>
    );
  }

  // Results - grouped by category
  if (filter === 'all') {
    const categories: SearchCategory[] = ['requests', 'customers', 'properties'];
    let runningIndex = 0;

    return (
      <div ref={listRef} role="listbox" className="p-2 max-h-80 overflow-y-auto">
        {categories.map(category => {
          const items = data.results[category];
          if (!items || items.length === 0) return null;

          const startIndex = runningIndex;
          runningIndex += items.length;

          return (
            <div key={category} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t(categoryLabels[category] as never)}
              </p>
              <div className="space-y-0.5">
                {items.map((item, idx) => (
                  <SearchResultItem
                    key={item.id}
                    item={item}
                    isHighlighted={highlightedIndex === startIndex + idx}
                    onClick={() => onSelectResult(item)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Results - single category
  return (
    <div ref={listRef} role="listbox" className="p-2 max-h-80 overflow-y-auto">
      <div className="space-y-0.5">
        {flatResults.map((item, idx) => (
          <SearchResultItem
            key={item.id}
            item={item}
            isHighlighted={highlightedIndex === idx}
            onClick={() => onSelectResult(item)}
          />
        ))}
      </div>
    </div>
  );
}
