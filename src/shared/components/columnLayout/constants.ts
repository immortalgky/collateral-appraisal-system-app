/**
 * Sizing constants shared by every table that uses this column toolkit.
 *
 * Kept here rather than in a feature's column definitions so that a screen can adopt the toolkit
 * without importing that feature — the reason the toolkit was lifted out of `features/task` in the
 * first place.
 */

/** Fallback width for a column whose config gives no explicit default. */
export const DEFAULT_COLUMN_WIDTH = 150;

/** A column can never be dragged or auto-fitted narrower than this. */
export const MIN_COLUMN_WIDTH = 60;

/**
 * Double-click auto-fit stops here. Manual drag is allowed to go wider
 * (see MAX_DRAG_WIDTH) so a user can always pull a column open far enough to read a very long
 * value; auto-fit stays capped so it never snaps to an absurd width on its own.
 */
export const MAX_AUTOFIT_WIDTH = 480;

/** Upper bound for a manual resize drag. */
export const MAX_DRAG_WIDTH = 960;

/** Padding added around the widest measured cell when auto-fitting. */
export const AUTOFIT_PADDING = 24;
