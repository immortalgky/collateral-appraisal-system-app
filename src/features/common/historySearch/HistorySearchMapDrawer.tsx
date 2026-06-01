import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HistorySearchMap } from './HistorySearchMap';
import type { AppraisalPinDto, HistorySearchPeriod, MarketComparablePinDto } from './types';

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
  /**
   * Callback fired when the user selects a pin from the map.
   * Used by "Find Existing" in MarketsTab to link an MC to this appraisal.
   */
  onPinSelect?: (pin: AppraisalPinDto | MarketComparablePinDto) => void;
  /** Footer button label in the pin detail drawer (e.g. "Link to this appraisal"). */
  pinActionLabel?: string;
  /** Spinner/disabled state for that action button. */
  pinActionPending?: boolean;
  /**
   * 'all' (default) — both green appraisal + blue MC pins visible.
   * 'marketComparablesOnly' — only blue MC pins; collateral/appraisal layers hidden.
   */
  pinScope?: 'all' | 'marketComparablesOnly';
  /**
   * Collateral pins for the current appraisal — rendered via 'collateral-appraising' markers.
   * Used on the 360 page to show this appraisal's own properties on the map.
   */
  appraisingCollateralPins?: AppraisalPinDto[];
  /**
   * Optional `appraisalNumber` of the appraising-collateral pin to emphasise as the
   * "main" pin (distinct purple marker). Forwarded to HistorySearchMap.
   */
  primaryAppraisalNumber?: string | null;
  /**
   * MC pins for the current appraisal — rendered via 'mc-appraising' markers.
   * Used on the 360 page to show this appraisal's own linked market comparables.
   */
  appraisingMcPins?: MarketComparablePinDto[];
  /**
   * Open the drawer expanded (near full-screen) rather than the default 90vw/max-w-5xl
   * width. The user can still toggle width via the maximize/restore button in the header.
   */
  defaultExpanded?: boolean;
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
  onPinSelect,
  pinActionLabel,
  pinActionPending,
  pinScope,
  appraisingCollateralPins,
  primaryAppraisalNumber,
  appraisingMcPins,
  defaultExpanded = false,
}: HistorySearchMapDrawerProps) {
  const { t } = useTranslation('historySearch');
  const [expanded, setExpanded] = useState(defaultExpanded);

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
        className={`fixed inset-y-0 right-0 z-50 bg-white shadow-2xl flex flex-col transition-[width,max-width] duration-200 ${
          expanded ? 'w-screen max-w-none' : 'w-[90vw] max-w-5xl'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t('page.title')}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">{t('page.title')}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
              aria-label={expanded ? 'Restore map width' : 'Expand map wider'}
              title={expanded ? 'Restore map width' : 'Expand map wider'}
            >
              {expanded ? (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 4a.75.75 0 01.75.75v2.5a1.5 1.5 0 01-1.5 1.5h-2.5a.75.75 0 010-1.5h2.5v-2.5A.75.75 0 018 4zM12 16a.75.75 0 01-.75-.75v-2.5a1.5 1.5 0 011.5-1.5h2.5a.75.75 0 010 1.5h-2.5v2.5A.75.75 0 0112 16z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.75 4h3.5a.75.75 0 010 1.5H6.31l2.72 2.72a.75.75 0 11-1.06 1.06L5.25 6.56v1.94a.75.75 0 01-1.5 0v-3.5A.75.75 0 014.75 4zM11.75 11.22a.75.75 0 011.06 0l2.44 2.72V12a.75.75 0 011.5 0v3.5a.75.75 0 01-.75.75h-3.5a.75.75 0 010-1.5h1.94l-2.69-2.47a.75.75 0 010-1.06z" />
                </svg>
              )}
            </button>
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
        </div>

        {/* Map — takes remaining height */}
        <div className="flex-1 min-h-0">
          <HistorySearchMap
            mode="embedded"
            initialCenter={initialCenter}
            initialRadiusKm={initialRadiusKm}
            initialPeriod={initialPeriod}
            onPinSelect={onPinSelect}
            pinActionLabel={pinActionLabel}
            pinActionPending={pinActionPending}
            pinScope={pinScope}
            appraisingCollateralPins={appraisingCollateralPins}
            primaryAppraisalNumber={primaryAppraisalNumber}
            appraisingMcPins={appraisingMcPins}
          />
        </div>
      </div>
    </>
  );
}
