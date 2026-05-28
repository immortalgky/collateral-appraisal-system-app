/** Maps iconColor class names to their corresponding background color classes. */
const ICON_COLOR_BG_MAP: Record<string, string> = {
  'text-blue-500': 'bg-blue-50',
  'text-purple-500': 'bg-purple-50',
  'text-amber-500': 'bg-amber-50',
  'text-cyan-500': 'bg-cyan-50',
  'text-emerald-500': 'bg-emerald-50',
  'text-teal-500': 'bg-teal-50',
  'text-rose-500': 'bg-rose-50',
  'text-orange-500': 'bg-orange-50',
  'text-indigo-500': 'bg-indigo-50',
  'text-sky-500': 'bg-sky-50',
};

/**
 * Returns the Tailwind background class that pairs with the given icon color class.
 * Falls back to `bg-gray-100` when iconColor is null/undefined or unrecognised.
 */
export function getIconBgClass(iconColor: string | null | undefined): string {
  if (!iconColor) return 'bg-gray-100';
  return ICON_COLOR_BG_MAP[iconColor] ?? 'bg-gray-100';
}
