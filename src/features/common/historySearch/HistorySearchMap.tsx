import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { AppraisalPinDto, HistorySearchFormValues, HistorySearchPeriod, MarketComparablePinDto, PinFilterState } from './types';
import { useHistorySearch } from './hooks/useHistorySearch';
import { useUserVisibility } from './hooks/useUserVisibility';
import { SearchPanel } from './components/SearchPanel';
import { MapView } from './components/MapView';
import { MapPinFilterPanel } from './components/MapPinFilterPanel';
import { ResultsList } from './components/ResultsList';
import { PinDetailDrawer } from './components/PinDetailDrawer';
import { ActiveFilterChips } from './components/ActiveFilterChips';
import type { RemovableField } from './components/ActiveFilterChips';
import { buildPinIcon } from './icons';
import type { AnyPin } from './types';
import { isAppraisalPin } from './types';
import { formValuesToParams, paramsToFormValues } from './urlState';
import { useAddressStore } from '@/shared/store';
import { findAddressBySubDistrictCode, findProvinceNameByCode } from '@/shared/data/thaiAddresses';

// ─── Public component API ─────────────────────────────────────────────────────

export interface HistorySearchMapProps {
  mode: 'standalone' | 'embedded';
  initialCenter?: { lat: number; lon: number };
  initialRadiusKm?: number;
  initialPeriod?: HistorySearchPeriod;
  /**
   * Action invoked from the pin DETAIL drawer's footer button (NOT on pin click).
   * e.g. "Link to this appraisal" in the Find-Existing flow. Clicking a pin only
   * opens the detail; the user reviews it, then clicks the button to act.
   */
  onPinSelect?: (pin: AppraisalPinDto | MarketComparablePinDto) => void;
  /** Footer button label shown in the pin detail drawer (enables the action button). */
  pinActionLabel?: string;
  /** Spinner/disabled state for the detail action button. */
  pinActionPending?: boolean;
  /**
   * 'all' (default) — both green appraisal + blue MC pins visible.
   * 'marketComparablesOnly' — only blue MC pins rendered; green/appraisal layers
   * and appraisal-specific search fields are hidden/locked.
   */
  pinScope?: 'all' | 'marketComparablesOnly';
  /**
   * Appraising-collateral pins from the current appraisal (Feature 2 — 360 page).
   * Rendered via the 'collateral-appraising' marker layer, supplementing history search results.
   */
  appraisingCollateralPins?: AppraisalPinDto[];
  /**
   * Appraising-MC pins from the current appraisal (Feature 2 — 360 page).
   * Rendered via the 'mc-appraising' marker layer, supplementing history search results.
   */
  appraisingMcPins?: MarketComparablePinDto[];
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

// FORM_DEFAULTS mirrors the same values in SearchPanel to build a full reset payload
const ATTRIBUTE_DEFAULTS: Omit<HistorySearchFormValues, 'centerLat' | 'centerLon' | 'radiusKm' | 'period'> = {
  appraisalReportNo: '',
  titleDeedNo: '',
  collateralType: '', // default "All" — collateral type is an optional filter
  customerName: '',
  landAreaFromSqWa: '',
  landAreaToSqWa: '',
  buildingTypeCodes: [],
  subDistrict: '',
  district: '',
  province: '',
  valueFrom: '',
  valueTo: '',
  dateFrom: '',
  dateTo: '',
};

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * The public shell of the History Search (Pin) feature.
 *
 * Modes:
 * - standalone: Search panel open by default; user clicks Search to run it.
 * - embedded: Prefilled with appraisal coordinates; the search panel starts
 *   collapsed and auto-fires (autoSearch) when the user opens it — it does NOT
 *   fire on mount.
 *
 * Layout:
 * [SearchPanel 220px | MapView flex-1 | ResultsList 280px]
 * Pin filter bar sits above MapView.
 * PinDetailDrawer overlays the right side on click for BOTH pin types.
 *
 * Green-pin click pattern: opens PinDetailDrawer (same as blue). The drawer's
 * green branch shows appraisal fields and an "Open appraisal report" link that
 * navigates to /appraisals/{appraisalId}. This is consistent with the blue-pin
 * interaction — both pin types open the lightweight drawer first, letting the
 * user preview details before deciding to navigate away.
 */
export function HistorySearchMap(props: HistorySearchMapProps) {
  const { mode, onPinSelect, pinScope = 'all', appraisingCollateralPins, appraisingMcPins } = props;
  const { t } = useTranslation('historySearch');
  const { isExternal } = useUserVisibility();

  const [searchParams, setSearchParams] = useSearchParams();

  const [pageNumber, setPageNumber] = useState(0);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(
    props.initialCenter ?? null,
  );
  /**
   * Single drawer for both pin types.
   * - Green (appraisal) pin: opens PinDetailDrawer which renders AppraisalDetail
   * - Blue (MC) pin: opens PinDetailDrawer which renders MarketComparableDetail
   * Only one pin is selected at a time.
   */
  const [selectedPin, setSelectedPin] = useState<AnyPin | null>(null);
  // Pins sharing one location — shown in a chooser so the user can pick which to open.
  const [chooserPins, setChooserPins] = useState<AnyPin[] | null>(null);
  // When pinScope='marketComparablesOnly', green/collateral layers are locked off.
  const mcOnly = pinScope === 'marketComparablesOnly';
  const [pinFilters, setPinFilters] = useState<PinFilterState>({
    showCollateral: !mcOnly,
    showMarketComparables: true,
    showCollateralAppraising: !mcOnly,
    showMcAppraising: true,
    showSupportingData: !mcOnly,
  });
  // Track the last submitted query so we can re-fire on page change
  const [lastQuery, setLastQuery] = useState<HistorySearchFormValues | null>(null);

  // Hover highlight state — shared between ResultsList and MapView (bounce/highlight).
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  // Set only when a RESULT ROW is hovered, so the map pans to that pin (map-pin
  // hover must NOT move the map — that felt jittery).
  const [rowHoverPinId, setRowHoverPinId] = useState<string | null>(null);

  // "Search this area" — set when the user moves the map after a search
  const [movedCenter, setMovedCenter] = useState<{ lat: number; lon: number } | null>(null);

  // Popover visibility — Search open by default in standalone, closed in embedded.
  // In embedded mode the SearchPanel's autoSearch runs when the panel is opened
  // (the panel isn't mounted until then), so embedded does not search on mount.
  const [searchOpen, setSearchOpen] = useState(mode === 'standalone');
  const [pinLayersOpen, setPinLayersOpen] = useState(false);
  // Results overlay visibility — open by default whenever results arrive
  const [resultsOpen, setResultsOpen] = useState(true);

  const searchPopoverRef = useRef<HTMLDivElement>(null);
  const pinLayersPopoverRef = useRef<HTMLDivElement>(null);

  // Guard: URL restore fires once on mount only
  const restoredRef = useRef(false);

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
      // Clear "search this area" banner when a new search fires
      setMovedCenter(null);

      search({
        period: values.period,
        ...(hasCenter && {
          centerLat: lat,
          centerLon: lon,
          // Floor at 0.1 km (NumberInput no longer enforces a keystroke min), cap at 50.
          radiusKm: Math.min(Math.max(parseFloat(values.radiusKm) || 1, 0.1), 50),
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

      // Sync to the URL only on the standalone page (shareable/back-button state).
      // In embedded drawers (360, Decision Summary) the map shares the host route's
      // URL; replacing the query string there wipes the host's own params and can
      // trip route gates — which closed the 360 drawer when a search was run.
      if (mode === 'standalone') {
        setSearchParams(formValuesToParams(values, page), { replace: true });
      }
    },
    [mode, search, setSearchParams],
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

  // Clicking a pin/row only OPENS the detail drawer — it never links/selects
  // immediately. The actual action (e.g. link to appraisal) is an explicit button
  // in PinDetailDrawer (see pinActionLabel + onPinSelect wiring below).
  const handleAppraisalPinClick = useCallback((pin: AppraisalPinDto) => {
    setSelectedPin(pin);
  }, []);

  const handleMcClick = useCallback((pin: MarketComparablePinDto) => {
    setSelectedPin(pin);
  }, []);

  // ── "Search this area" ────────────────────────────────────────────────────
  const handleUserMovedMap = useCallback(
    (center: { lat: number; lon: number }) => {
      // Only show the button when a search has already run
      if (lastQuery) setMovedCenter(center);
    },
    [lastQuery],
  );

  const handleSearchThisArea = useCallback(() => {
    if (!movedCenter || !lastQuery) return;
    const newQuery: HistorySearchFormValues = {
      ...lastQuery,
      centerLat: String(movedCenter.lat),
      centerLon: String(movedCenter.lon),
    };
    fireSearch(newQuery, 0);
    setSearchOpen(false);
  }, [movedCenter, lastQuery, fireSearch]);

  // ── Filter chip handlers ───────────────────────────────────────────────────
  const handleRemoveChip = useCallback(
    (field: RemovableField) => {
      if (!lastQuery) return;
      // Centre chip → drop the centre point (radius becomes irrelevant); clear the map centre.
      if (field === 'center') {
        setMapCenter(null);
        setMovedCenter(null);
        fireSearch({ ...lastQuery, centerLat: '', centerLon: '' }, 0);
        return;
      }
      // Period is mandatory → removing it resets to the default window.
      if (field === 'period') {
        fireSearch({ ...lastQuery, period: 'Past3y' }, 0);
        return;
      }
      const cleared: HistorySearchFormValues = {
        ...lastQuery,
        [field]: Array.isArray(lastQuery[field]) ? [] : '',
      };
      // Location cascade: removing a level clears the more-specific levels below it
      // (province → district → sub-district) plus their display names.
      if (field === 'province') {
        cleared.district = '';
        cleared.subDistrict = '';
        cleared.provinceName = '';
        cleared.districtName = '';
        cleared.subDistrictName = '';
      } else if (field === 'district') {
        cleared.subDistrict = '';
        cleared.districtName = '';
        cleared.subDistrictName = '';
      } else if (field === 'subDistrict') {
        cleared.subDistrictName = '';
      }
      fireSearch(cleared, 0);
    },
    [lastQuery, fireSearch],
  );

  const handleClearAllChips = useCallback(() => {
    if (!lastQuery) return;
    const cleared: HistorySearchFormValues = {
      ...lastQuery,
      ...ATTRIBUTE_DEFAULTS,
    };
    fireSearch(cleared, 0);
  }, [lastQuery, fireSearch]);

  // ── URL restore on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    // Only the standalone page restores criteria from the URL. Embedded drawers
    // share the host route's query string and must not read/adopt it.
    if (mode !== 'standalone') return;

    const { values, page, hasAny } = paramsToFormValues(searchParams);
    if (!hasAny) return;

    // Build full form values from URL, merging prop defaults
    const propDefaults = buildFormDefaults(props);
    const merged: HistorySearchFormValues = {
      ...ATTRIBUTE_DEFAULTS,
      ...propDefaults,
      ...values,
    } as HistorySearchFormValues;

    // Fire once — but don't let embedded mode's own mount auto-fire
    // also fire (SearchPanel's autoSearch fires separately via its own effect).
    // We schedule this slightly after mount so embedded SearchPanel's autoSearch
    // has already captured getValues() without our URL values overwriting it first.
    const id = setTimeout(() => {
      // Resolve display names for the location codes from the URL so the chips show
      // area names (e.g. "Bangkok") instead of raw codes ("10") on a deep-link/refresh.
      if (merged.subDistrict) {
        const a = findAddressBySubDistrictCode(merged.subDistrict, 'title');
        if (a) {
          merged.subDistrictName = a.subDistrictName;
          merged.districtName = a.districtName;
          merged.provinceName = a.provinceName;
        }
      } else if (merged.district) {
        const a = useAddressStore.getState().titleAddresses.find(x => x.districtCode === merged.district);
        if (a) {
          merged.districtName = a.districtName;
          merged.provinceName = a.provinceName;
        }
      } else if (merged.province) {
        merged.provinceName = findProvinceNameByCode(merged.province, 'title') ?? '';
      }
      fireSearch(merged, page);
    }, 50);
    return () => clearTimeout(id);
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formDefaults: Partial<HistorySearchFormValues> = {
    ...buildFormDefaults(props),
    // Retain the last submitted criteria so reopening the panel (it unmounts when
    // closed) doesn't force the user to re-enter everything to refine a search.
    ...(lastQuery ?? {}),
    // Override lat/lon if the user clicked the map after the last search.
    ...(mapCenter && {
      centerLat: String(mapCenter.lat),
      centerLon: String(mapCenter.lon),
    }),
  };

  // In mcOnly mode, suppress green pins the same way external users see them.
  const suppressAppraisalPins = isExternal || mcOnly;
  const visibleAppraisalPins = pinFilters.showCollateral && !suppressAppraisalPins
    ? (result?.appraisals.items ?? [])
    : [];
  // An MC that belongs to THIS appraisal (an appraising/red pin) should not also
  // render as an existing/blue search-result pin — show it red only.
  const appraisingMcIds = new Set((appraisingMcPins ?? []).map(p => p.marketComparableId));
  const visibleMcPins = pinFilters.showMarketComparables
    ? (result?.marketComparables.items ?? []).filter(p => !appraisingMcIds.has(p.marketComparableId))
    : [];

  // Current radius from lastQuery (for the circle)
  const currentRadiusKm = lastQuery
    ? (parseFloat(lastQuery.radiusKm) || 1)
    : (props.initialRadiusKm ?? 1);

  // Close popovers on outside click. We attach a single mousedown listener that
  // checks both refs; the toggle buttons set `data-popover-toggle` so we ignore
  // clicks on them (otherwise toggling would close + immediately reopen).
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-popover-toggle]')) return;
      // A control inside the panel may remove the clicked element from the DOM during
      // its own mousedown handler (e.g. the province/district autocomplete closes its
      // option list on select). mousedown is a discrete event, so React 18 flushes that
      // before this document listener runs — leaving `target` detached. A detached target
      // means the click was on an in-panel control, NOT a genuine outside click.
      if (!target.isConnected) return;
      // Dropdowns/comboboxes that render their menu in a Headless UI portal at
      // document.body (building-type MultiSelectDropdown) — clicking an option must NOT
      // be treated as an outside click.
      if (target.closest('[data-headlessui-portal]')) return;
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
            appraisalPins={visibleAppraisalPins}
            marketComparablePins={visibleMcPins}
            pinFilters={pinFilters}
            onMapClick={handleMapClick}
            onAppraisalPinClick={handleAppraisalPinClick}
            onMarketComparablePinClick={handleMcClick}
            fitToken={fitToken}
            radiusKm={mapCenter ? currentRadiusKm : undefined}
            onUserMovedMap={handleUserMovedMap}
            highlightedPinId={hoveredPinId}
            panToPinId={rowHoverPinId}
            onPinHover={setHoveredPinId}
            onCoincidentPins={setChooserPins}
            appraisingCollateralPins={appraisingCollateralPins}
            appraisingMcPins={appraisingMcPins}
            cluster={mode === 'standalone'}
          />

          {/* "Search this area" floating button — appears after a user pan/zoom */}
          {movedCenter && !selectedPin && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex justify-center">
              <button
                type="button"
                onClick={handleSearchThisArea}
                className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 bg-white border border-blue-300 text-blue-700 text-sm font-medium rounded-full shadow-lg hover:bg-blue-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                {t('map.searchThisArea')}
              </button>
            </div>
          )}

          {/* Coincident-pin chooser — pins sharing one location; pick one to open its detail */}
          {chooserPins && chooserPins.length > 0 && (
            <>
              <div
                className="absolute inset-0 z-30"
                onClick={() => setChooserPins(null)}
                aria-hidden="true"
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-72 max-h-[70%] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label={t('chooser.title')}
              >
                <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-700">
                    {t('chooser.title')}
                    <span className="ml-1 text-gray-400">({chooserPins.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setChooserPins(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    aria-label={t('pinDetail.close')}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
                <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
                  {chooserPins.map(pin => {
                    const isAppraisal = isAppraisalPin(pin);
                    const primary = isAppraisal
                      ? (pin.appraisalNumber ?? t('common.na'))
                      : (pin.surveyName || pin.appraisalNumber || t('common.na'));
                    const secondary = isAppraisal ? pin.customerName : pin.propertyType;
                    const key = isAppraisal ? pin.appraisalId : pin.marketComparableId;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPin(pin);
                            setChooserPins(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <img
                            src={buildPinIcon(isAppraisal ? 'collateralExisting' : 'mcExisting')}
                            alt=""
                            className="w-3.5 h-4 shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium text-gray-800 truncate">{primary}</span>
                            {secondary && (
                              <span className="block text-[11px] text-gray-500 truncate">{secondary}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}

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
            {/* Reopen results toggle — only shown when results exist, panel is closed, and no pin is selected */}
            {!resultsOpen && !selectedPin && (result || isPending || isError) && (
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
                    {(suppressAppraisalPins ? 0 : result.appraisals.count) + result.marketComparables.count}
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
                mcOnly={mcOnly}
              />
            </div>
          )}

          {/* Pin detail drawer — shared by both green (appraisal) and blue (MC) pins */}
          {selectedPin &&
            (() => {
              // Hide the action (e.g. "Use this survey") for a comparable that's
              // already linked to this appraisal — it shows as a red appraising pin.
              const alreadyLinked =
                !isAppraisalPin(selectedPin) && appraisingMcIds.has(selectedPin.marketComparableId);
              const showAction = !!onPinSelect && !alreadyLinked;
              return (
                <PinDetailDrawer
                  pin={selectedPin}
                  onClose={() => setSelectedPin(null)}
                  actionLabel={showAction ? props.pinActionLabel : undefined}
                  onAction={showAction ? onPinSelect : undefined}
                  actionPending={props.pinActionPending}
                />
              );
            })()}

          {/* Results overlay — floats over the (full-width) map on the right.
              Hidden while a pin detail is open or the user has closed it. */}
          {!selectedPin && resultsOpen && (result || isPending || isError) && (
            <div className="absolute top-3 right-3 bottom-3 z-20 w-[680px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Overlay header: counts + close button */}
              <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4 text-xs">
                  {!suppressAppraisalPins && (
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <img src={buildPinIcon('collateralExisting')} alt="" className="w-3 h-4 shrink-0" />
                      {t('resultsList.tabs.appraisal')}
                      <span className="text-gray-400">
                        ({result ? result.appraisals.count : '…'})
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <img src={buildPinIcon('mcExisting')} alt="" className="w-3 h-4 shrink-0" />
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

              {/* Active filter chips */}
              {lastQuery && (
                <ActiveFilterChips
                  query={lastQuery}
                  onRemove={handleRemoveChip}
                  onClearAll={handleClearAllChips}
                />
              )}

              <ResultsList
                result={result}
                isError={isError}
                isPending={isPending}
                onRetry={() => lastQuery && fireSearch(lastQuery, pageNumber)}
                pageNumber={pageNumber}
                onPageChange={handlePageChange}
                isExternal={suppressAppraisalPins}
                onAppraisalClick={handleAppraisalPinClick}
                onMarketComparableClick={handleMcClick}
                highlightedPinId={hoveredPinId}
                onRowHover={pinId => {
              setHoveredPinId(pinId);
              setRowHoverPinId(pinId);
            }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistorySearchMap;
