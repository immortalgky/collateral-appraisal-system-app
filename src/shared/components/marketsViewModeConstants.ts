import type { MarketsViewMode } from '@shared/types';

/**
 * Layout modes for the Markets tab: the comparable rows, or the same list beside a map of where
 * each comparable sits relative to the property being appraised.
 */
export const MARKETS_VIEW_MODES: readonly MarketsViewMode[] = ['list', 'map'];

export const DEFAULT_MARKETS_VIEW_MODE: MarketsViewMode = 'list';

/** Guards the persisted value: an unknown mode falls back instead of blanking the tab. */
export const isMarketsViewMode = (value: unknown): value is MarketsViewMode =>
  typeof value === 'string' && (MARKETS_VIEW_MODES as readonly string[]).includes(value);
