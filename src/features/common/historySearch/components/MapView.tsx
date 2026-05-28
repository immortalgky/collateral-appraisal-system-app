import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { AnyPin, AppraisalPinDto, MarketComparablePinDto, PinFilterState } from '../types';
import { buildPinIcon } from '../icons';
import { useGoogleMaps } from '@/shared/components/MapLocationPicker';

// ─── Minimal Google Maps type shim ───────────────────────────────────────────
// We declare only the subset of the Maps JS API we actually use so the
// compiler is satisfied without installing @types/google.maps.

interface GMapLatLng {
  lat(): number;
  lng(): number;
}

interface GMapMouseEvent {
  latLng?: GMapLatLng;
}

interface GMapMarkerLabel {
  text: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
}

interface GMapMarkerOptions {
  position: { lat: number; lng: number };
  map: GMap;
  icon?: object;
  title?: string;
  label?: GMapMarkerLabel;
  /** Render each marker as its own DOM element so z-index reorder + BOUNCE animate. */
  optimized?: boolean;
}

interface GMapMarker {
  setMap(map: GMap | null): void;
  addListener(event: string, handler: () => void): void;
  setZIndex(zIndex: number): void;
  setAnimation(animation: number | null): void;
  setIcon(icon: object): void;
}

interface GMapLatLngBounds {
  extend(pos: { lat: number; lng: number }): void;
}

interface GMapCircleOptions {
  center: { lat: number; lng: number };
  radius: number;
  map: GMap;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
  clickable?: boolean;
}

interface GMapCircle {
  setCenter(center: { lat: number; lng: number }): void;
  setRadius(radius: number): void;
  setMap(map: GMap | null): void;
}

interface GMapMapsEventListener {
  remove(): void;
}

