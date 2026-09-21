import { type MouseEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAppraisalContext, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import Icon from '@shared/components/Icon';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { SegmentedControl } from '@shared/components/SegmentedControl';
import { MARKETS_VIEW_MODES } from '@shared/components/marketsViewModeConstants';
import { useUIStore } from '@shared/store';
import type { MarketsViewMode } from '@shared/types';
import {
  useGetAppraisalComparables,
  useGetAppraisalMapPins,
  useUnlinkAppraisalComparable,
} from '@features/appraisal/api';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { HistorySearchMapDrawer } from '@/features/common/historySearch/HistorySearchMapDrawer';
import type { MarketComparablePinDto } from '@/features/common/historySearch/types';
import { isMarketComparablePin } from '@/features/common/historySearch/types';
import { PropertyTypeDropdown } from '../PropertyTypeDropdown';
import { ComparableRow } from '../ComparableRow';
import { MarketsSummary } from '../MarketsSummary';
import { MarketsMapView } from '../MarketsMapView';
import { PropertyContextMenu } from '../PropertyContextMenu';
import type { MapSubject } from '../MarketsMap';
import { useEnrichedPropertyGroups } from '../../hooks/useEnrichedPropertyGroups';
import { formatAreaNumber, toRaiNganWa } from '../../utils/areaFormat';
import {
  comparablePoint,
  hasCoords,
  nearestKm,
  type Comparable,
} from '../../utils/marketComparableFormat';

// Container segments that host the Markets tab — drives where market-comparable
// detail pages are mounted so the URL prefix is preserved.
const PARENT_SEGMENTS = ['block-condo', 'block-village', 'property-pma', 'property'] as const;

const VIEW_ICONS: Record<MarketsViewMode, string> = { list: 'list', map: 'map-location-dot' };

export const MarketsTab = () => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const navigate = useNavigate();
  const basePath = useBasePath();
  const location = useLocation();
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;

  // Pick the segment after the basePath (e.g. 'block-condo' from /tasks/:id/block-condo).
  const segments = location.pathname.replace(`${basePath}/`, '').split('/').filter(Boolean);
  const parentSegment =
    (PARENT_SEGMENTS as readonly string[]).find(s => s === segments[0]) ?? 'property';

  // Persisted beside the Properties tab's layout, so the tab reopens the way it was left.
  const viewMode = useUIStore(s => s.marketsViewMode);
  const setViewMode = useUIStore(s => s.setMarketsViewMode);

  const {
    data: appraisalComparables,
    isLoading,
    isError,
  } = useGetAppraisalComparables(appraisalId);
  const comparables = useMemo<Comparable[]>(
    () => appraisalComparables ?? [],
    [appraisalComparables],
  );
  const { mutate: unlinkComparable } = useUnlinkAppraisalComparable();

  // The appraisal's own pins. Its collateral is what every distance is measured from; its linked
  // comparables are drawn red on the Find Existing map so they stand apart from the pool.
  const { data: mapPinsData } = useGetAppraisalMapPins(appraisalId);

  // Each collateral pin is labelled with its property's name and size, looked up from the same
  // group data the Properties tab uses (already cached — the page fetched it for its tab counts).
  // No price: an appraised value belongs to a whole group, never to one property in it.
  const { groups } = useEnrichedPropertyGroups(appraisalId);
  const subjectFallback = t('markets.map.subject');
  const raiLabel = t('properties.units.raiNganWa');
  const sqmLabel = t('properties.units.sqm');
  const subjects = useMemo<MapSubject[]>(() => {
    const byId = new Map(groups.flatMap(g => g.items).map(item => [item.id, item]));
    return (mapPinsData?.collateral ?? [])
      .filter(p => hasCoords(p.lat, p.lon))
      .map(p => {
        const item = byId.get(p.appraisalPropertyId);
        const area =
          item?.areaValue == null
            ? null
            : item.areaUnit === 'wa'
              ? `${toRaiNganWa(item.areaValue)} ${raiLabel}`
              : `${formatAreaNumber(item.areaValue)} ${sqmLabel}`;
        const name = item && item.address !== '-' ? item.address : subjectFallback;
        return {
          id: p.appraisalPropertyId,
          lat: p.lat,
          lon: p.lon,
          label: [name, area].filter(Boolean).join(' · '),
        };
      });
  }, [mapPinsData, groups, subjectFallback, raiLabel, sqmLabel]);

  const distances = useMemo(
    () => new Map(comparables.map(c => [c.id ?? '', nearestKm(comparablePoint(c), subjects)])),
    [comparables, subjects],
  );

  // "Find Existing" drawer state
  const [findExistingOpen, setFindExistingOpen] = useState(false);
  const appraisingMcPins = useMemo<MarketComparablePinDto[]>(
    () =>
      (mapPinsData?.marketComparables ?? []).map(m => ({
        marketComparableId: m.marketComparableId,
        lat: m.lat,
        lon: m.lon,
        propertyType: m.propertyType,
        surveyName: m.surveyName,
        infoDateTime: m.infoDateTime,
        offerPrice: m.offerPrice,
        salePrice: m.salePrice,
        distanceKm: null,
        appraisalNumber: null,
        customerName: null,
        appraisalDate: null,
      })),
    [mapPinsData],
  );

  const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null);
  /** Right-click menu: the same menu component and actions the Properties tab uses. */
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    comparable: Comparable;
  } | null>(null);
  const openContextMenu = (e: MouseEvent, comparable: Comparable) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, comparable });
  };

  const comparableRoot = `${basePath}/${parentSegment}/market-comparable`;

  const handleCreateSelect = (_type: string, _groupId: string, code: string) => {
    navigate(`${comparableRoot}/new?propertyType=${encodeURIComponent(code)}`);
  };

  const openComparable = (c: Comparable) => {
    if (c.marketComparableId) navigate(`${comparableRoot}/${c.marketComparableId}`);
  };

  /**
   * Duplicate a comparable of this appraisal — for the plot next door whose survey is nearly
   * identical. It is the same create-from-copy path Find Existing uses: the form opens prefilled,
   * and saving creates a new comparable with its own number and links it here.
   */
  const copyComparable = (c: Comparable) => {
    if (!c.marketComparableId) return;
    navigate(
      `${comparableRoot}/new` +
        `?propertyType=${encodeURIComponent(c.comparablePropertyType ?? '')}` +
        `&copyFrom=${encodeURIComponent(c.marketComparableId)}`,
    );
  };

  /** COPY an existing survey found on the History Search map into a new comparable here. */
  const handleCopyExisting = (pin: MarketComparablePinDto) => {
    navigate(
      `${comparableRoot}/new` +
        `?propertyType=${encodeURIComponent(pin.propertyType)}` +
        `&copyFrom=${encodeURIComponent(pin.marketComparableId)}`,
    );
  };

  const confirmUnlink = () => {
    if (!appraisalId || !unlinkTarget) return;
    unlinkComparable(
      { appraisalId, comparableId: unlinkTarget },
      {
        onSuccess: () => {
          toast.success(t('toasts.comparableDeleted'));
          setUnlinkTarget(null);
        },
        onError: () => toast.error(t('toasts.comparableDeleteFailed')),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 rounded bg-gray-100" />
          <div className="h-8 w-64 rounded bg-gray-100" />
        </div>
        <div className="h-14 rounded-xl bg-gray-100" />
        <div className="overflow-hidden rounded-xl border border-gray-100">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex h-20 items-center gap-4 border-b border-gray-100 px-3">
              <div className="h-14 w-24 rounded-lg bg-gray-100" />
              <div className="h-4 w-1/3 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Icon name="triangle-exclamation" className="mb-3 text-4xl text-red-400" />
        <p className="text-sm font-medium">{t('markets.loadError')}</p>
        <p className="mt-1 text-xs text-gray-400">{t('markets.loadErrorHint')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Pinned while the list scrolls under it: the actions and the price summary are what an
          appraiser reaches for from anywhere down a long list. Sticky rather than a nested
          scroll box, so it works in every page that hosts this tab — the block pages give it no
          fixed height to scroll inside. */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-white pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{t('markets.pageTitle')}</h3>
            <p className="text-xs text-gray-500">{t('markets.count', { n: comparables.length })}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {comparables.length > 0 && (
              <SegmentedControl
                options={MARKETS_VIEW_MODES.map(mode => ({
                  value: mode,
                  label: t(`markets.viewModes.${mode}`),
                  icon: VIEW_ICONS[mode],
                }))}
                value={viewMode}
                onChange={setViewMode}
              />
            )}
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setFindExistingOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Icon
                    name="map-location-dot"
                    style="solid"
                    className="text-[11px] text-gray-400"
                  />
                  {t('markets.findOnMap')}
                </button>
                <PropertyTypeDropdown
                  groupId=""
                  onSelectType={handleCreateSelect}
                  buttonLabel={t('markets.create')}
                  // Same filled primary as "new group" on the Properties tab, in the same corner.
                  buttonClassName="gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                  iconClassName="text-white"
                  disableDefaultNavigation
                  align="right"
                />
              </>
            )}
          </div>
        </div>

        {comparables.length > 0 && (
          <MarketsSummary comparables={comparables} distances={distances} />
        )}
      </div>

      {comparables.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-gray-50">
            <Icon name="chart-line" className="text-xl text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-600">{t('markets.noComparables')}</p>
          <p className="mt-1 text-xs text-gray-400">{t('markets.noComparablesHint')}</p>
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <MarketsMapView
              comparables={comparables}
              distances={distances}
              subjects={subjects}
              onOpen={openComparable}
              onContextMenu={openContextMenu}
            />
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {comparables.map((c, i) => (
                <ComparableRow
                  key={c.id ?? i}
                  comparable={c}
                  index={i}
                  distanceKm={distances.get(c.id ?? '') ?? null}
                  onOpen={() => openComparable(c)}
                  onCopy={() => copyComparable(c)}
                  onDelete={() => c.id && setUnlinkTarget(c.id)}
                  onContextMenu={e => openContextMenu(e, c)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {contextMenu && (
        <PropertyContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={
            readOnly
              ? [
                  {
                    label: t('markets.actions.open'),
                    icon: 'eye',
                    onClick: () => {
                      setContextMenu(null);
                      openComparable(contextMenu.comparable);
                    },
                  },
                ]
              : [
                  {
                    label: t('markets.actions.open'),
                    icon: 'pen-to-square',
                    onClick: () => {
                      setContextMenu(null);
                      openComparable(contextMenu.comparable);
                    },
                  },
                  {
                    label: t('markets.actions.copy'),
                    icon: 'copy',
                    onClick: () => {
                      setContextMenu(null);
                      copyComparable(contextMenu.comparable);
                    },
                  },
                  {
                    label: t('markets.actions.delete'),
                    icon: 'trash',
                    danger: true,
                    onClick: () => {
                      const id = contextMenu.comparable.id;
                      setContextMenu(null);
                      if (id) setUnlinkTarget(id);
                    },
                  },
                ]
          }
        />
      )}

      <ConfirmDialog
        isOpen={unlinkTarget != null}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={confirmUnlink}
        title={t('markets.deleteConfirm.title')}
        message={t('markets.deleteConfirm.message')}
        confirmText={t('markets.deleteConfirm.confirm')}
        cancelText={t('markets.deleteConfirm.cancel')}
        variant="danger"
      />

      {/* Find Existing — History Search map drawer scoped to MC pins only */}
      <HistorySearchMapDrawer
        isOpen={findExistingOpen}
        onClose={() => setFindExistingOpen(false)}
        initialRadiusKm={5}
        pinScope="marketComparablesOnly"
        appraisingMcPins={appraisingMcPins}
        pinActionLabel="Use this survey"
        onPinSelect={pin => {
          if (isMarketComparablePin(pin)) handleCopyExisting(pin);
        }}
      />
    </div>
  );
};

export default MarketsTab;
