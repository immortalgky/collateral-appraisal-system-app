import clsx from 'clsx';

interface CalendarNavHeaderProps {
  /** Rendered title, e.g. "July 2026" */
  label: string;
  /** Step to the previous month (up chevron) */
  onPrev: () => void;
  /** Step to the next month (down chevron) */
  onNext: () => void;
  /** When provided, the title becomes a button that toggles the month/year panel */
  onToggle?: () => void;
  /** Whether the month/year panel is currently open (rotates the caret) */
  expanded?: boolean;
  prevAriaLabel?: string;
  nextAriaLabel?: string;
  className?: string;
}

// Clickable "MMMM yyyy" title + vertical up/down month steppers.
// Shared by the date pickers (RDP caption replacement) and the dashboard widget.
export function CalendarNavHeader({
  label,
  onPrev,
  onNext,
  onToggle,
  expanded = false,
  prevAriaLabel = 'Previous month',
  nextAriaLabel = 'Next month',
  className,
}: CalendarNavHeaderProps) {
  const Title = onToggle ? 'button' : 'span';
  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <Title
        type={onToggle ? 'button' : undefined}
        onClick={onToggle}
        aria-expanded={onToggle ? expanded : undefined}
        className={clsx(
          'flex items-center gap-1 text-sm font-semibold text-gray-800 rounded px-1 -mx-1 py-0.5',
          onToggle &&
            'cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200',
        )}
      >
        <span>{label}</span>
        {onToggle && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className={clsx('text-gray-400 transition-transform', expanded && 'rotate-180')}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </Title>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrev}
          aria-label={prevAriaLabel}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={nextAriaLabel}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default CalendarNavHeader;
