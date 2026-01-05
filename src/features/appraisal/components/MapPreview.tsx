import { useState } from 'react';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';

interface MapPreviewProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  className?: string;
}

export const MapPreview = ({ latitude, longitude, address, className }: MapPreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const hasCoordinates = latitude !== null && latitude !== undefined &&
                         longitude !== null && longitude !== undefined;

  // Default to Bangkok coordinates if no location provided
  const lat = latitude ?? 13.7563;
  const lng = longitude ?? 100.5018;
  const zoom = hasCoordinates ? 15 : 10;

  // OpenStreetMap embed URL (free, no API key required)
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;

  // Full map URL for opening in new tab
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!hasCoordinates) {
    return (
      <div className={clsx(
        'relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50',
        className
      )}>
        <div className="aspect-[16/9] flex flex-col items-center justify-center text-gray-400 p-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
            <Icon name="map-location-dot" className="text-lg" style="solid" />
          </div>
          <p className="text-xs font-medium text-gray-500">No Location Set</p>
          <p className="text-[10px] text-gray-400 mt-0.5 text-center">
            Property coordinates not available
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={clsx(
        'relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50',
        className
      )}>
        <div className="aspect-[16/9] flex flex-col items-center justify-center text-gray-400 p-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-2">
            <Icon name="triangle-exclamation" className="text-lg text-red-500" style="solid" />
          </div>
          <p className="text-xs font-medium text-gray-500">Map Unavailable</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Failed to load map preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'relative rounded-xl overflow-hidden border border-gray-100',
      className
    )}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center z-10">
          <Icon name="spinner" className="text-xl text-gray-400 animate-spin" style="solid" />
        </div>
      )}

      {/* Map iframe */}
      <iframe
        title="Property Location Map"
        src={mapUrl}
        className="w-full aspect-[16/9] border-0"
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {/* Overlay with address and action */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1 min-w-0">
            {address && (
              <p className="text-[10px] text-white/80 truncate">
                {address}
              </p>
            )}
            <p className="text-[10px] text-white/60 mt-0.5">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          </div>
          <a
            href={fullMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-2 py-1 bg-white/90 hover:bg-white text-gray-700 text-[10px] font-medium rounded-md flex items-center gap-1 transition-colors"
          >
            <Icon name="expand" style="solid" />
            <span>Open Map</span>
          </a>
        </div>
      </div>

      {/* Location marker indicator */}
      <div className="absolute top-2 left-2">
        <div className="px-2 py-1 bg-white/90 rounded-md flex items-center gap-1.5 shadow-sm">
          <Icon name="location-dot" className="text-red-500 text-xs" style="solid" />
          <span className="text-[10px] font-medium text-gray-700">Property Location</span>
        </div>
      </div>
    </div>
  );
};

export default MapPreview;
