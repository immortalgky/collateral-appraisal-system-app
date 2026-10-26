import clsx from 'clsx';

export type CountTabTone = 'neutral' | 'red' | 'amber';

export interface CountTab<T extends string> {
  value: T;
  label: string;
  /** Hidden while unknown (loading, failed): a placeholder "0" would read as all-clear. */
  count?: number;
  /** Colours the count when it is non-zero; a zero count is always neutral. */
  tone?: CountTabTone;
}

interface CountTabsProps<T extends string> {
  tabs: readonly CountTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the tab list for screen readers. */
  label: string;
}

const countClass: Record<CountTabTone, string> = {
  neutral: 'bg-gray-200 text-gray-600',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
};

/**
 * Status filter drawn as a grey track with the chosen tab lifted out as a white pill, each with
 * a count. The toolbar filter of the admin / monitoring list pages (deliveries, subscriptions, jobs).
 */
export function CountTabs<T extends string>({ tabs, value, onChange, label }: CountTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-gray-100 p-1"
    >
      {tabs.map(tab => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={clsx(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  countClass[tab.count > 0 ? (tab.tone ?? 'neutral') : 'neutral'],
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default CountTabs;
