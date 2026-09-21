import { useTranslation } from 'react-i18next';
import { MIN_SEARCH_LENGTH } from '@shared/api/search';
import { InboxZeroArt, NoResultsArt } from '@/shared/components/illustrations';
import SearchTips from './SearchTips';

/**
 * What the list shows when nothing matched.
 *
 * Two different empties, two different messages — the same split the task screens make. A search
 * or filter that found nothing is a disappointment worth explaining; a list that is empty because
 * the user has no appraisals yet is not a failure, and telling a new external-company user to
 * "adjust your filters" would be nonsense.
 *
 * The four search rules ride along when a search or filter is what emptied the list — that is the
 * moment people want them. The list of WHICH fields "all fields" covers does not: that answers
 * "what can I search for", a question about the box rather than about this result set, and it
 * lives in the toolbar's "can't find it?" button.
 */
function AppraisalEmptyState({ isFiltered }: { isFiltered: boolean }) {
  const { t } = useTranslation('appraisal');

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-1">
      {isFiltered ? <NoResultsArt className="h-28 w-32" /> : <InboxZeroArt className="h-28 w-32" />}
      <p className="font-medium text-gray-600">
        {isFiltered ? t('list.empty') : t('list.emptyAll')}
      </p>
      <p className="text-xs text-gray-400">
        {isFiltered ? t('list.emptyHint') : t('list.emptyAllHint')}
      </p>
      {isFiltered && (
        <div className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-left text-xs font-medium text-gray-700">
            {t('list.searchTips.title')}
          </p>
          <SearchTips minLength={MIN_SEARCH_LENGTH} />
        </div>
      )}
    </div>
  );
}

export default AppraisalEmptyState;
