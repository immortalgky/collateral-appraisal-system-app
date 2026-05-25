import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { CollateralPinDto, HistorySearchFormValues, HistorySearchPeriod, MarketComparablePinDto, PinFilterState } from './types';
import { useHistorySearch } from './hooks/useHistorySearch';
import { useUserVisibility } from './hooks/useUserVisibility';
import { SearchPanel } from './components/SearchPanel';
import { MapView } from './components/MapView';
import { MapPinFilterPanel } from './components/MapPinFilterPanel';
import { ResultsList } from './components/ResultsList';
import { PinDetailDrawer } from './components/PinDetailDrawer';
import { CollateralDetailDrawer } from './components/CollateralDetailDrawer';

// ─── Public component API ─────────────────────────────────────────────────────

export interface HistorySearchMapProps {
  mode: 'standalone' | 'embedded';
  initialCenter?: { lat: number; lon: number };
  initialRadiusKm?: number;
  initialPeriod?: HistorySearchPeriod;
  onPinSelect?: (pin: CollateralPinDto | MarketComparablePinDto) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// The FSD Collateral Type dropdown is single-select, but the backend stores three distinct
// leasehold codes. Expand the chosen option to the matching code(s) so "Leasehold" matches all.
function expandCollateralType(code: string): string[] {
  return code === 'LSL' ? ['LSL', 'LSB', 'LS'] : [code];
}

function buildFormDefaults(props: HistorySearchMapProps): Partial<HistorySearchFormValues> {
  return {
    centerLat: props.initialCenter ? String(props.initialCenter.lat) : '',
    centerLon: props.initialCenter ? String(props.initialCenter.lon) : '',
    radiusKm: String(props.initialRadiusKm ?? 1),
    period: props.initialPeriod ?? 'Past3y',
  };
}

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * The public shell of the History Search (Pin) feature.
 *
 * Modes:
 * - standalone: Search panel visible, user must click Search. No auto-fire.
 * - embedded: Prefilled with appraisal coordinates, fires search on mount.
 *
 * Layout:
 * [SearchPanel 220px | MapView flex-1 | ResultsList 280px]
 * Pin filter bar sits above MapView.
 * PinDetailDrawer overlays the right side on click.
 */
export function HistorySearchMap(props: HistorySearchMapProps) {
  const { mode, onPinSelect } = props;
  const { t } = useTranslation('historySearch');
  const { isExternal } = useUserVisibility();

  const [pageNumber, setPageNumber] = useState(0);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(
    props.initialCenter ?? null,
  );
  /**
   * Two-level model:
   * - `selectedCollateral` drives the Level-2 CollateralDetailDrawer (green pin click).
   * - `selectedMcPin` drives the existing PinDetailDrawer (blue pin click).
   * Only one drawer is open at a time.
   */
  const [selectedCollateral, setSelectedCollateral] = useState<CollateralPinDto | null>(null);
  const [selectedMcPin, setSelectedMcPin] = useState<MarketComparablePinDto | null>(null);
  const [pinFilters, setPinFilters] = useState<PinFilterState>({
    showCollateral: true,
    showMarketComparables: true,
    showCollateralAppraising: true,
    showMcAppraising: true,
    showSupportingData: true,
  });
  // Track the last submitted query so we can re-fire on page change
  const [lastQuery, setLastQuery] = useState<HistorySearchFormValues | null>(null);

  // Popover visibility — Search open by default in standalone, closed in embedded
  // (because embedded auto-fires the search on mount, so the panel is redundant
  // unless the user wants to change the criteria).
  const [searchOpen, setSearchOpen] = useState(mode === 'standalone');
  const [pinLayersOpen, setPinLayersOpen] = useState(false);
  // Results overlay visibility — open by default whenever results arrive
  const [resultsOpen, setResultsOpen] = useState(true);

  const searchPopoverRef = useRef<HTMLDivElement>(null);
  const pinLayersPopoverRef = useRef<HTMLDivElement>(null);

  const { search, result, isPending, isError } = useHistorySearch();

  // Bumped on each new result so MapView pans/zooms to fit the returned pins.
  const [fitToken, setFitToken] = useState(0);
  useEffect(() => {
    if (result) setFitToken(t => t + 1);
  }, [result]);

  const fireSearch = useCallback(
    (values: HistorySearchFormValues, page: number = 0) => {
      // Centre point is optional (FSD §2.6.7). Without it we search by attribute
      // filters only — no radius limit, results ordered by date server-side.
      const lat = parseFloat(values.centerLat);
      const lon = parseFloat(values.centerLon);
      const hasCenter = !isNaN(lat) && !isNaN(lon);

      setLastQuery(values);
      setPageNumber(page);

      search({
        period: values.period,
        ...(hasCenter && {
          centerLat: lat,
          centerLon: lon,
          radiusKm: Math.min(parseFloat(values.radiusKm) || 1, 50),
        }),
        // Green-only filters (server ignores these for MC).
        ...(values.appraisalReportNo && { appraisalReportNo: values.appraisalReportNo }),
        ...(values.titleDeedNo && { titleDeedNo: values.titleDeedNo }),
        ...(values.collateralType && { collateralTypes: expandCollateralType(values.collateralType) }),
        ...(values.customerName && { customerName: values.customerName }),
        ...(values.landAreaFromSqWa && { landAreaFromSqWa: parseFloat(values.landAreaFromSqWa) }),
        ...(values.landAreaToSqWa && { landAreaToSqWa: parseFloat(values.landAreaToSqWa) }),
        ...(values.buildingTypeCodes.length > 0 && { buildingTypeCodes: values.buildingTypeCodes }),
        ...(values.subDistrict && { subDistrict: values.subDistrict }),
        ...(values.district && { district: values.district }),
        ...(values.province && { province: values.province }),
        ...(values.valueFrom && { valueFrom: parseFloat(values.valueFrom) }),
        ...(values.valueTo && { valueTo: parseFloat(values.valueTo) }),
        ...(values.dateFrom && { dateFrom: values.dateFrom }),
        ...(values.dateTo && { dateTo: values.dateTo }),
        pagination: { pageNumber: page, pageSize: PAGE_SIZE },
      });

      // Move map center to searched coords (only when a centre was given).
      if (hasCenter) setMapCenter({ lat, lon });
    },
    [search],
  );

  const handleSearch = useCallback(
    (values: HistorySearchFormValues) => {
      fireSearch(values, 0);
      // Auto-close the popover on submit in standalone mode so the map is
      // immediately visible. User can reopen via the toggle button at any time.
      if (mode === 'standalone') setSearchOpen(false);
    },
    [fireSearch, mode],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (lastQuery) fireSearch(lastQuery, page);
    },
    [lastQuery, fireSearch],
  );

