import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';

/**
 * Shared date cell used across monitoring sections and task list pages.
 * Renders a formatted date with an optional time component and an optional
 * relative-time sublabel ("4 days ago").
 *
 * Format precedence (highest first):
 *   1. `format` prop — explicit date-fns format string (wins over withTime)
 *   2. `withTime: true`  → 'dd/MM/yyyy HH:mm'
 *   3. default           → 'dd/MM/yyyy'
 */
export function DateCell({
  value,
  format: customFormat,
  withTime = false,
  withAgo = false,
}: {
  value: string | null;
  format?: string;
  withTime?: boolean;
  withAgo?: boolean;
}) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;
  try {
    const parsed = parseISO(value);
    const fmt = customFormat ?? (withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-600 tabular-nums">{format(parsed, fmt)}</span>
        {withAgo && (
          <span className="text-[10px] text-gray-400 tabular-nums">
            {formatDistanceToNowStrict(parsed, { addSuffix: true })}
          </span>
        )}
      </div>
    );
  } catch {
    return <span className="text-gray-400 text-xs">—</span>;
  }
}
