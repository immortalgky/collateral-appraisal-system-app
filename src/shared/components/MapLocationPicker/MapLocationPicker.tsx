import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { MapTypeToggleButton } from '../MapTypeToggleButton';
import { useGoogleMaps } from './useGoogleMaps';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import {
  BANGKOK_CENTER,
  MAP_CONTROL_CLASS,
  MAP_TYPE_OPTIONS,
  THAILAND_MAP_RESTRICTION,
  isWithinThailand,
} from '@/shared/constants/mapConfig';
import { useGeolocation } from '@/shared/hooks/useGeolocation';

interface MapLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the picked coords when the user confirms */
  onConfirm: (lat: number, lon: number) => void;
  /** Existing coords — map opens centered here with a pre-placed marker */
  initialLat?: number | null;
  initialLon?: number | null;
}

/**
 * Modal-hosted map for picking a single (lat, lon) coordinate.
 *
 * Uses the Google Maps JS API via `useGoogleMaps` (loads `marker` + `places`
 * libraries together so this component and the History Search map share one
 * cached script). Places Autocomplete lets the user search by name; clicking
 * the map drops/moves the marker. Confirm fires `onConfirm(lat, lon)`.
 */
export function MapLocationPicker({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLon,
}: MapLocationPickerProps) {
  const { t } = useTranslation('historySearch');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const {
    ready,
    missingKey,
    failed: mapsFailed,
    retry: retryMaps,
  } = useGoogleMaps(apiKey, ['marker', 'places']);
  const { locate, locating } = useGeolocation();

  // Callback ref → state. Headless UI Dialog mounts children after a tick
  // (for focus-trap setup), so a plain `useRef` is null when the first effect
  // runs and never triggers a re-run when the DOM node attaches. Storing the
  // node in state makes attach/detach reactive — the effect re-fires when
  // the container element appears.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // Map instance, captured once ready, so the satellite⇄map toggle (a React
  // overlay next to the "my location" button) can drive it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Selected coordinate (null = nothing picked yet)
  const [selected, setSelected] = useState<{ lat: number; lon: number } | null>(null);

  // Place or move the marker. Pure side-effect on the map; updates state too.
  const placeMarker = useCallback((lat: number, lon: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    if (!g?.maps || !mapRef.current) return;

    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({
        position: { lat, lng: lon },
        map: mapRef.current,
        draggable: true,
      });
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current.getPosition();
        if (pos) setSelected({ lat: pos.lat(), lon: pos.lng() });
      });
    } else {
      markerRef.current.setPosition({ lat, lng: lon });
      markerRef.current.setMap(mapRef.current);
    }
    setSelected({ lat, lon });
  }, []);

  // "Use my location" — drop/move the pin at the user's current position.
  // Silent fallback on denial/unavailable or a fix outside Thailand.
  const handleLocateMe = useCallback(async () => {
    const coords = await locate();
    if (!coords || !isWithinThailand(coords.lat, coords.lon) || !mapRef.current) return;
    placeMarker(coords.lat, coords.lon);
    mapRef.current.setCenter({ lat: coords.lat, lng: coords.lon });
    mapRef.current.setZoom(16);
  }, [locate, placeMarker]);

  // Initialise the map once the API is ready and the modal is open.
  useEffect(() => {
    if (!isOpen || !ready || !containerEl) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;

    // The form schema defaults lat/lon to 0 as a sentinel for "not yet entered"
    // — treat (0, 0) as "no initial value" so the picker doesn't open in the
    // Gulf of Guinea with Confirm immediately enabled on the default value.
    const hasInitial =
      typeof initialLat === 'number' &&
      typeof initialLon === 'number' &&
      !Number.isNaN(initialLat) &&
      !Number.isNaN(initialLon) &&
      !(initialLat === 0 && initialLon === 0);

    const center = hasInitial
      ? { lat: initialLat as number, lng: initialLon as number }
      : BANGKOK_CENTER;

    mapRef.current = new g.maps.Map(containerEl, {
      center,
      zoom: hasInitial ? 16 : 12,
      ...MAP_TYPE_OPTIONS,
      streetViewControl: false,
      fullscreenControl: false,
      restriction: THAILAND_MAP_RESTRICTION,
    });

    // Expose the map so the React satellite⇄map toggle (rendered next to the
    // "my location" button) can control it.
    setMapInstance(mapRef.current);

    // Modal opens with a CSS scale-transition (300 ms). Google Maps measures
    // the container at construction time, so without this resize-trigger the
    // tiles get computed against the 95%-scaled container and never paint.
    // Firing `resize` after the transition completes forces a re-layout.
    const resizeTimer = window.setTimeout(() => {
      if (mapRef.current) {
        g.maps.event.trigger(mapRef.current, 'resize');
        mapRef.current.setCenter(center);
      }
    }, 350);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapRef.current.addListener('click', (e: any) => {
      if (e.latLng) placeMarker(e.latLng.lat(), e.latLng.lng());
    });

    if (hasInitial) {
      placeMarker(initialLat as number, initialLon as number);
    } else {
      setSelected(null);
    }

    return () => {
      window.clearTimeout(resizeTimer);
      // Explicitly clear listeners so the closures (capturing `setSelected`,
      // `placeMarker`, etc.) drop their references on cleanup — belt-and-
      // braces over relying on garbage collection.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gEvent = (window as any).google?.maps?.event;
      if (markerRef.current) {
        gEvent?.clearInstanceListeners?.(markerRef.current);
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapRef.current) {
        gEvent?.clearInstanceListeners?.(mapRef.current);
        mapRef.current = null;
      }
      setMapInstance(null);
    };
  }, [isOpen, ready, containerEl, initialLat, initialLon, placeMarker]);

  const handlePlaceSelect = useCallback(
    (lat: number, lon: number) => {
      placeMarker(lat, lon);
      if (mapRef.current) {
        mapRef.current.setCenter({ lat, lng: lon });
        mapRef.current.setZoom(16);
      }
    },
    [placeMarker],
  );

  const handleConfirm = () => {
    if (!selected) return;
    // Round to 6 decimal places (~10 cm of precision) to match the form
    // schema's `multipleOf(0.000001)` constraint. Google's Places API
    // returns full-precision floats which fail Zod validation otherwise.
    const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;
    onConfirm(round6(selected.lat), round6(selected.lon));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('locationPicker.title')} size="xl">
      <div className="flex flex-col gap-3" style={{ minHeight: 480 }}>
        {/* Search */}
        <PlacesAutocomplete
          ready={ready}
          placeholder={t('locationPicker.searchPlaceholder')}
          onPlaceSelect={handlePlaceSelect}
        />

        {/* Map (or fallback) */}
        {missingKey ? (
          <div
            className="flex flex-col items-center justify-center bg-gray-50 rounded-md text-center p-6 text-sm text-gray-500"
            style={{ height: 420 }}
          >
            <p className="font-medium">{t('map.noApiKey')}</p>
            <p className="text-xs text-gray-400 font-mono mt-1">VITE_GOOGLE_MAPS_API_KEY</p>
          </div>
        ) : mapsFailed ? (
          <div
            className="flex flex-col items-center justify-center gap-3 bg-gray-50 rounded-md text-center p-6 text-sm text-gray-500"
            style={{ height: 420 }}
          >
            <p className="font-medium">{t('map.loadFailed')}</p>
            <button
              type="button"
              onClick={retryMaps}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t('map.retry')}
            </button>
          </div>
        ) : (
          // flex-shrink-0 + min-h-[420px] prevent the parent flex column from
          // compressing the map when the autocomplete or other children claim height.
          <div className="relative flex-shrink-0 min-h-[420px]" style={{ height: 420 }}>
            <div
              ref={setContainerEl}
              className="w-full h-full rounded-md overflow-hidden border border-gray-200 bg-gray-100"
              data-testid="map-location-picker"
            />
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              {mapInstance && <MapTypeToggleButton map={mapInstance} className="p-2 text-sm" />}
              <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${MAP_CONTROL_CLASS} disabled:opacity-60 disabled:cursor-not-allowed`}
              title={t('map.myLocation')}
            >
              {locating ? (
                <svg
                  aria-hidden="true"
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8a4 4 0 100 8 4 4 0 000-8z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 2v3m0 14v3m10-10h-3M5 12H2"
                  />
                </svg>
              )}
              {t('map.myLocation')}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 tabular-nums">
            {selected
              ? t('locationPicker.selected', {
                  lat: selected.lat.toFixed(6),
                  lon: selected.lon.toFixed(6),
                })
              : t('locationPicker.clickHint')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('locationPicker.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selected}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('locationPicker.confirm')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
