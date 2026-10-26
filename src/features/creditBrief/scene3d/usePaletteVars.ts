import { useMemo, type CSSProperties } from 'react';
import { useUIStore } from '@/shared/store';
import { paletteVars } from './paletteColors';

/** The palette's colours as CSS variables for the box that holds the scene and its cards (see paletteVars). */
export function usePaletteVars(): CSSProperties {
  const dark = useUIStore(s => s.theme) === 'dark';
  return useMemo(() => paletteVars(dark) as CSSProperties, [dark]);
}
