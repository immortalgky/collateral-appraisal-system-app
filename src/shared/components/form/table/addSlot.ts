import { createContext, useContext } from 'react';

/**
 * Where a Compact table's add link goes: the action area of the section band (DESIGN.md 17.7).
 * `FormSection` (Compact) provides its band node; `FormTableAdd` portals the link into it. Without
 * a provider the link renders inline under the table, so a table outside a section still works.
 * A table under its own `FormTableHeading` (`FormTableBlock`) gets that heading's right end instead.
 * Standard layouts ignore it: their add button sits under the table.
 */
const TableAddSlotContext = createContext<HTMLElement | null>(null);

export const TableAddSlotProvider = TableAddSlotContext.Provider;

export const useTableAddSlot = () => useContext(TableAddSlotContext);