  const handleMapClick = useCallback((lat: number, lon: number) => {
    // Update center via defaultValues prop in SearchPanel — we pass the
    // new coords as defaultValues which triggers a reset inside SearchPanel.
    setMapCenter({ lat, lon });
    // Note: this doesn't auto-submit, just pre-fills the form fields.
    // The user still clicks Search (standalone). In embedded mode,
    // the form already submitted on mount so this is just cosmetic.
  }, []);

  const handleCollateralClick = useCallback(
    (pin: CollateralPinDto) => {
      setSelectedCollateral(pin);
      setSelectedMcPin(null);
      onPinSelect?.(pin);
    },
    [onPinSelect],
  );

  const handleMcClick = useCallback(
    (pin: MarketComparablePinDto) => {
      setSelectedMcPin(pin);
      setSelectedCollateral(null);
      onPinSelect?.(pin);
    },
    [onPinSelect],
  );

  const formDefaults: Partial<HistorySearchFormValues> = {
    ...buildFormDefaults(props),
    // Override lat/lon if user clicked on map
    ...(mapCenter && {
      centerLat: String(mapCenter.lat),
      centerLon: String(mapCenter.lon),
    }),
  };

  const visibleCollateralPins = pinFilters.showCollateral && !isExternal
    ? (result?.collateral.items ?? [])
    : [];
  const visibleMcPins = pinFilters.showMarketComparables
    ? (result?.marketComparables.items ?? [])
    : [];

