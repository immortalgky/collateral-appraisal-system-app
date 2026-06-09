// Shared Google Maps configuration for the (Thailand-only) appraisal system.

// Thailand bounding box. Rectangular — Google's map `restriction` only supports
// a LatLngBounds box, not the country polygon, so the edges include thin slivers
// of neighbouring countries. Using a literal (not `new google.maps.LatLngBounds`)
// keeps this constant independent of whether the Maps script has loaded yet.
export const THAILAND_BOUNDS = { north: 20.5, south: 5.6, west: 97.3, east: 105.65 } as const;

// Padding (degrees) added around the tight Thailand box. Thailand is tall and
// narrow, so a little breathing room lets the whole country be framed comfortably
// when zoomed out rather than sitting flush against the pan limit.
const BOUNDS_PADDING = 1.5;

// Keep a map viewport over Thailand. strictBounds:false lets the user zoom out far
// enough to see the WHOLE country (the box's narrow width would otherwise cap the
// zoom under a hard lock); panning is still anchored so the view's center stays
// inside the padded Thailand box and can't drift into a neighbouring country.
export const THAILAND_MAP_RESTRICTION = {
  latLngBounds: {
    north: THAILAND_BOUNDS.north + BOUNDS_PADDING,
    south: THAILAND_BOUNDS.south - BOUNDS_PADDING,
    west: THAILAND_BOUNDS.west - BOUNDS_PADDING,
    east: THAILAND_BOUNDS.east + BOUNDS_PADDING,
  },
  strictBounds: false,
} as const;

// Default map center (Bangkok) when no coordinate is supplied.
export const BANGKOK_CENTER = { lat: 13.7563, lng: 100.5018 } as const;

// Base-layer (map type) options. Defaults the map to satellite imagery. The
// built-in mapTypeControl is disabled because we render our own custom-icon
// toggle instead (see addMapTypeToggle in shared/components/createMapTypeToggle).
// Plain string literals keep this independent of the Maps script load (the
// google.maps.MapTypeId enum isn't available until the script is ready).
export const MAP_TYPE_OPTIONS = {
  mapTypeId: 'satellite',
  mapTypeControl: false,
} as const;

// Tailwind classes for floating controls layered over a map (my-location button,
// radius pill, toggle, etc.). White with a strong shadow + border so the control
// reads clearly over both satellite imagery and the road map. Append layout/
// position utilities (absolute, bottom-3, flex, …) at each call site.
export const MAP_CONTROL_CLASS =
  'bg-white text-gray-700 border border-gray-200 shadow-md hover:bg-gray-50 transition-colors';

// True when a coordinate falls inside the (tight, unpadded) Thailand box. Used to
// reject out-of-country locations — e.g. a geolocation fix from abroad/VPN — since
// the maps and the underlying data are Thailand-only.
export function isWithinThailand(lat: number, lon: number): boolean {
  return (
    lat >= THAILAND_BOUNDS.south &&
    lat <= THAILAND_BOUNDS.north &&
    lon >= THAILAND_BOUNDS.west &&
    lon <= THAILAND_BOUNDS.east
  );
}
