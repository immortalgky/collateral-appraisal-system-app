/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import { addMapTypeToggle } from '@/shared/components/createMapTypeToggle';
import { useGoogleMaps } from '@/shared/components/MapLocationPicker';
import {
  BANGKOK_CENTER,
  MAP_TYPE_OPTIONS,
  THAILAND_MAP_RESTRICTION,
} from '@/shared/constants/mapConfig';

export interface MapSubject {
  id: string;
  lat: number;
  lon: number;
  /** Name and size of the property, e.g. "ที่ดิน · 2-3-0.00 ไร่". */
  label: string;
}

export interface MapComparable {
  id: string;
  lat: number;
  lon: number;
  /** Row number in the list beside the map. */
  number: number;
  /** Price and size, e.g. "70,000 บาท/ตร.ว. · 1-2-35 ไร่". Empty when neither is known. */
  label: string;
}

interface MarketsMapProps {
  comparables: MapComparable[];
  subjects: MapSubject[];
  /** Ring radii in km, smallest first, drawn once around the middle of the subjects. */
  rings: number[];
  /** Text for each ring, aligned with `rings`. */
  ringLabels: string[];
  /** The comparable to emphasise — hovered or picked in the list. */
  activeId: string | null;
  panToId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  legend: { subject: string; comparable: string; rings: string };
  noLocationNote?: string | null;
  unavailableText: string;
  /** Label of the button that tries loading the map again after it failed. */
  retryText: string;
  className?: string;
}

/** Escape user/DB-sourced text before it goes into overlay HTML (XSS guard). */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const KM_PER_DEG_LAT = 110.574;
const kmPerDegLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

/**
 * A plain DOM element pinned to a coordinate.
 *
 * Google markers are images, and a marker's label is bare text with no background — unreadable
 * over satellite imagery. An overlay is ordinary HTML, so a point can be a simple circle like the
 * mock's and carry its price in a white pill beside it.
 */
function htmlOverlay(g: any, lat: number, lng: number, el: HTMLElement): any {
  const overlay = new g.maps.OverlayView();
  const at = new g.maps.LatLng(lat, lng);
  overlay.onAdd = function onAdd(this: any) {
    this.getPanes().overlayMouseTarget.appendChild(el);
  };
  overlay.draw = function draw(this: any) {
    const point = this.getProjection()?.fromLatLngToDivPixel(at);
    if (!point) return;
    el.style.left = `${point.x}px`;
    el.style.top = `${point.y}px`;
  };
  overlay.onRemove = function onRemove() {
    el.remove();
  };
  return overlay;
}

/** Points on a circle of `km` around a coordinate — flat-earth maths is fine at these distances. */
function ringPath(lat: number, lon: number, km: number) {
  return Array.from({ length: 73 }, (_, i) => {
    const theta = (i / 72) * 2 * Math.PI;
    return {
      lat: lat + (km / KM_PER_DEG_LAT) * Math.cos(theta),
      lng: lon + (km / kmPerDegLon(lat)) * Math.sin(theta),
    };
  });
}

/**
 * The Markets tab's map: the property being appraised as a red dot with distance rings around
 * it, and each comparable as a numbered circle labelled with its price and size.
 *
 * Deliberately separate from the pricing screen's `SurveySelectionMap`: that one is a picker with
 * selected/unselected pins, this one only shows where things are.
 */
