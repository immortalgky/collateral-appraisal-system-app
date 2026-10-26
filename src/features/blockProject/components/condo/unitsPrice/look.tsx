import type { ReactNode } from 'react';
import clsx from 'clsx';

import Alert from '@/shared/components/Alert';
import Dropdown from '@/shared/components/inputs/Dropdown';
import { chipClass } from '@/shared/components/inputs/controlStyles';

/** Filter chip (the system's choice chip, Standard): pressed is filled, with an optional count. */
export function FilterChip({
  pressed,
  count,
  onClick,
  children,
}: {
  pressed: boolean;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={clsx(chipClass('standard', pressed, false), 'gap-1.5')}
    >
      {children}
      {count !== undefined && (
        <span className="text-xs font-semibold tabular-nums">{count.toLocaleString()}</span>
      )}
    </button>
  );
}

/**
 * The toolbar filter: the shared `Dropdown compact`. The first entry (the placeholder) is "all" and
 * reads back as an empty string, which is what the filters keep in state.
 */
export function ToolbarDropdown({
  label,
  allLabel,
  value,
  options,
  onChange,
  className = 'w-40',
}: {
  label: string;
  allLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Dropdown
        compact
        aria-label={label}
        placeholder={allLabel}
        showValuePrefix={false}
        options={options.map(o => ({ ...o, id: o.value }))}
        value={value || null}
        onChange={(v: string | null) => onChange(v ?? '')}
      />
    </div>
  );
}

/**
 * A warning note: the shared `Alert` (warning), slimmed to a note. `oneLine` keeps it on one line
 * cut with an ellipsis (the full text is the tooltip) and shows an `action` at the right end.
 */
export function WarningNote({
  children,
  action,
  className,
  oneLine = false,
}: {
  children: string;
  action?: ReactNode;
  className?: string;
  oneLine?: boolean;
}) {
  return (
    <Alert
      variant="warning"
      // A status, not an alert: it is information beside the table, not an interruption.
      role="status"
      // Alert pads `p-4` and its text block is a flex item that cannot shrink below its content.
      className={clsx('px-3! py-1.5! [&>div>div.flex-1]:min-w-0', className)}
    >
      {oneLine ? (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-xs" title={children}>
            {children}
          </span>
          {action}
        </div>
      ) : (
        <span className="text-xs">{children}</span>
      )}
    </Alert>
  );
}

/** Empty value in a table cell. */
export function Dash() {
  return <span className="text-(--palette-ink-2)">—</span>;
}
