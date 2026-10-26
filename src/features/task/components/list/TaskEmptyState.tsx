import { useTranslation } from 'react-i18next';
import { InboxZeroArt, NoResultsArt } from '@/shared/components/illustrations';

/**
 * Nothing to list. With filters or a search in force it says so and offers to drop them; without,
 * it is the tab's own "all clear".
 */
export function TaskEmptyState({
  hasFilters,
  pool = false,
  onClear,
}: {
  hasFilters: boolean;
  pool?: boolean;
  /** Offered with filters in force; without it the empty state gives no button. */
  onClear?: () => void;
}) {
  const { t } = useTranslation('task');
  const empty = pool ? 'empty.pool' : 'empty.my';
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8">
      <div className="flex flex-col items-center gap-4">
        {hasFilters ? (
          <NoResultsArt className="h-24 w-28" />
        ) : (
          <InboxZeroArt className="h-24 w-28" />
        )}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">
            {hasFilters ? t('empty.filteredTitle') : t(`${empty}Title`)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {hasFilters ? t('empty.filteredHint') : t(`${empty}Hint`)}
          </p>
        </div>
        {hasFilters && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('empty.clear')}
          </button>
        )}
      </div>
    </div>
  );
}
