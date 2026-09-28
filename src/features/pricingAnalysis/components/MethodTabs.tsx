import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { MethodTabsNavSlotCtx } from '../store/methodTabsNavSlotContext';

export interface MethodTab {
  id: string;
  /**
   * Usually a plain string. ReactNode too so a tab can carry a count badge next to its
   * label (e.g. WQS's "ข้อมูลเปรียบเทียบ 8 ตลาด") without every other caller changing —
   * a string is already a valid ReactNode, so this widening is additive only.
   */
  label: ReactNode;
  content: ReactNode;
  /**
   * Optional controls rendered at the right of the tab strip itself while this tab is
   * active — the mock's per-tab toolbar (e.g. WQS's "ซ่อนแถวว่าง" checkbox and
   * "+ เพิ่มตลาด" button on the ข้อมูลเปรียบเทียบ tab). Omit for tabs with nothing to
   * put there; the strip renders exactly as before when no tab in the list sets it.
   */
  tools?: ReactNode;
  /**
   * Controls rendered after the column-nav pagination chips instead of before them —
   * the mock's WQS calc tab puts its Regression toggle there (renderSteps(): hint →
   * navHtml() → Regression button), which `tools` alone can't express since that slot
   * always renders before the nav strip. Omit for tabs with nothing that belongs after
   * the pagination; every other tab is unaffected.
   */
  toolsAfterNav?: ReactNode;
}

interface MethodTabsProps {
  tabs: MethodTab[];
}

/**
 * A method's internal steps (plan §1.2) — replaces the old single scrolling page that
 * stacked every section. Also removes the nested scroll container
 * (`#form-scroll-container` used to sit inside the page's own scroll area): this
 * component is now the only scroll boundary, one per tab.
 *
 * Generic over the tab list so every method (WQS/SAG/DC's three steps, BC's two, and
 * whichever methods come next) shares one shell instead of copying the strip. Callers
 * own their own tab ids/labels — see WQSForm.tsx for the three-step usage and
 * CostBuildingPanel.tsx for the two-step one.
 */
export function MethodTabs({ tabs }: MethodTabsProps) {
  // tabs[0]?.id is string | undefined — an empty tabs array is a caller bug, not a
  // state we render around, so this stays honest about that instead of asserting a
  // non-empty type the array itself doesn't guarantee.
  const [activeTab, setActiveTab] = useState<string | undefined>(tabs[0]?.id);
  const activeTabDef = tabs.find(tab => tab.id === activeTab);
  const activeTools = activeTabDef?.tools;
  const activeToolsAfterNav = activeTabDef?.toolsAfterNav;
  // Portal target for a ScrollableTableContainer's column-nav strip (see
  // methodTabsNavSlotContext.ts) — a callback ref so the provider value updates once
  // the node actually mounts, same shape as MethodTopBarPortalCtx's slot.
  const [navSlot, setNavSlot] = useState<HTMLDivElement | null>(null);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-stretch gap-1 px-1 h-[34px] border-b border-gray-200 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-3 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex items-center gap-3 ml-auto pr-1 whitespace-nowrap shrink-0">
          {/* A tab's own tools (checkbox/button/wheel-hint) first, then the column-nav
              pagination chips last — per the mock, renderSteps() appends navHtml() after
              the wheel hint, not before it. */}
          {activeTools}
          <div ref={setNavSlot} className="flex items-center" />
          {activeToolsAfterNav}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-0 pb-[16px]">
        {tabs.map(tab => (
          // h-full — the scroll container above has a definite height (flex-1 min-h-0
          // off MethodTabs' own h-full chain); without this, this wrapper sizes to its
          // content instead of inheriting that height, so nothing inside a tab (e.g.
          // WQSForm's calc-tab row) can bound its own height with flex-1/min-h-0 either
          // — the percentage chain breaks right here. Harmless for tabs that don't opt
          // into that pattern: a flex-col child with no flex-grow of its own still sizes
          // to its content and lets this scroll container handle overflow as before.
          <div
            key={tab.id}
            className={clsx('flex h-full flex-col gap-4', tab.id !== activeTab && 'hidden')}
          >
            {/* Only the active tab's content gets a real slot — an inactive tab's
                ScrollableTableContainer still renders (all tabs stay mounted, see
                WQSForm.tsx's note on that), but sees `null` and falls back to its own
                in-place nav strip, which is invisible anyway since this whole div is
                `hidden`. Without this per-tab gating, a hidden tab's nav strip would
                portal into the visible toolbar right alongside the active tab's. */}
            <MethodTabsNavSlotCtx.Provider value={tab.id === activeTab ? navSlot : null}>
              {tab.content}
            </MethodTabsNavSlotCtx.Provider>
          </div>
        ))}
      </div>
    </div>
  );
}
