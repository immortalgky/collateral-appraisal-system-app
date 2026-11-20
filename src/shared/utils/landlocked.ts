/** The LandAccessibility code for "cannot be reached": a landlocked plot. */
export const LAND_NOT_ACCESSIBLE = '02';

/** Whether the land accessibility has an answer: a blank code (as the land form saves it) is none. */
export const hasLandAccessibilityAnswer = (
  accessibilityType: string | null | undefined,
): accessibilityType is string => accessibilityType != null && accessibilityType.trim() !== '';

/** Whether the land accessibility says "cannot be reached" (the code compared trimmed). */
export const isLandNotAccessible = (accessibilityType: string | null | undefined): boolean =>
  hasLandAccessibilityAnswer(accessibilityType) && accessibilityType.trim() === LAND_NOT_ACCESSIBLE;

/**
 * Whether a plot is landlocked, or null when nothing says. The land accessibility answers when it
 * has one; a record with no answer (an older record, from before the form asked the accessibility)
 * keeps what the old `isLandlocked` flag says, and with neither there is nothing to say. A block
 * project land is different: its form still asks both, so a screen that shows one reads the
 * accessibility OR the toggle there (see the brief scene). Shared by the screens that read a
 * property's flag, so they agree.
 */
export const isLandlocked = (
  accessibilityType: string | null | undefined,
  oldFlag: boolean | null | undefined,
): boolean | null => {
  if (hasLandAccessibilityAnswer(accessibilityType)) return isLandNotAccessible(accessibilityType);
  return oldFlag == null ? null : oldFlag;
};
