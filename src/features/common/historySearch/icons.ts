/**
 * Pin layer icon catalogue — file-based.
 *
 * Each layer maps to a static SVG file in `/public/markers/`. The files are
 * the source of truth for the icon designs — edit them directly in any
 * vector editor (Figma, Inkscape, Illustrator) and they update both the
 * map markers and the filter-panel legend instantly.
 *
 * The earlier in-code SVG builders were collapsed into baked-in files so
 * the icons are editable as assets rather than as code. To swap an icon
 * (e.g. for a different style, or a generated PNG), drop a new file at
 * the same path.
 */

export type PinLayerKey =
  | 'collateralExisting'
  | 'collateralAppraising'
  | 'collateralMain'
  | 'mcExisting'
  | 'mcAppraising'
  | 'supportingData';

const ICON_URLS: Record<PinLayerKey, string> = {
  collateralExisting:   '/markers/collateral-existing.svg',
  collateralAppraising: '/markers/collateral-appraising.svg',
  collateralMain:       '/markers/collateral-main.svg',
  mcExisting:           '/markers/mc-existing.svg',
  mcAppraising:         '/markers/mc-appraising.svg',
  supportingData:       '/markers/supporting-data.svg',
};

/** Returns the public URL of the layer's icon file. */
export function buildPinIcon(layer: PinLayerKey): string {
  return ICON_URLS[layer];
}
