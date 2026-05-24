import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { CollateralPinDto, MarketComparablePinDto, PinFilterState } from '../types';
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

interface GMapMarkerOptions {
  position: { lat: number; lng: number };
  map: GMap;
  icon?: object;
  title?: string;
}

interface GMapMarker {
  setMap(map: GMap | null): void;
  addListener(event: string, handler: () => void): void;
}

interface GMapLatLngBounds {
  extend(pos: { lat: number; lng: number }): void;
}

interface GMap {
  setCenter(pos: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  fitBounds(bounds: GMapLatLngBounds, padding?: number): void;
  addListener(event: string, handler: (e: GMapMouseEvent) => void): void;
}

interface GMapPoint {
  x: number;
  y: number;
}

interface GMapPointConstructor {
  new (x: number, y: number): GMapPoint;
}

interface GMapConstructors {
  Map: new (el: HTMLElement, opts: object) => GMap;
  Marker: new (opts: GMapMarkerOptions) => GMapMarker;
  SymbolPath: { CIRCLE: unknown };
  Point: GMapPointConstructor;
  LatLngBounds: new () => GMapLatLngBounds;
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
  collateralPins: CollateralPinDto[];
  marketComparablePins: MarketComparablePinDto[];
  pinFilters: PinFilterState;
  onMapClick: (lat: number, lon: number) => void;
  onCollateralPinClick: (pin: CollateralPinDto) => void;
  onMarketComparablePinClick: (pin: MarketComparablePinDto) => void;
  /** Bump this on each new search result to pan/zoom the map to fit the returned pins. */
  fitToken?: number;
}

/**
 * Google Maps view using the Maps JavaScript API loaded via a script tag.
 *
 * The VITE_GOOGLE_MAPS_API_KEY env var must be set for the map to load.
 * Without it the component shows a placeholder explaining what's needed.
 *
 * Marker colors: Green (#22c55e) for Collateral, Blue (#3b82f6) for MC.
 * Markers use the legacy Marker API for broad compatibility — AdvancedMarker
 * requires a Map ID which is optional. Pins are clustered at low zoom via
 * @googlemaps/markerclusterer; individual markers appear once you zoom in.
 */
export function MapView({
  center,
  collateralPins,
  marketComparablePins,
  pinFilters,
  onMapClick,
  onCollateralPinClick,
  onMarketComparablePinClick,
  fitToken,
}: MapViewProps) {
  const { t } = useTranslation('historySearch');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const markersRef = useRef<GMapMarker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const clearMarkers = useCallback(() => {
    clustererRef.current?.clearMarkers();
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
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
  // onMapClick intentionally excluded — stable reference expected from parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    clearMarkers();

    const newMarkers: GMapMarker[] = [];

    const google = window.google!;
    const greenIcon = makePinIcon(google, buildPinIcon('collateralExisting'));
    const blueIcon = makePinIcon(google, buildPinIcon('mcExisting'));

    if (pinFilters.showCollateral) {
      collateralPins.forEach(pin => {
        const marker = new google.maps.Marker({
          position: { lat: pin.lat, lng: pin.lon },
          map: mapRef.current!,
          icon: greenIcon,
          title: `Collateral: ${pin.collateralType ?? ''}`,
        });
        marker.addListener('click', () => onCollateralPinClick(pin));
        newMarkers.push(marker);
      });
    }

    if (pinFilters.showMarketComparables) {
      marketComparablePins.forEach(pin => {
        const marker = new google.maps.Marker({
          position: { lat: pin.lat, lng: pin.lon },
          map: mapRef.current!,
          icon: blueIcon,
          title: pin.surveyName,
        });
        marker.addListener('click', () => onMarketComparablePinClick(pin));
        newMarkers.push(marker);
      });
    }

    markersRef.current = newMarkers;

    // Drop markers into the clusterer. It handles grouping at low zoom and
    // hands individual markers to the map at high zoom automatically.
    // We use `unknown` casts because our minimal GMap/GMapMarker shims don't
    // import @types/google.maps; the clusterer accepts the real Maps types.
    if (mapRef.current && newMarkers.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapAsAny = mapRef.current as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markersAsAny = newMarkers as any[];
      if (!clustererRef.current) {
        clustererRef.current = new MarkerClusterer({
          map: mapAsAny,
          markers: markersAsAny,
        });
      } else {
        clustererRef.current.addMarkers(markersAsAny);
      }
    }
  }, [
    collateralPins,
    marketComparablePins,
    pinFilters,
    clearMarkers,
    onCollateralPinClick,
    onMarketComparablePinClick,
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

  // Re-center map when center prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setCenter({ lat: center.lat, lng: center.lon });
    }
  }, [center]);

  // Re-render markers when pins or filters change
  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  // Pan/zoom the map to fit the returned pins after each search (fitToken bump).
  // Single pin → just center on it (keep the current zoom); multiple → fit bounds.
  useEffect(() => {
    if (!fitToken || !mapRef.current || !window.google?.maps) return;

    const pins: { lat: number; lon: number }[] = [
      ...(pinFilters.showCollateral ? collateralPins : []),
      ...(pinFilters.showMarketComparables ? marketComparablePins : []),
    ];
    if (pins.length === 0) return;

    if (pins.length === 1) {
      mapRef.current.setCenter({ lat: pins[0].lat, lng: pins[0].lon });
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    pins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }));
    mapRef.current.fitBounds(bounds);
  // Only react to a new search (fitToken); pins are read at fire time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

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
