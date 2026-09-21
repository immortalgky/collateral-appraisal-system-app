import type { PropertiesViewMode } from '@shared/types';

/**
 * Layout modes for the Properties tab, kept beside the other persisted UI preferences
 * (densityConstants, formLayoutConstants) so the shared store can read them without
 * reaching into a feature.
 */
export const PROPERTIES_VIEW_MODES: readonly PropertiesViewMode[] = [
  'rows',
  'cards',
  'table',
  'split',
];

export const DEFAULT_PROPERTIES_VIEW_MODE: PropertiesViewMode = 'rows';

/** Guards the persisted value: an unknown mode falls back instead of blanking the tab. */
export const isPropertiesViewMode = (value: unknown): value is PropertiesViewMode =>
  typeof value === 'string' && (PROPERTIES_VIEW_MODES as readonly string[]).includes(value);
