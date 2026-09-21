import { type KeyboardEvent, type MouseEvent, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { MarketsMap, type MapComparable, type MapSubject } from './MarketsMap';
import { PropertyFlag } from './PropertyCardContent';
import { DotJoin, PlotLocationText, UsedInBadge } from './MarketsLabels';
import { useMarketFormatters } from '../hooks/useMarketFormatters';
import { toRaiNganWa } from '../utils/areaFormat';
import {
  comparablePoint,
  daysSince,
  isPriceUnitCode,
  parsePlotLocation,
  ringRadiiKm,
  STALE_AFTER_DAYS,
  unitPriceOf,
  usedInMethods,
  type Comparable,
} from '../utils/marketComparableFormat';

interface MarketsMapViewProps {
  comparables: Comparable[];
  /** Keyed by the comparable link id. */
  distances: Map<string, number | null>;
  /** The appraisal's own properties — every distance is measured from these. */
  subjects: MapSubject[];
  onOpen: (comparable: Comparable) => void;
  /** Right-click on a row: the tab shows the same actions as the list view's ⋮ menu. */
  onContextMenu: (e: MouseEvent, comparable: Comparable) => void;
}

const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

/**
 * The comparables beside a map of where they are, relative to what is being appraised.
 *
 * Picking a row pans to its circle; picking a circle scrolls to its row; a double-click opens the
 * comparable.
 *
 * It takes whatever height the screen has left under the pinned header (`flex-1` inside the
 * tab's full-height column) and never less than 24rem — below that the list shows three rows
 * and the map is a letterbox, so on a very short screen the page scrolls instead.
 * `grid-rows-1` pins the one row to the box, and the list scrolls inside its own column.
 */
export const MarketsMapView = ({
  comparables,
  distances,
  subjects,
  onOpen,
  onContextMenu,
}: MarketsMapViewProps) => {
  const { t } = useTranslation('appraisal');
  const f = useMarketFormatters();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [panToId, setPanToId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  // What each circle says, worked out here so the map only ever handles finished strings.
  // `t` is a dependency on purpose: it changes with the language, and the labels must follow.
  const mapComparables = useMemo<MapComparable[]>(
    () =>
      comparables.flatMap((c, i) => {
        const at = comparablePoint(c);
        if (!at || !c.marketComparableId) return [];
        const price = unitPriceOf(c);
        const unit =
          price?.unit && isPriceUnitCode(price.unit)
            ? t(`markets.units.${price.unit}`)
            : (price?.unit ?? '');
        const area = c.comparableLandAreaSqWa
          ? `${toRaiNganWa(c.comparableLandAreaSqWa)} ${t('properties.units.raiNganWa')}`
          : null;
        const label = [price ? `${money(price.value)} ${unit}`.trim() : null, area]
          .filter(Boolean)
          .join(' · ');
        return [{ id: c.marketComparableId, lat: at.lat, lon: at.lon, number: i + 1, label }];
      }),
    [comparables, t],
  );

  const rings = useMemo(() => {
    const known = [...distances.values()].filter((d): d is number => d != null);
    return ringRadiiKm(known.length > 0 ? Math.max(...known) : null);
  }, [distances]);

  const ringLabels = useMemo(
    () =>
      rings.map(km =>
        km < 1
          ? t('markets.distance.m', { n: Math.round(km * 1000) })
          : t('markets.distance.km', { n: km }),
      ),
    [rings, t],
  );

  const noLocation = comparables.length - mapComparables.length;

  const selectFromMap = (id: string) => {
    setSelectedId(id);
    rowRefs.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <div className="grid min-h-[24rem] flex-1 grid-cols-[21rem_minmax(0,1fr)] grid-rows-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* The rows live in an absolutely positioned scroller so they take no part in sizing the
          grid. Left in flow, the tab — which only has a minimum height — measured the grid by
          its tallest column, the list grew to show every row, and nothing ever scrolled. */}
      <div className="relative border-r border-gray-200">
        <div className="absolute inset-0 divide-y divide-gray-100 overflow-y-auto">
          {comparables.map((c, i) => {
            const id = c.marketComparableId ?? c.id ?? String(i);
            const located = comparablePoint(c) != null;
            const price = unitPriceOf(c);
            const days = daysSince(c.comparableInfoDateTime);
            const distance = distances.get(c.id ?? '') ?? null;
            const onKeyDown = (e: KeyboardEvent) => {
              if (e.key === 'Enter') onOpen(c);
            };
            return (
              <div
                key={c.id ?? i}
                ref={el => {
                  if (el) rowRefs.current.set(id, el);
                  else rowRefs.current.delete(id);
                }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedId(id);
                  setPanToId(id);
                }}
                onDoubleClick={() => onOpen(c)}
                onContextMenu={e => {
                  setSelectedId(id);
                  onContextMenu(e, c);
                }}
                onKeyDown={onKeyDown}
                onMouseEnter={() => {
                  setHoveredId(id);
                  setPanToId(id);
                }}
                onMouseLeave={() => setHoveredId(null)}
                className={clsx(
                  'grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-2.5 border-l-[3px] px-3 py-2 transition-colors',
                  id === selectedId
                    ? 'border-primary bg-primary-50'
                    : 'border-transparent hover:bg-gray-50',
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums text-white',
                    located ? 'bg-primary' : 'bg-gray-300',
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold text-gray-900">
                    {c.comparableSurveyName || c.comparableNumber || '-'}
                  </div>
                  <DotJoin
                    className="truncate text-[11px] text-gray-500"
                    parts={[
                      distance != null
                        ? t('markets.meta.distance', { d: f.distance(distance) })
                        : null,
                      parsePlotLocation(c.comparablePlotLocation).length > 0 ? (
                        <PlotLocationText raw={c.comparablePlotLocation} />
                      ) : null,
                      days != null ? f.ago(days) : null,
                    ]}
                  />
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                    {days != null && days > STALE_AFTER_DAYS && (
                      <PropertyFlag icon="clock">
                        {t('markets.flags.stale', { age: f.age(days) })}
                      </PropertyFlag>
                    )}
                    {!located && (
                      <PropertyFlag icon="location-dot">
                        {t('markets.flags.noLocation')}
                      </PropertyFlag>
                    )}
                    {usedInMethods(c).map(m => (
                      <UsedInBadge key={m} method={m} />
                    ))}
                  </div>
                </div>
                <div className="whitespace-nowrap text-right text-[12.5px] font-semibold tabular-nums text-gray-900">
                  {price ? f.money(price.value) : '—'}
                  {price && (
                    <div className="text-[10.5px] font-normal text-gray-400">
                      {price.isSale ? t('markets.price.saleOnly') : t('markets.price.offerOnly')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 p-2">
        <MarketsMap
          comparables={mapComparables}
          subjects={subjects}
          rings={rings}
          ringLabels={ringLabels}
          activeId={hoveredId ?? selectedId}
          panToId={panToId}
          onSelect={selectFromMap}
          onHover={setHoveredId}
          legend={{
            subject: t('markets.map.subject'),
            comparable: t('markets.map.comparable'),
            rings: t('markets.map.rings'),
          }}
          noLocationNote={noLocation > 0 ? t('markets.map.noLocation', { n: noLocation }) : null}
          unavailableText={t('markets.map.unavailable')}
          retryText={t('common.retryButton')}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default MarketsMapView;
