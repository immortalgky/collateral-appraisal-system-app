/**
 * The scene's colours as plain hex, with no three.js in this file: the cards read them as CSS
 * variables (see paletteVars) on the brief page, whose bundle must not pull in three.js.
 * `palette.ts` turns the same tables into `Color`s for the materials.
 */
/**
 * Colours of the 3D collateral scene.
 *
 * Scene-only values, kept here rather than in `theme.css`: nothing else reads them, and WebGL
 * materials need `Color`s, not CSS variables. Accent, amber and danger follow the app's primary
 * (teal), accent and danger tokens; the dark set follows `[data-theme=dark]`.
 */
export const LIGHT = {
  bg: '#d6eaf8',
  ground: '#a9b0b7',
  mass: '#dfe3e8',
  band: '#c3cad3',
  edge: '#7f8b98',
  roof: '#b6bec8',
  lawn: '#cfe3c6',
  soil: '#c9b896',
  water: '#79b4d8',
  road: '#6d747c',
  roadLight: '#c7ccd1',
  laterite: '#c98f62',
  glass: '#c9d6e2',
  machine: '#e8a95a',
  land: '#e2ddd0',
  gravel: '#a9a399',
  tree: '#6aa36b',
  trunk: '#8b6f52',
  crop: '#93c15e',
  steel: '#4f5a66',
  window: '#5f7387',
  curtain: '#a7c2da',
  roofTile: '#c4846a',
  roofCement: '#9aa4ae',
  roofMetal: '#8fa6ba',
  accent: '#0d9488',
  // Sold units and plots: a saturated teal, clearly apart from the lawn and the lot colours.
  sold: '#0f766e',
  amber: '#d97706',
  danger: '#dc2626',
  // Tiles of the summary cards (a project; a kind with no drawing): CSS only, never a material.
  project: '#7fd3c8',
  other: '#cbd5e1',
};

export const DARK: typeof LIGHT = {
  bg: '#14202e',
  ground: '#22282e',
  mass: '#9aa4ae',
  band: '#707b86',
  edge: '#3c454e',
  roof: '#7c8792',
  lawn: '#5d7a58',
  soil: '#7d6c50',
  water: '#3f7fa6',
  road: '#3b4147',
  roadLight: '#7d858d',
  laterite: '#8f5f3c',
  glass: '#6f8496',
  machine: '#d08c3a',
  land: '#4f4b42',
  gravel: '#6b665f',
  tree: '#4c7d4e',
  trunk: '#5e4a36',
  crop: '#5f8a3c',
  steel: '#b3bdc7',
  window: '#1f2c37',
  curtain: '#4f6d88',
  roofTile: '#94604c',
  roofCement: '#6c7680',
  roofMetal: '#61788b',
  accent: '#2dd4bf',
  sold: '#14b8a6',
  amber: '#f59e0b',
  danger: '#f87171',
  project: '#2dd4bf',
  other: '#6b7684',
};

export type PaletteKey = keyof typeof LIGHT;

/**
 * The CSS variables the overlay and the summary cards read, taken from this palette so that a
 * colour exists once: the scene and the cards of a kind cannot drift apart. Set on the box that
 * holds them (`usePaletteVars`), so the CSS-only path has them without the engine.
 */
const CSS_VARS = {
  '--cs3d-k-land': 'lawn',
  '--cs3d-k-building': 'roofTile',
  '--cs3d-k-condo': 'mass',
  '--cs3d-k-machine': 'machine',
  '--cs3d-k-project': 'project',
  '--cs3d-k-other': 'other',
  '--cs3d-hi': 'sold',
  '--cs3d-sky-b': 'bg',
  '--cs3d-amber': 'amber',
  '--cs3d-danger': 'danger',
} as const satisfies Record<string, PaletteKey>;

export const paletteVars = (dark: boolean): Record<string, string> =>
  Object.fromEntries(
    Object.entries(CSS_VARS).map(([name, key]) => [name, (dark ? DARK : LIGHT)[key]]),
  );