export function MarketsMap({
  comparables,
  subjects,
  rings,
  ringLabels,
  activeId,
  panToId,
  onSelect,
  onHover,
  legend,
  noLocationNote,
  unavailableText,
  retryText,
  className,
}: MarketsMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { ready, missingKey, failed, retry } = useGoogleMaps(apiKey, ['marker', 'places']);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const pointElsRef = useRef(new Map<string, HTMLElement>());

  // Latest callbacks, read inside DOM listeners without rebuilding the layers.
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
  }, [onSelect, onHover]);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const g = (window as any).google;
    mapRef.current = new g.maps.Map(containerRef.current, {
      center: BANGKOK_CENTER,
      zoom: 12,
      ...MAP_TYPE_OPTIONS,
      streetViewControl: false,
      fullscreenControl: false,
      restriction: THAILAND_MAP_RESTRICTION,
    });
    addMapTypeToggle(mapRef.current, g.maps, 'TOP_RIGHT');
  }, [ready]);

  // (Re)build every layer when the data changes; emphasis is restyled separately below.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const map = mapRef.current;

    layersRef.current.forEach(layer => layer.setMap(null));
    layersRef.current = [];
    pointElsRef.current.clear();
    const add = (layer: any) => {
      layer.setMap(map);
      layersRef.current.push(layer);
    };
    const stopMapGestures = (el: HTMLElement) =>
      g.maps.OverlayView.preventMapHitsAndGesturesFrom?.(el);

    // One set of rings for the whole appraisal, around the middle of its properties. They are
    // nearly always on one site, and a set per property drew near-identical circles over each
    // other. Distances in the list are still measured to the nearest property.
    const center =
      subjects.length > 0
        ? {
            lat: subjects.reduce((sum, s) => sum + s.lat, 0) / subjects.length,
            lon: subjects.reduce((sum, s) => sum + s.lon, 0) / subjects.length,
          }
        : null;

    // Rings: a faint white stroke under a dark dashed one, so they read on roads and satellite
    // alike.
    if (center) {
      rings.forEach((km, ri) => {
        const path = ringPath(center.lat, center.lon, km);
        add(
          new g.maps.Polyline({
            path,
            clickable: false,
            strokeColor: '#ffffff',
            strokeOpacity: 0.45,
            strokeWeight: 3,
          }),
        );
        add(
          new g.maps.Polyline({
            path,
            clickable: false,
            strokeOpacity: 0,
            icons: [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeColor: '#334155',
                  strokeOpacity: 0.85,
                  scale: 1.5,
                },
                offset: '0',
                repeat: '9px',
              },
            ],
          }),
        );
        if (ringLabels[ri]) {
          const tag = document.createElement('div');
          tag.className =
            'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-white/85 px-1 text-[10px] font-medium text-gray-600';
          tag.textContent = ringLabels[ri];
          add(
            htmlOverlay(
              g,
              center.lat + (km / KM_PER_DEG_LAT) * Math.SQRT1_2,
              center.lon + (km / kmPerDegLon(center.lat)) * Math.SQRT1_2,
              tag,
            ),
          );
        }
      });
    }

    // Every property is a red dot, but only the first is named: the others usually sit on the
    // same site, where their names printed on top of one another. "+N" says they are there, and
    // hovering a dot names it. Dots sit below the comparables, so a comparable at the same spot
    // as a property is not hidden behind it.
    const many = subjects.length > 1;
    subjects.forEach((s, si) => {
      const el = document.createElement('div');
      el.className = 'absolute -translate-x-1/2 -translate-y-1/2';
      el.style.zIndex = '5';
      el.title = s.label;
      const name =
        si === 0 && s.label ? (many ? `${s.label} +${subjects.length - 1}` : s.label) : '';
      el.innerHTML =
        `<div class="${many ? 'size-3 border-2' : 'size-4 border-[3px]'} rounded-full border-white bg-red-600 shadow"></div>` +
        (name
          ? `<div class="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-red-700 shadow">${escapeHtml(name)}</div>`
          : '');
      add(htmlOverlay(g, s.lat, s.lon, el));
    });

    comparables.forEach(c => {
      const el = document.createElement('div');
      el.className = 'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer';
      el.style.zIndex = '10';
      el.innerHTML =
        (c.label
          ? `<div data-label class="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-gray-800 shadow">${escapeHtml(c.label)}</div>`
          : '') +
        `<div data-dot class="flex size-6 items-center justify-center rounded-full border-2 border-white bg-primary text-[11px] font-bold text-white shadow transition-transform">${c.number}</div>`;
      stopMapGestures(el);
      el.addEventListener('click', e => {
        e.stopPropagation();
        onSelectRef.current(c.id);
      });
      el.addEventListener('mouseenter', () => onHoverRef.current(c.id));
      el.addEventListener('mouseleave', () => onHoverRef.current(null));
      pointElsRef.current.set(c.id, el);
      add(htmlOverlay(g, c.lat, c.lon, el));
    });

    // Frame everything, rings included, so the outer ring is never cut off.
    const outer = rings.length > 0 ? rings[rings.length - 1] : 0;
    const bounds = new g.maps.LatLngBounds();
    let hasPoint = false;
    comparables.forEach(c => {
      bounds.extend({ lat: c.lat, lng: c.lon });
      hasPoint = true;
    });
    subjects.forEach(s => {
      bounds.extend({ lat: s.lat, lng: s.lon });
      hasPoint = true;
    });
    if (center && outer > 0) {
      const dLat = outer / KM_PER_DEG_LAT;
      const dLon = outer / kmPerDegLon(center.lat);
      bounds.extend({ lat: center.lat + dLat, lng: center.lon + dLon });
      bounds.extend({ lat: center.lat - dLat, lng: center.lon - dLon });
    }
    if (hasPoint) {
      map.fitBounds(bounds, 40);
      g.maps.event.addListenerOnce(map, 'idle', () => {
        if (map.getZoom() > 18) map.setZoom(18);
      });
    }
  }, [ready, comparables, subjects, rings, ringLabels]);

  // Emphasis: the active comparable grows, its label goes dark, and it rises above the others.
  useEffect(() => {
    pointElsRef.current.forEach((el, id) => {
      const on = id === activeId;
      el.style.zIndex = on ? '30' : '10';
      el.querySelector('[data-dot]')?.classList.toggle('scale-125', on);
      const label = el.querySelector('[data-label]');
      label?.classList.toggle('bg-white/95', !on);
      label?.classList.toggle('text-gray-800', !on);
      label?.classList.toggle('bg-gray-900', on);
      label?.classList.toggle('text-white', on);
    });
  }, [activeId, comparables, ready]);

  useEffect(() => {
    if (!ready || !panToId || !mapRef.current) return;
    const target = comparables.find(c => c.id === panToId);
    if (target) mapRef.current.panTo({ lat: target.lat, lng: target.lon });
  }, [ready, panToId, comparables]);

  useEffect(
    () => () => {
      layersRef.current.forEach(layer => layer.setMap(null));
      layersRef.current = [];
    },
    [],
  );

  // No key, or the script gave up after its own retries: say so rather than spin forever, and
  // for a failed load offer another try.
  if (missingKey || failed) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400',
          className,
        )}
      >
        <Icon name="map" style="solid" className="mb-3 size-10 text-gray-300" />
        <span className="text-sm font-medium">{unavailableText}</span>
        {failed && (
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {retryText}
          </button>
        )}
      </div>
    );
  }

  return (
    // `isolate` keeps every z-index in here — the legend, the circles, and Google's own
    // controls, which run into the millions — inside the map. Without it the legend shared a
    // stacking context with the tab's pinned header and, coming later in the page, painted over
    // it while scrolling.
    <div
      className={clsx(
        'relative isolate overflow-hidden rounded-lg border border-gray-200',
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400">
          <Icon name="spinner" style="solid" className="size-6 animate-spin" />
        </div>
      )}

      <div className="absolute left-2 top-2 z-10 flex items-center gap-3 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm backdrop-blur">
        {subjects.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-white bg-red-600 shadow" />
            {legend.subject}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" />
          {legend.comparable}
        </span>
        {subjects.length > 0 && rings.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-3 border-t border-dashed border-gray-500" />
            {legend.rings}
          </span>
        )}
      </div>

      {noLocationNote && (
        <div className="absolute bottom-2 left-2 z-10 rounded-md bg-amber-50/95 px-2.5 py-1 text-[11px] text-amber-700 shadow-sm">
          {noLocationNote}
        </div>
      )}
    </div>
  );
}

export default MarketsMap;
