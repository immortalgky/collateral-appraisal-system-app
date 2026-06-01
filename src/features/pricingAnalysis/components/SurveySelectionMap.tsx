import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { Icon } from '@/shared/components';
import { useGoogleMaps } from '@/shared/components/MapLocationPicker';
import type { MarketComparableDetailType } from '../schemas';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The collateral being appraised (land/condo) — shown as a distinct orange pin. */
export interface SubjectPin {
  /** Stable id (propertyId) so table-row hover can pan/emphasise this pin. */
  id: string;
  lat: number;
  lon: number;
  label: string;
}

interface SurveySelectionMapProps {
  /** All available surveys (the table may be paginated; the map shows them all). */
  surveys: MarketComparableDetailType[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  /** Survey id currently hovered (in table or map) — emphasised on the map. */
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  /** Survey id to pan the map to. Set only on table-row hover (NOT pin hover). */
  panToId?: string | null;
  /** Subject collateral location(s) for the group — rendered as orange pins. */
  subjectPins?: SubjectPin[];
  readOnly?: boolean;
  className?: string;
}

// Shared so the table can show the same pin colour per row.
export const COLOR_SELECTED = '#ef4444'; // red — selected market comparable (appraising)
export const COLOR_UNSELECTED = '#9ca3af'; // gray — not selected
export const COLOR_SUBJECT = '#f59e0b'; // orange — subject collateral

// Classic location pin (balloon head + white dot + tapered tip) as an SVG data
// URL, so we get the exact pin look with a dynamic fill colour.
function pinDataUrl(color: string, stroke: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">` +
    `<path d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 7.7 11.5 19.5 11.5 19.5S23.5 19.7 23.5 12C23.5 5.65 18.35 0.5 12 0.5z" ` +
    `fill="${color}" stroke="${stroke}" stroke-width="1"/>` +
    `<circle cx="12" cy="12" r="4.2" fill="#ffffff"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function pinIcon(google: any, color: string, stroke: string, height: number) {
  const width = height * 0.75; // 24:32 aspect
  return {
    url: pinDataUrl(color, stroke),
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height), // tip on the coordinate
  };
}

function markerIcon(google: any, selected: boolean, emphasised: boolean) {
  const color = selected ? COLOR_SELECTED : COLOR_UNSELECTED;
  const height = emphasised ? 42 : selected ? 36 : 30;
  return pinIcon(google, color, '#ffffff', height);
}

function subjectIcon(google: any, emphasised: boolean) {
  return pinIcon(google, COLOR_SUBJECT, '#7c2d12', emphasised ? 46 : 40);
}

function priceLabel(s: MarketComparableDetailType): string {
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (s.offerPrice != null) return `Offer ${fmt(s.offerPrice)}`;
  if (s.salePrice != null) return `Sale ${fmt(s.salePrice)}`;
  return '—';
}

/** Small location pin for the legend, matching the map markers. */
function LegendPin({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 32" width="11" height="15" className="shrink-0" aria-hidden="true">
      <path
        d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 7.7 11.5 19.5 11.5 19.5S23.5 19.7 23.5 12C23.5 5.65 18.35 0.5 12 0.5z"
        fill={color}
      />
      <circle cx="12" cy="12" r="4.2" fill="#fff" />
    </svg>
  );
}

/** Escape user/DB-sourced text before interpolating into InfoWindow HTML (XSS guard). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Map panel for the market-survey selector. Renders every located survey as a
 * pin; clicking a pin toggles its selection (synced with the table). Selected
 * pins are red, unselected gray, subject collateral orange. Hover emphasises the pin + row.
 */
export function SurveySelectionMap({
  surveys,
  selectedIds,
  onToggle,
  hoveredId,
  onHover,
  panToId,
  subjectPins,
  readOnly,
  className,
}: SurveySelectionMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { ready, missingKey } = useGoogleMaps(apiKey, ['marker', 'places']);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const subjectMarkersRef = useRef<Map<string, any>>(new Map());

  // Latest callbacks/state read inside marker listeners without rebuilding them.
  const onToggleRef = useRef(onToggle);
  const onHoverRef = useRef(onHover);
  const readOnlyRef = useRef(readOnly);
  useEffect(() => {
    onToggleRef.current = onToggle;
    onHoverRef.current = onHover;
    readOnlyRef.current = readOnly;
  }, [onToggle, onHover, readOnly]);

  const located = useMemo(
    () =>
      surveys.filter(
        s =>
          s.id &&
          s.latitude != null &&
          s.longitude != null &&
          !(Number(s.latitude) === 0 && Number(s.longitude) === 0),
      ),
    [surveys],
  );
  const noLocationCount = surveys.length - located.length;

  const subjects = useMemo(
    () =>
      (subjectPins ?? []).filter(
        p => p.lat != null && p.lon != null && !Number.isNaN(p.lat) && !Number.isNaN(p.lon),
      ),
    [subjectPins],
  );

  // Initialise the map once the API is ready.
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const g = (window as any).google;
    mapRef.current = new g.maps.Map(containerRef.current, {
      center: { lat: 13.7563, lng: 100.5018 }, // Bangkok fallback
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    infoRef.current = new g.maps.InfoWindow();
  }, [ready]);

  // (Re)build markers when the located set changes. Selection/hover styling is
  // applied in a separate effect so toggling doesn't tear down markers.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();
    subjectMarkersRef.current.forEach(m => m.setMap(null));
    subjectMarkersRef.current.clear();

    located.forEach(s => {
      const id = s.id as string;
      const marker = new g.maps.Marker({
        position: { lat: Number(s.latitude), lng: Number(s.longitude) },
        map: mapRef.current,
        icon: markerIcon(g, selectedIds.has(id), false),
        optimized: false,
        title: s.surveyName ?? s.comparableNumber ?? '',
      });
      marker.addListener('click', () => {
        if (!readOnlyRef.current) onToggleRef.current(id);
      });
      marker.addListener('mouseover', () => {
        onHoverRef.current?.(id);
        infoRef.current?.setContent(
          `<div style="font-size:12px;line-height:1.4">
             <div style="font-weight:600">${escapeHtml(s.surveyName ?? s.comparableNumber ?? '')}</div>
             <div style="color:#6b7280">${escapeHtml(priceLabel(s))}</div>
           </div>`,
        );
        infoRef.current?.open(mapRef.current, marker);
      });
      marker.addListener('mouseout', () => {
        onHoverRef.current?.(null);
        infoRef.current?.close();
      });
      markersRef.current.set(id, marker);
    });

    // Subject collateral pin(s) — distinct orange, larger, always on top.
    subjects.forEach(p => {
      const marker = new g.maps.Marker({
        position: { lat: p.lat, lng: p.lon },
        map: mapRef.current,
        icon: subjectIcon(g, false),
        zIndex: 1000,
        optimized: false,
        title: p.label,
      });
      marker.addListener('mouseover', () => {
        onHoverRef.current?.(p.id);
        infoRef.current?.setContent(
          `<div style="font-size:12px;line-height:1.4">
             <div style="font-weight:600;color:#b45309">Subject collateral</div>
             <div style="color:#374151">${escapeHtml(p.label)}</div>
           </div>`,
        );
        infoRef.current?.open(mapRef.current, marker);
      });
      marker.addListener('mouseout', () => {
        onHoverRef.current?.(null);
        infoRef.current?.close();
      });
      subjectMarkersRef.current.set(p.id, marker);
    });

    // Frame all pins (surveys + subject) on (re)build.
    const points = [
      ...located.map(s => ({ lat: Number(s.latitude), lng: Number(s.longitude) })),
      ...subjects.map(p => ({ lat: p.lat, lng: p.lon })),
    ];
    if (points.length > 0) {
      const bounds = new g.maps.LatLngBounds();
      points.forEach(pt => bounds.extend(pt));
      mapRef.current.fitBounds(bounds, 48);
    }
    // selectedIds intentionally excluded — styling handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, located, subjects]);

  // Restyle markers on selection / hover change (no rebuild).
  useEffect(() => {
    if (!ready) return;
    const g = (window as any).google;
    markersRef.current.forEach((marker, id) => {
      const selected = selectedIds.has(id);
      const emphasised = id === hoveredId;
      marker.setIcon(markerIcon(g, selected, emphasised));
      marker.setZIndex(emphasised ? 999 : selected ? 10 : 1);
    });
    // Subject pins: emphasise the hovered one too.
    subjectMarkersRef.current.forEach((marker, id) => {
      marker.setIcon(subjectIcon(g, id === hoveredId));
      marker.setZIndex(id === hoveredId ? 1001 : 1000);
    });
  }, [ready, selectedIds, hoveredId]);

  // Pan the map to a survey only when a TABLE ROW is hovered (not on pin hover).
  // Coords are read from refs so a marker rebuild doesn't re-pan to a stale id.
  const locatedRef = useRef(located);
  const subjectsRef = useRef(subjects);
  useEffect(() => {
    locatedRef.current = located;
    subjectsRef.current = subjects;
  }, [located, subjects]);
  useEffect(() => {
    if (!ready || !panToId || !mapRef.current) return;
    const s = locatedRef.current.find(x => x.id === panToId);
    if (s && s.latitude != null && s.longitude != null) {
      mapRef.current.panTo({ lat: Number(s.latitude), lng: Number(s.longitude) });
      return;
    }
    // Fall back to a subject pin (table subject-row hover).
    const subj = subjectsRef.current.find(x => x.id === panToId);
    if (subj) mapRef.current.panTo({ lat: subj.lat, lng: subj.lon });
  }, [ready, panToId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current.clear();
      subjectMarkersRef.current.forEach(m => m.setMap(null));
      subjectMarkersRef.current.clear();
      infoRef.current?.close();
    };
  }, []);

  if (missingKey) {
    return (
      <div
        className={clsx(
          'bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-400 border border-gray-200',
          className,
        )}
      >
        <Icon name="map" style="solid" className="size-10 mb-3 text-gray-300" />
        <span className="text-sm font-medium">Map unavailable</span>
        <span className="text-xs">Missing Google Maps API key</span>
      </div>
    );
  }

  return (
    <div className={clsx('relative rounded-lg overflow-hidden border border-gray-200', className)}>
      <div ref={containerRef} className="absolute inset-0" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400">
          <Icon name="spinner" style="solid" className="size-6 animate-spin" />
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-3 rounded-md bg-white/90 px-2.5 py-1.5 shadow-sm text-[11px] text-gray-600 backdrop-blur">
        {subjects.length > 0 && (
          <span className="flex items-center gap-1.5">
            <LegendPin color={COLOR_SUBJECT} />
            Subject
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <LegendPin color={COLOR_SELECTED} />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <LegendPin color={COLOR_UNSELECTED} />
          Not selected
        </span>
      </div>

      {/* No-location note */}
      {noLocationCount > 0 && (
        <div className="absolute bottom-2 left-2 z-10 rounded-md bg-amber-50/95 px-2.5 py-1 shadow-sm text-[11px] text-amber-700 backdrop-blur">
          {noLocationCount} survey{noLocationCount > 1 ? 's' : ''} without a location aren’t shown
          on the map
        </div>
      )}
    </div>
  );
}