interface GMap {
  setCenter(pos: { lat: number; lng: number }): void;
  panTo(pos: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  fitBounds(bounds: GMapLatLngBounds, padding?: number): void;
  addListener(event: string, handler: (e: GMapMouseEvent) => void): GMapMapsEventListener;
  getCenter(): { lat(): number; lng(): number } | null;
}

interface GMapPoint {
  x: number;
  y: number;
}

interface GMapPointConstructor {
  new (x: number, y: number): GMapPoint;
}

interface GMapAnimation {
  BOUNCE: number;
}

interface GMapConstructors {
  Map: new (el: HTMLElement, opts: object) => GMap;
  Marker: new (opts: GMapMarkerOptions) => GMapMarker;
  Circle: new (opts: GMapCircleOptions) => GMapCircle;
  SymbolPath: { CIRCLE: unknown };
  Point: GMapPointConstructor;
  LatLngBounds: new () => GMapLatLngBounds;
  Animation: GMapAnimation;
}

// Pin icons = the 3D Fluent UI Emoji PNG with a thin colored ring outline.
// The ring color identifies the layer/state; the icon identifies the type.
// See `../icons.ts` for the canonical layer→{icon,color} mapping.
function makePinIcon(google: { maps: GMapConstructors }, dataUrl: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = google.maps as any;
  // Classic map-pin SVG (48×64 viewBox, 3:4 aspect). Render at 30×40.
  // Anchor at the pin's tip — y=60 in SVG coords, scaled to y=37.5 ≈ 38.
  return {
    url: dataUrl,
    scaledSize: new g.Size(30, 40),
    size: new g.Size(30, 40),
    anchor: new google.maps.Point(15, 38),
    // Position a count label inside the pin's white circle (not at the tip anchor).
    labelOrigin: new google.maps.Point(15, 14),
  };
}

declare global {
  interface Window {
    google?: { maps: GMapConstructors };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MapViewProps {
  center: { lat: number; lon: number } | null;
  appraisalPins: AppraisalPinDto[];
  marketComparablePins: MarketComparablePinDto[];
  pinFilters: PinFilterState;
  onMapClick: (lat: number, lon: number) => void;
  onAppraisalPinClick: (pin: AppraisalPinDto) => void;
  onMarketComparablePinClick: (pin: MarketComparablePinDto) => void;
  /** Bump this on each new search result to pan/zoom the map to fit the returned pins. */
  fitToken?: number;
  /** Radius to draw a circle around the center (km). Shown when center is also set. */
  radiusKm?: number;
  /** Called when the user pans/zooms the map (not programmatic moves). */
  onUserMovedMap?: (center: { lat: number; lon: number }) => void;
  /** Pin id of the currently hovered row/marker — bounces/highlights it (no map move). */
  highlightedPinId?: string | null;
  /** Pin id to pan the map to. Set only on result-row hover, NOT on map-pin hover. */
  panToPinId?: string | null;
  /** Called when the user hovers a marker on the map */
  onPinHover?: (pinId: string | null) => void;
  /** Called when a cluster of pins at the SAME location is clicked (so the user can pick one). */
  onCoincidentPins?: (pins: AnyPin[]) => void;
  /**
   * Group nearby markers into clusters at low zoom (default true). Disable on
   * embedded maps with few pins (360 / Find Existing) so distinct + fanned-out
   * coincident pins stay visible as individual coloured markers instead of merging.
   */
  cluster?: boolean;
  /**
   * Collateral pins for the current appraisal (Feature 2 — 360 page).
   * Rendered using the 'collateral-appraising' marker when showCollateralAppraising is true.
   */
  appraisingCollateralPins?: AppraisalPinDto[];
  /**
   * MC pins for the current appraisal (Feature 2 — 360 page).
   * Rendered using the 'mc-appraising' marker when showMcAppraising is true.
   */
  appraisingMcPins?: MarketComparablePinDto[];
}

/**
 * Google Maps view using the Maps JavaScript API loaded via a script tag.
 *
 * The VITE_GOOGLE_MAPS_API_KEY env var must be set for the map to load.
 * Without it the component shows a placeholder explaining what's needed.
 *
 * Marker colors: orange for Appraisal, blue for MC (see public/markers/*.svg).
 * Markers use the legacy Marker API for broad compatibility — AdvancedMarker
 * requires a Map ID which is optional. Pins are clustered at low zoom via
 * @googlemaps/markerclusterer; individual markers appear once you zoom in.
 */
export function MapView({
  center,
  appraisalPins,
  marketComparablePins,
  pinFilters,
  onMapClick,
  onAppraisalPinClick,
  onMarketComparablePinClick,
  fitToken,
  radiusKm,
  onUserMovedMap,
  highlightedPinId,
  panToPinId,
  onPinHover,
  onCoincidentPins,
  appraisingCollateralPins,
  appraisingMcPins,
  cluster = true,
}: MapViewProps) {
  const { t } = useTranslation('historySearch');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const markersRef = useRef<GMapMarker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const circleRef = useRef<GMapCircle | null>(null);
  // Map from pin id → marker for highlight/hover effects
  const markerMapRef = useRef<Map<string, GMapMarker>>(new Map());
  // Reverse map (marker → pin) so cluster clicks can resolve the underlying pins
  const markerToPinRef = useRef<Map<GMapMarker, AnyPin>>(new Map());
  // pin id → its coordinate, so row-hover can pan the map to that pin
  const pinPositionRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  // Appraising-pin markers tracked separately — they bypass the clusterer so they
  // are always visible at any zoom level (context pins for the current appraisal).
  const appraisingMarkersRef = useRef<GMapMarker[]>([]);
  // Latest onCoincidentPins ref so the clusterer's onClusterClick always calls the current one
  const onCoincidentPinsRef = useRef(onCoincidentPins);
  // Suppress the idle listener for programmatic moves (fitBounds/setCenter). Timestamp-based
  // so that multiple programmatic moves in one render (e.g. setCenter + fitBounds on a new
  // search) are all covered, and the suppression self-clears after the window (no stuck flag).
  const lastProgrammaticMoveRef = useRef(0);
  const PROGRAMMATIC_MOVE_WINDOW_MS = 1200;
  const idleListenerRef = useRef<GMapMapsEventListener | null>(null);
  // Latest onUserMovedMap ref — so the idle closure always calls the current callback
  const onUserMovedMapRef = useRef(onUserMovedMap);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // Keep the refs up to date whenever the props change
  useEffect(() => {
    onUserMovedMapRef.current = onUserMovedMap;
  }, [onUserMovedMap]);
  useEffect(() => {
    onCoincidentPinsRef.current = onCoincidentPins;
  }, [onCoincidentPins]);

  const clearMarkers = useCallback(() => {
    clustererRef.current?.clearMarkers();
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    // Clear appraising markers (not in clusterer — removed individually).
    appraisingMarkersRef.current.forEach(m => m.setMap(null));
    appraisingMarkersRef.current = [];
    markerMapRef.current.clear();
    markerToPinRef.current.clear();
    pinPositionRef.current.clear();
  }, []);

  const initMap = useCallback(() => {
    if (!containerRef.current || !window.google?.maps) return;
    if (mapRef.current) return; // already initialized

    const defaultCenter = center
      ? { lat: center.lat, lng: center.lon }
      : { lat: 13.7563, lng: 100.5018 }; // Bangkok

    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: defaultCenter,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapRef.current.addListener('click', (e: GMapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });

    // Idle listener — fires after pan/zoom animation ends.
    // We suppress the first idle after programmatic moves.
    idleListenerRef.current = mapRef.current.addListener('idle', () => {
      if (Date.now() - lastProgrammaticMoveRef.current < PROGRAMMATIC_MOVE_WINDOW_MS) {
        return;
      }
      const mapCenter = mapRef.current?.getCenter();
      if (mapCenter && onUserMovedMapRef.current) {
        onUserMovedMapRef.current({ lat: mapCenter.lat(), lon: mapCenter.lng() });
      }
    });
  // onMapClick / onUserMovedMap intentionally excluded — stable references expected from parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    clearMarkers();

    const newMarkers: GMapMarker[] = [];

    const google = window.google!;
    const appraisalIcon = makePinIcon(google, buildPinIcon('collateralExisting'));
    const mcIcon = makePinIcon(google, buildPinIcon('mcExisting'));
    const appraisingCollateralIcon = makePinIcon(google, buildPinIcon('collateralAppraising'));
    const appraisingMcIcon = makePinIcon(google, buildPinIcon('mcAppraising'));

    // Combine the visible pins, then group by exact location so coincident pins
    // collapse into ONE marker that shows the count and opens the chooser on click.
    type Entry = { id: string; pin: AnyPin; isAppraisal: boolean };
    const entries: Entry[] = [];
    if (pinFilters.showCollateral) {
      appraisalPins.forEach(p => entries.push({ id: p.appraisalId, pin: p, isAppraisal: true }));
    }
    if (pinFilters.showMarketComparables) {
      marketComparablePins.forEach(p => entries.push({ id: p.marketComparableId, pin: p, isAppraisal: false }));
    }

    const groups = new Map<string, Entry[]>();
    for (const e of entries) {
      const key = `${e.pin.lat.toFixed(5)},${e.pin.lon.toFixed(5)}`;
      const g = groups.get(key);
      if (g) g.push(e);
      else groups.set(key, [e]);
    }

    const makeIndividualMarker = ({ id, pin, isAppraisal }: Entry, position: { lat: number; lng: number }) => {
      const marker = new google.maps.Marker({
        position,
        map: mapRef.current!,
        icon: isAppraisal ? appraisalIcon : mcIcon,
        title: isAppraisal
          ? ((pin as AppraisalPinDto).appraisalNumber ?? '')
          : (pin as MarketComparablePinDto).surveyName,
        // Non-optimized so dynamic z-index reordering and the BOUNCE highlight
        // actually render — essential for revealing pins stacked at the same point.
        optimized: false,
      });
      marker.addListener('click', () =>
        isAppraisal
          ? onAppraisalPinClick(pin as AppraisalPinDto)
          : onMarketComparablePinClick(pin as MarketComparablePinDto),
      );
      marker.addListener('mouseover', () => onPinHover?.(id));
      marker.addListener('mouseout', () => onPinHover?.(null));
      newMarkers.push(marker);
      markerMapRef.current.set(id, marker);
      markerToPinRef.current.set(marker, pin);
      pinPositionRef.current.set(id, position);
    };

    groups.forEach(group => {
      const position = { lat: group[0].pin.lat, lng: group[0].pin.lon };

      // Clustered (standalone) view: collapse a coincident group into one count
      // marker that opens the chooser on click.
      if (cluster && group.length > 1) {
        const groupPins = group.map(g => g.pin);
        const marker = new google.maps.Marker({
          position,
          map: mapRef.current!,
          icon: group.some(g => g.isAppraisal) ? appraisalIcon : mcIcon,
          title: String(group.length),
          label: { text: String(group.length), color: '#ffffff', fontSize: '11px', fontWeight: '700' },
        });
        marker.addListener('click', () => onCoincidentPinsRef.current?.(groupPins));
        marker.addListener('mouseover', () => onPinHover?.(group[0].id));
        marker.addListener('mouseout', () => onPinHover?.(null));
        newMarkers.push(marker);
        group.forEach(g => {
          markerMapRef.current.set(g.id, marker);
          pinPositionRef.current.set(g.id, position);
        });
        return;
      }

      // Otherwise render each pin as its own marker — stacked at the same spot for
      // coincident pins. Hovering a result row raises that marker's z-index and
      // bounces it (see the highlight effect below), lifting it to the front so the
      // pins stacked behind it become visible.
      group.forEach(entry => makeIndividualMarker(entry, position));
    });

    // ── Appraising-collateral pins (Feature 2 — 360 page map) ─────────────────
    // These markers are added directly to the map (not via the clusterer) so the
    // current appraisal's own location is always visible at any zoom level.
    // They are tracked in appraisingMarkersRef and removed by clearMarkers().
    if (pinFilters.showCollateralAppraising && appraisingCollateralPins?.length) {
      appraisingCollateralPins.forEach((pin, i) => {
        const marker = new google.maps.Marker({
          position: { lat: pin.lat, lng: pin.lon },
          map: mapRef.current!,
          icon: appraisingCollateralIcon,
          title: pin.appraisalNumber ?? '',
          optimized: false,
        });
        marker.addListener('click', () => onAppraisalPinClick(pin));
        appraisingMarkersRef.current.push(marker);
        // Appraising-collateral pins on the 360 page all share the page's
        // appraisalId (used for PinDetailDrawer navigation), so they MUST NOT be
        // keyed by it in the tracking maps — use a unique per-marker key instead.
        const trackKey = `appraising-collateral:${i}`;
        markerMapRef.current.set(trackKey, marker);
        markerToPinRef.current.set(marker, pin);
        pinPositionRef.current.set(trackKey, { lat: pin.lat, lng: pin.lon });
      });
    }

    // ── Appraising-MC pins (Feature 2 — 360 page map) ─────────────────────────
    // Same pattern: added directly to the map, outside the clusterer.
    if (pinFilters.showMcAppraising && appraisingMcPins?.length) {
      appraisingMcPins.forEach((pin, i) => {
        const marker = new google.maps.Marker({
          position: { lat: pin.lat, lng: pin.lon },
          map: mapRef.current!,
          icon: appraisingMcIcon,
          title: pin.surveyName,
          optimized: false,
        });
        marker.addListener('click', () => onMarketComparablePinClick(pin));
        appraisingMarkersRef.current.push(marker);
        // Unique per-marker key — an appraising MC may also appear as an existing
        // (result) MC with the same marketComparableId; keep their tracking separate.
        const trackKey = `appraising-mc:${i}`;
        markerMapRef.current.set(trackKey, marker);
        markerToPinRef.current.set(marker, pin);
        pinPositionRef.current.set(trackKey, { lat: pin.lat, lng: pin.lon });
      });
    }

    markersRef.current = newMarkers;

    // Drop markers into the clusterer. It handles grouping at low zoom and
    // hands individual markers to the map at high zoom automatically.
    // We use `unknown` casts because our minimal GMap/GMapMarker shims don't
    // import @types/google.maps; the clusterer accepts the real Maps types.
    if (cluster && mapRef.current && newMarkers.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapAsAny = mapRef.current as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markersAsAny = newMarkers as any[];
      if (!clustererRef.current) {
        clustererRef.current = new MarkerClusterer({
          map: mapAsAny,
          markers: markersAsAny,
          // Custom cluster click: if all pins are at the SAME location (zooming can't
          // separate them) open the chooser; otherwise fit/zoom to the cluster.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClusterClick: ((_event: unknown, cluster: any) => {
            const clusterMarkers: GMapMarker[] = cluster?.markers ?? [];
            const pins = clusterMarkers
              .map(m => markerToPinRef.current.get(m))
              .filter((p): p is AnyPin => !!p);
            if (pins.length === 0) return;

            const distinctLocations = new Set(
              pins.map(p => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`),
            );
            if (distinctLocations.size <= 1) {
              // Truly coincident — zooming won't help; let the user pick.
              onCoincidentPinsRef.current?.(pins);
              return;
            }
            // Spread out — fit the map to the cluster (default-style zoom).
            if (mapRef.current && window.google?.maps) {
              const bounds = new window.google.maps.LatLngBounds();
              pins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }));
              lastProgrammaticMoveRef.current = Date.now();
              mapRef.current.fitBounds(bounds);
            }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any,
        });
      } else {
        clustererRef.current.addMarkers(markersAsAny);
      }
    }
  }, [
    appraisalPins,
    marketComparablePins,
    pinFilters,
    clearMarkers,
    onAppraisalPinClick,
    onMarketComparablePinClick,
    onPinHover,
    appraisingCollateralPins,
    appraisingMcPins,
    cluster,
  ]);

  // Load the Google Maps script via the shared hook (marker + places — places
  // is for the MapLocationPicker which lives elsewhere, but we share one
  // cached script per page so the libraries union is loaded together).
  const { ready: mapsReady } = useGoogleMaps(apiKey, ['marker', 'places']);

  useEffect(() => {
    if (mapsReady) initMap();
  // initMap is stable per center value; re-run is safe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  // Re-center map when center prop changes (programmatic — suppress idle)
  useEffect(() => {
    if (mapRef.current && center) {
      lastProgrammaticMoveRef.current = Date.now();
      mapRef.current.setCenter({ lat: center.lat, lng: center.lon });
    }
  }, [center]);

  // Re-render markers when pins or filters change
  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  // Pan/zoom the map to fit ALL visible pins after each search (fitToken bump) so
  // the user can see every result at once. Single/coincident → center; otherwise
  // zoom out to fit the bounding box. Includes the appraising (own) pins too.
  useEffect(() => {
    if (!fitToken || !mapRef.current || !window.google?.maps) return;

    const pins: { lat: number; lon: number }[] = [
      ...(pinFilters.showCollateral ? appraisalPins : []),
      ...(pinFilters.showMarketComparables ? marketComparablePins : []),
      ...(pinFilters.showCollateralAppraising ? (appraisingCollateralPins ?? []) : []),
      ...(pinFilters.showMcAppraising ? (appraisingMcPins ?? []) : []),
    ];
    if (pins.length === 0) return;

    lastProgrammaticMoveRef.current = Date.now();

    if (pins.length === 1) {
      mapRef.current.setCenter({ lat: pins[0].lat, lng: pins[0].lon });
      return;
    }

    // All pins at one coordinate → fitBounds would zoom to max (zero-size box).
    // Just centre on the point and keep the current zoom; the pins are stacked and
    // revealed by hovering a result row (which bounces that marker to the front).
    const distinctLocations = new Set(pins.map(p => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`));
    if (distinctLocations.size <= 1) {
      mapRef.current.setCenter({ lat: pins[0].lat, lng: pins[0].lon });
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    pins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }));
    // Padding keeps pins off the very edge of the viewport.
    mapRef.current.fitBounds(bounds, 64);
  // Only react to a new search (fitToken); pins are read at fire time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  // Radius circle: create/update/remove when center or radiusKm changes
  useEffect(() => {
    // Removal is independent of mapsReady so a circle is never orphaned.
    if (!center || !radiusKm) {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      return;
    }

    if (!mapsReady || !mapRef.current || !window.google?.maps) return;

    const centerPos = { lat: center.lat, lng: center.lon };

    if (circleRef.current) {
      circleRef.current.setCenter(centerPos);
      circleRef.current.setRadius(radiusKm * 1000);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = window.google.maps as any;
      circleRef.current = new g.Circle({
        center: centerPos,
        radius: radiusKm * 1000,
        map: mapRef.current,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.6,
        strokeWeight: 1.5,
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        clickable: false,
      });
    }
  }, [center, radiusKm, mapsReady]);

  // Highlight effect: raise z-index + briefly bounce the highlighted marker
  useEffect(() => {
    if (!window.google?.maps) return;

    const google = window.google;
    // Reset all markers to default z-index / no animation
    markerMapRef.current.forEach(marker => {
      marker.setZIndex(0);
      marker.setAnimation(null);
    });

    if (highlightedPinId) {
      const target = markerMapRef.current.get(highlightedPinId);
      if (target) {
        target.setZIndex(999);
        // BOUNCE animation (value = 1 in the Maps JS API)
        const bounceValue = (google.maps as unknown as { Animation: GMapAnimation }).Animation?.BOUNCE ?? 1;
        target.setAnimation(bounceValue);
        // Stop bouncing after 700 ms (one bounce cycle)
        const id = setTimeout(() => {
          target.setAnimation(null);
        }, 700);
        return () => clearTimeout(id);
      }
    }
  }, [highlightedPinId]);

  // Pan the map to a pin only when a RESULT ROW is hovered (not on map-pin hover,
  // which felt jittery). Flagged as a programmatic move so the idle listener
  // doesn't raise the "search this area" banner.
  useEffect(() => {
    if (!panToPinId || !mapRef.current) return;
    const pos = pinPositionRef.current.get(panToPinId);
    if (pos) {
      lastProgrammaticMoveRef.current = Date.now();
      mapRef.current.panTo(pos);
    }
  }, [panToPinId]);

  // Tear down map listeners, markers, clusterer, and the radius circle on unmount
  // (important for embedded mode, where MapView mounts/unmounts repeatedly).
  useEffect(() => {
    return () => {
      const g = window.google?.maps as unknown as
        | { event?: { clearInstanceListeners: (o: unknown) => void } }
        | undefined;
      if (mapRef.current && g?.event) g.event.clearInstanceListeners(mapRef.current);
      idleListenerRef.current?.remove();
      idleListenerRef.current = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cl = clustererRef.current as any;
      cl?.clearMarkers?.();
      cl?.setMap?.(null);
      clustererRef.current = null;
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      appraisingMarkersRef.current.forEach(m => m.setMap(null));
      appraisingMarkersRef.current = [];
      markerMapRef.current.clear();
      markerToPinRef.current.clear();
      pinPositionRef.current.clear();
      circleRef.current?.setMap(null);
      circleRef.current = null;
    };
  }, []);

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 gap-3 p-6 text-center">
        <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-sm font-medium text-gray-500">{t('map.noApiKey')}</p>
        <p className="text-xs text-gray-400 font-mono">VITE_GOOGLE_MAPS_API_KEY</p>
        <p className="text-xs text-gray-400">Set this in .env.development to enable the map.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-testid="map-view"
      aria-label={t('map.loading')}
    />
  );
}
