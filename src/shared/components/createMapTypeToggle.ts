// Custom "satellite ⇄ map" toggle for Google Maps.
//
// Google's built-in mapTypeControl can't be restyled into a custom icon, so we
// hide it (mapTypeControl:false) and push our own button into map.controls. The
// button is a plain DOM node — map.controls expects a node, not a React element
// — that renders a FontAwesome sprite icon (same /icons/{style}.svg#name scheme
// the <Icon> component uses) and flips map.setMapTypeId() on click.

// Minimal structural typings — the app's google shim doesn't model these.
type GMapLike = {
  getMapTypeId: () => string | undefined;
  setMapTypeId: (id: string) => void;
  controls: Array<{ push: (node: Node) => void }>;
};
type GMapsNamespace = { ControlPosition: Record<string, number> };

// FontAwesome solid sprite symbol shown for the action the click performs:
// in satellite → offer the road map; in map → offer satellite imagery.
const ICON_FOR_TARGET = {
  roadmap: 'map', // currently satellite, click switches to map
  satellite: 'earth-asia', // currently map, click switches to satellite
} as const;

/**
 * Adds a single-icon map-type toggle to `map` at `positionName` (a
 * google.maps.ControlPosition key, e.g. 'TOP_CENTER'). Returns the button
 * element (caller may ignore it). Safe to call once per map, after construction.
 */
export function addMapTypeToggle(
  map: GMapLike,
  googleMaps: GMapsNamespace,
  positionName: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  // White control with a strong shadow + border, matching Google's own controls.
  const BG = '#fff';
  const BG_HOVER = '#f5f5f5';
  button.style.cssText = [
    'margin:10px',
    'width:40px',
    'height:40px',
    'border:1px solid rgba(0,0,0,.15)',
    'border-radius:8px',
    `background:${BG}`,
    'box-shadow:0 1px 4px rgba(0,0,0,.3)',
    'cursor:pointer',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'color:#5f6368',
    'font-size:18px',
    'padding:0',
  ].join(';');
  button.addEventListener('mouseenter', () => (button.style.background = BG_HOVER));
  button.addEventListener('mouseleave', () => (button.style.background = BG));

  const render = () => {
    const next = map.getMapTypeId() === 'satellite' ? 'roadmap' : 'satellite';
    button.title = next === 'satellite' ? 'Switch to satellite view' : 'Switch to map view';
    button.setAttribute('aria-label', button.title);
    button.innerHTML =
      `<svg class="icon" aria-hidden="true">` +
      `<use xlink:href="/icons/solid.svg#${ICON_FOR_TARGET[next]}" /></svg>`;
  };

  button.addEventListener('click', () => {
    map.setMapTypeId(map.getMapTypeId() === 'satellite' ? 'roadmap' : 'satellite');
    render();
  });

  render();
  map.controls[googleMaps.ControlPosition[positionName]].push(button);
  return button;
}
