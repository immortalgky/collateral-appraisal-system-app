/**
 * Resolve a label from a multi-language labels map.
 * Falls back to English if the requested language is not available,
 * then falls back to empty string.
 */
export function resolveLabel(labels: Record<string, string>, lang: string): string {
  return labels[lang] ?? labels['en'] ?? '';
}
