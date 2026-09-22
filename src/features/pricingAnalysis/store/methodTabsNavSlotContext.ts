import { createContext } from 'react';

/**
 * DOM node (owned by `MethodTabs`, inside its tab-strip toolbar) that a
 * `ScrollableTableContainer` with `columnNavSelector` set portals its column-nav strip
 * into, when it is currently inside the *active* tab of a `MethodTabs`. `MethodTabs`
 * provides this per tab — `null` for every tab that isn't the active one, and `null`
 * everywhere outside a `MethodTabs` tree entirely — so a table doesn't need to know
 * whether it's on-screen; it only portals when this is non-null, and renders its nav
 * strip in place (exactly as it always has) otherwise. That's what keeps every other
 * consumer of `ScrollableTableContainer` byte-identical: none of them sit inside a
 * `MethodTabs`, so this context is always `null` for them.
 */
export const MethodTabsNavSlotCtx = createContext<HTMLDivElement | null>(null);