  // Close popovers on outside click. We attach a single mousedown listener that
  // checks both refs; the toggle buttons set `data-popover-toggle` so we ignore
  // clicks on them (otherwise toggling would close + immediately reopen).
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-popover-toggle]')) return;
      if (searchOpen && searchPopoverRef.current && !searchPopoverRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (pinLayersOpen && pinLayersPopoverRef.current && !pinLayersPopoverRef.current.contains(target)) {
        setPinLayersOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen, pinLayersOpen]);

  return (
    <div className="flex flex-col h-full min-h-0 relative" data-testid="history-search-map">
      {/* Full-width map; the result list floats as an overlay on top (right). */}
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* Map */}
        <div className="flex-1 relative min-w-0 min-h-0">
          <MapView
            center={mapCenter}
            collateralPins={visibleCollateralPins}
            marketComparablePins={visibleMcPins}
            pinFilters={pinFilters}
            onMapClick={handleMapClick}
            onCollateralPinClick={handleCollateralClick}
            onMarketComparablePinClick={handleMcClick}
            fitToken={fitToken}
          />

          {/* Top-left floating toggle buttons (stacked) */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <button
              type="button"
              data-popover-toggle
              onClick={() => setSearchOpen(o => !o)}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-md shadow-md text-xs font-medium transition-colors',
                searchOpen ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
              title={t('searchPanel.title')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {t('searchPanel.title')}
            </button>
            <button
              type="button"
              data-popover-toggle
              onClick={() => setPinLayersOpen(o => !o)}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-md shadow-md text-xs font-medium transition-colors',
                pinLayersOpen ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
              title={t('pinFilter.title')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M 12 2 L 2 11 L 4 11 L 4 22 L 20 22 L 20 11 L 22 11 Z" />
              </svg>
              {t('pinFilter.title')}
            </button>
            {/* Reopen results toggle — only shown when results exist, panel is closed, and no drill-down is open */}
            {!resultsOpen && !selectedCollateral && !selectedMcPin && (result || isPending || isError) && (
              <button
                type="button"
                onClick={() => setResultsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-md shadow-md text-xs font-medium transition-colors bg-white text-gray-700 hover:bg-gray-50"
                title={t('resultsList.title')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {t('resultsList.title')}
                {result && (
                  <span className="ml-0.5 bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                    {(isExternal ? 0 : result.collateral.count) + result.marketComparables.count}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Search criteria popover — wide two-column panel anchored top+bottom;
              the form inside scrolls when criteria overflow on small screens. */}
          {searchOpen && (
            <div
              ref={searchPopoverRef}
              className="absolute top-3 bottom-3 left-32 z-20 w-[760px] max-w-[calc(100vw-9rem)] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
            >
              <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('searchPanel.title')}
                </h3>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                  aria-label={t('pinDetail.close')}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <SearchPanel
                  defaultValues={formDefaults}
                  onSearch={handleSearch}
                  autoSearch={mode === 'embedded'}
                  isPending={isPending}
                />
              </div>
            </div>
          )}

          {/* Pin layers popover */}
          {pinLayersOpen && (
            <div
              ref={pinLayersPopoverRef}
              className="absolute top-16 left-32 z-20 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
            >
              <MapPinFilterPanel
                filters={pinFilters}
                onFiltersChange={setPinFilters}
                isExternal={isExternal}
              />
            </div>
          )}

          {/* Level-2/3 drill-down: collateral detail for the selected green pin */}
          {selectedCollateral && (
            <CollateralDetailDrawer
              pin={selectedCollateral}
              onClose={() => setSelectedCollateral(null)}
            />
          )}

          {/* Pin detail drawer for blue (Market Comparable) pins */}
          {selectedMcPin && (
            <PinDetailDrawer
              pin={selectedMcPin}
              onClose={() => setSelectedMcPin(null)}
            />
          )}

          {/* Results overlay — floats over the (full-width) map on the right.
              Hidden while a drill-down detail is open or the user has closed it. */}
          {!selectedCollateral && !selectedMcPin && resultsOpen && (result || isPending || isError) && (
            <div className="absolute top-3 right-3 bottom-3 z-20 w-[680px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Overlay header: counts + close button */}
              <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4 text-xs">
                  {!isExternal && (
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      {t('resultsList.tabs.collateral')}
                      <span className="text-gray-400">
                        ({result ? (isExternal ? 0 : result.collateral.count) : '…'})
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    {t('resultsList.tabs.marketComparable')}
                    <span className="text-gray-400">
                      ({result ? result.marketComparables.count : '…'})
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setResultsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                  aria-label={t('resultsList.close')}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              <ResultsList
                result={result}
                isError={isError}
                isPending={isPending}
                onRetry={() => lastQuery && fireSearch(lastQuery, pageNumber)}
                pageNumber={pageNumber}
                onPageChange={handlePageChange}
                isExternal={isExternal}
                onCollateralClick={handleCollateralClick}
                onMarketComparableClick={handleMcClick}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistorySearchMap;
