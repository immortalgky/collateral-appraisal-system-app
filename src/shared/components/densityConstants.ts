import type { Density } from '@shared/types';

/**
 * UI density factors. Multiplied into the viewport-based root font-size step
 * (see `--cas-root-step` in index.css), so every rem-based size in the app —
 * fonts, Tailwind spacing, the right details panel — scales with it.
 *
 * The step is 14px up to 1920px wide and 15px from there. compact 0.92 turns the 14px step into
 * ~13px (12.9px), which is the setting for 1280x720 laptops (1080p at Windows 150% scaling);
 * comfortable 1.12 gives ~15.7px.
 * The Tailwind type scale (theme.css) is relative to the step, so at 14px: text-sm 13px, text-base 15px.
 */
export const DENSITY_SCALE: Record<Density, number> = {
  compact: 0.92,
  normal: 1,
  comfortable: 1.12,
};

export const DENSITY_OPTIONS: Density[] = ['compact', 'normal', 'comfortable'];

export const DEFAULT_DENSITY: Density = 'normal';

export function isDensity(value: unknown): value is Density {
  return value === 'compact' || value === 'normal' || value === 'comfortable';
}
