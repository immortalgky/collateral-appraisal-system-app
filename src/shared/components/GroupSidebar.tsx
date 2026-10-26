import Icon from '@shared/components/Icon';

export interface GroupSidebarItem {
  /** Identity: what `activeKey` is compared with and what `onSelect` hands back. */
  key: string;
  /** Already resolved for display — this component does no lookups or translation of its own. */
  label: string;
  count: number;
  breached: number;
  atRisk: number;
  /** Drawn but not clickable: a group the screen has no way to filter to. */
  disabled?: boolean;
}

interface GroupSidebarProps {
  /** Small caption over the title, e.g. "Group by". Shown upper-case. */
  caption: string;
  /** The field being grouped by. */
  title: string;
  groups: GroupSidebarItem[];
  isLoading: boolean;
  /** Every group marked as selected: a screen's filter can hold several values at once. */
  activeKeys: string[];
  /**
   * The clicked group, or null when it is the only one selected (a second click clears it). Any
   * other click hands back the group, so a multi-value selection collapses to just that group.
   */
  onSelect: (group: GroupSidebarItem | null) => void;
  emptyLabel: string;
  /** The counts could not be loaded: a short muted line instead of the list or the empty state. */
  isError?: boolean;
  errorLabel?: string;
  /** Hover text for the red / amber counts. The defaults are English, as the monitoring tabs had. */
  breachedTitle?: (count: number) => string;
  atRiskTitle?: (count: number) => string;
  /** The amber "at risk" count beside the red one. On by default; the appraisal list leaves it out. */
  showAtRisk?: boolean;
  /** The red "breached" count. On by default (monitoring); the appraisal list shows totals only. */
  showBreached?: boolean;
}

/**
 * Left rail of groups beside a table: one row per group with its label, the breached (and at-risk)
 * count and the total, the active one marked by an accent on its left edge. Clicking the active row
 * again clears the selection. The monitoring tabs and the appraisal list share it.
 */
function GroupSidebar({
  caption,
  title,
  groups,
  isLoading,
  activeKeys,
  onSelect,
  emptyLabel,
  isError = false,
  errorLabel = '',
  breachedTitle = n => `${n} breached`,
  atRiskTitle = n => `${n} at risk`,
  showAtRisk = true,
  showBreached = true,
}: GroupSidebarProps) {
  return (
    <aside
      aria-label={title}
      className="shrink-0 w-60 border-r border-(--palette-line) bg-(--palette-surface-2) flex flex-col min-h-0"
    >
      {/* Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-(--palette-line) bg-(--palette-surface)">
        <p className="text-[10px] font-medium tracking-wider uppercase text-(--palette-gray-500)">
          {caption}
        </p>
        <p className="text-sm font-semibold text-(--palette-ink) mt-0.5">{title}</p>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-(--palette-surface-3) animate-pulse rounded" />
            ))}
          </div>
        ) : isError ? (
          <p className="px-4 py-8 text-center text-xs text-(--palette-gray-400)">{errorLabel}</p>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
            <Icon style="regular" name="inbox" className="size-6 text-(--palette-gray-300)" />
            <p className="text-xs text-(--palette-gray-400) text-center">{emptyLabel}</p>
          </div>
        ) : (
          <ul className="py-1">
            {groups.map(group => {
              const isActive = activeKeys.includes(group.key);
              const isOnlyOne = isActive && activeKeys.length === 1;
              return (
                <li key={group.key}>
                  <button
                    type="button"
                    disabled={group.disabled}
                    aria-pressed={isActive}
                    onClick={() => onSelect(isOnlyOne ? null : group)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors disabled:cursor-default ${
                      isActive
                        ? 'bg-(--palette-surface) border-l-2 border-primary text-(--palette-primary-text)'
                        : `border-l-2 border-transparent text-(--palette-ink) ${group.disabled ? '' : 'hover:bg-(--palette-surface)'}`
                    }`}
                  >
                    <span
                      className="text-xs font-medium truncate flex-1 min-w-0"
                      title={group.label}
                    >
                      {group.label}
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      {showBreached && group.breached > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums text-(--palette-danger)"
                          title={breachedTitle(group.breached)}
                        >
                          <span className="size-1.5 rounded-full bg-red-500" />
                          {group.breached}
                        </span>
                      )}
                      {showAtRisk && group.atRisk > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums text-amber-600 dark:text-amber-400"
                          title={atRiskTitle(group.atRisk)}
                        >
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          {group.atRisk}
                        </span>
                      )}
                      <span className="text-xs font-semibold tabular-nums text-(--palette-ink) ml-1">
                        {group.count}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default GroupSidebar;
