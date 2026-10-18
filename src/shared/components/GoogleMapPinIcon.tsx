import { useId } from 'react';
import clsx from 'clsx';

/** Google Maps-style multicolour pin, for "view on map" buttons. */
function GoogleMapPinIcon({ className }: { className?: string }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 24 24" className={clsx('w-3.5 h-3.5 shrink-0', className)} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="12" height="9" fill="#4285F4" />
        <rect x="12" y="0" width="12" height="9" fill="#EA4335" />
        <rect x="0" y="9" width="12" height="15" fill="#FBBC04" />
        <rect x="12" y="9" width="12" height="15" fill="#34A853" />
      </g>
      <circle cx="12" cy="9" r="2.6" fill="#fff" />
    </svg>
  );
}

export default GoogleMapPinIcon;
