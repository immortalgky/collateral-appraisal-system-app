/** `@container/form-shell` breakpoint (DESIGN.md 17.1), in rem of the live root font size. */
const WIDE_SHELL_REM = 84.2857;

/**
 * The shell width in px from which the rail sits beside the form. A stable function, as
 * `useCardIsWide` wants; shared by the property shell and Block's `CondoDetailShell`.
 */
export const wideShellPx = () =>
  WIDE_SHELL_REM * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 14);
