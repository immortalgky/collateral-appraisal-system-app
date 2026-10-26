import { createContext, useContext } from 'react';

import type { ProjectType } from '../../types';

/** One entry of the Condo page's tab list. `icon` is only drawn by the classic pill bar. */
export interface CondoTabDef {
  id: string;
  label: string;
  icon: string;
}

export interface CondoShellValue {
  /** The type the project actually holds (falls back to the route's before it loads). */
  projectType: ProjectType;
  tabs: CondoTabDef[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** "Expand table": the header and tab bar are hidden so the open tab's table fills the screen. */
  focus: boolean;
  onFocusChange: (on: boolean) => void;
}

/**
 * What `CondoProjectHeader` needs from the page: the tab list and which one is open. BlockProjectPage
 * owns the `?tab=` param and provides this around its Condo tree, so a tab that renders its own
 * `CondoFrame` (the project-info form) never has to be handed the tab state as props.
 */
export const CondoShellContext = createContext<CondoShellValue | null>(null);

export function useCondoShell(): CondoShellValue {
  const value = useContext(CondoShellContext);
  if (!value) throw new Error('Condo shell components must render inside a CondoShellContext');
  return value;
}

/**
 * The project's effective type (stored type, else the route's) as BlockProjectPage resolved it.
 * Prefer this over the route-derived `projectType` prop wherever the type decides behaviour: the
 * `block-village` route serves both LB and L. Outside a shell (a tab rendered on its own) it is 'U'.
 */
export function useBlockProjectType(): ProjectType {
  return useContext(CondoShellContext)?.projectType ?? 'U';
}

const NO_FOCUS: Pick<CondoShellValue, 'focus' | 'onFocusChange'> = {
  focus: false,
  onFocusChange: () => {},
};

/** The focus (expand table) flag; outside a shell (a tab rendered on its own) it is always off. */
export function useCondoFocus() {
  return useContext(CondoShellContext) ?? NO_FOCUS;
}
