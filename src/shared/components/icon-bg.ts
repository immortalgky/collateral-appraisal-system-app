/**
 * Maps iconColor class names to their corresponding background color classes. A tint of the icon's
 * own colour rather than a -50 shade, which is near-white in dark mode.
 */
const ICON_COLOR_BG_MAP: Record<string, string> = {
  'text-blue-500': 'bg-blue-500/10',
  'text-purple-500': 'bg-purple-500/10',
  'text-amber-500': 'bg-amber-500/10',
  'text-cyan-500': 'bg-cyan-500/10',
  'text-emerald-500': 'bg-emerald-500/10',
  'text-teal-500': 'bg-teal-500/10',
  'text-rose-500': 'bg-rose-500/10',
  'text-orange-500': 'bg-orange-500/10',
  'text-indigo-500': 'bg-indigo-500/10',
  'text-sky-500': 'bg-sky-500/10',
};

const FALLBACK = 'bg-(--palette-surface-3)';

/**
 * Returns the Tailwind background class that pairs with the given icon color class.
 * Falls back to the neutral tinted surface when iconColor is null/undefined or unrecognised.
 */
export function getIconBgClass(iconColor: string | null | undefined): string {
  if (!iconColor) return FALLBACK;
  return ICON_COLOR_BG_MAP[iconColor] ?? FALLBACK;
}
