/**
 * Condo page shell and form primitives (one look: the standard card).
 *
 * - `CondoShellContext`         project type + tab list + active tab + change handler + focus flag, provided by BlockProjectPage
 * - `useBlockProjectType()`     the project's effective type (U | LB | L)
 * - `CondoFrame`                header + tab bar + scroller (+ optional `<form>` and footer)
 * - `CondoProjectHeader`        KPI card + tab bar (rendered by CondoFrame)
 * - `CondoDerivedHint`          "from the unit list N · matches | differs · use this value" line
 * - `CondoUnitForSaleHint`      the derived-vs-entered hint under Unit For Sale
 * - `useCondoRollup()`          the figures the header is built from
 */
export {
  CondoShellContext,
  useBlockProjectType,
  useCondoFocus,
  useCondoShell,
} from './CondoShellContext';
export type { CondoShellValue, CondoTabDef } from './CondoShellContext';
export { CondoFrame } from './CondoFrame';
export { CondoProjectHeader } from './CondoProjectHeader';
export { CondoDerivedHint } from './CondoDerivedHint';
export { CondoUnitForSaleHint } from './CondoUnitForSaleHint';
export { useCondoRollup } from './useCondoRollup';
export type { CondoRollup } from './useCondoRollup';
