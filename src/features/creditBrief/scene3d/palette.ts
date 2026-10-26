import { Color } from 'three';
import { DARK, LIGHT, type PaletteKey } from './paletteColors';

export type { PaletteKey };
export type Palette = Record<PaletteKey, Color>;

/** Dark mode is `[data-theme=dark]` on the root element, not the OS preference (DESIGN.md section 6). */
export const isDarkTheme = () =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

export function readPalette(dark = isDarkTheme()): Palette {
  const src = dark ? DARK : LIGHT;
  return Object.fromEntries(
    (Object.keys(src) as PaletteKey[]).map(k => [k, new Color(src[k])]),
  ) as Palette;
}
