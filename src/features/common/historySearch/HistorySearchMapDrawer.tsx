import { useTranslation } from 'react-i18next';
import { HistorySearchMap } from './HistorySearchMap';
import type { HistorySearchPeriod } from './types';

interface HistorySearchMapDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Prefilled center from the embedding screen (e.g. appraisal collateral coords).
   * TODO: pass real lat/lon from appraisal context once coordinates are
   * exposed via useAppraisalContext or a dedicated hook.
   */
  initialCenter?: { lat: number; lon: number };
  initialRadiusKm?: number;
  initialPeriod?: HistorySearchPeriod;
}

/**
 * Headless slide-over drawer that hosts <HistorySearchMap mode="embedded" />.
 * Used on the Summary & Decision page (and anywhere else an embedded map is needed).
 *
 * Does not rely on HeadlessUI Dialog so it stays zero-dependency and avoids
 * conflicts with existing modal z-index stacking.
 */
export function HistorySearchMapDrawer({
  isOpen,
  onClose,
  initialCenter,
  initialRadiusKm = 1,
  initialPeriod = 'Past3y',
}: HistorySearchMapDrawerProps) {
  const { t } = useTranslation('historySearch');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-[90vw] max-w-5xl bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={t('page.title')}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">{t('page.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
            aria-label={t('pinDetail.close')}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Map — takes remaining height */}
        <div className="flex-1 min-h-0">
          <HistorySearchMap
            mode="embedded"
            initialCenter={initialCenter}
            initialRadiusKm={initialRadiusKm}
            initialPeriod={initialPeriod}
          />
        </div>
      </div>
    </>
  );
}
