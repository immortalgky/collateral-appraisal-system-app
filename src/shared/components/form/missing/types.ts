/** One missing field (or one row of missing fields) in the popover. */
export interface MissingFieldsItem {
  key: string;
  label: string;
  /** Form path to scroll to; null lands on the section itself. */
  path: string | null;
  /** How many empty fields this item stands for (a title row sums its own). Defaults to 1. */
  count?: number;
}

export interface MissingFieldsSection {
  /** DOM id of the section: where an item with no findable field lands. */
  id: string;
  title: string;
  items: MissingFieldsItem[];
}

export interface MissingFieldsSummary {
  sections: MissingFieldsSection[];
  /** Sum of the items' counts. */
  total: number;
}

/**
 * Brings the field at `path` on screen before the jump scrolls to it, e.g. by switching to the tab
 * it sits on. A page with tabs registers one (see `useRegisterMissingReveal`).
 */
export type RevealFn = (path: string) => void;

export const itemCount = (item: MissingFieldsItem) => item.count ?? 1;

export const sectionCount = (section: MissingFieldsSection) =>
  section.items.reduce((sum, item) => sum + itemCount(item), 0);
