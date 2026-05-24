import { useTranslation } from 'react-i18next';
import { HistorySearchMap } from '../HistorySearchMap';

/**
 * Standalone full-page wrapper for the History Search (Pin) feature.
 * Registered at /standalone/history-search.
 */
function HistorySearchPage() {
  const { t } = useTranslation('historySearch');

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="history-search-page">
      {/* Page header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-base font-semibold text-gray-900">{t('page.title')}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{t('page.description')}</p>
      </div>

      {/* Map fills remaining space */}
      <div className="flex-1 min-h-0">
        <HistorySearchMap mode="standalone" initialRadiusKm={1} initialPeriod="Past3y" />
      </div>
    </div>
  );
}

export default HistorySearchPage;
