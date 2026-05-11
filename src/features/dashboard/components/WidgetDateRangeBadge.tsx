import { format } from 'date-fns';

type WidgetDateRangeBadgeProps = {
  from?: Date;
  to?: Date;
  asOf?: Date;
  label?: string;
};

/**
 * Compact date range or snapshot badge shown in widget headers.
 * Renders "MMM d – MMM d, yyyy" for a range, or "as of MMM d, yyyy" for a
 * point-in-time snapshot. Both fit on one line at text-xs.
 */
function WidgetDateRangeBadge({ from, to, asOf, label }: WidgetDateRangeBadgeProps) {
  if (label) {
    return <span className="text-xs text-gray-500">{label}</span>;
  }

  if (asOf) {
    return (
      <span className="text-xs text-gray-500">
        as of {format(asOf, 'MMM d, yyyy')}
      </span>
    );
  }

  if (from && to) {
    const sameYear = from.getFullYear() === to.getFullYear();
    const sameMonth = sameYear && from.getMonth() === to.getMonth();
    const sameDay = sameMonth && from.getDate() === to.getDate();
    let text: string;
    if (sameDay) {
      text = format(from, 'MMM d, yyyy');
    } else if (sameMonth) {
      text = `${format(from, 'MMM d')} – ${format(to, 'd, yyyy')}`;
    } else if (sameYear) {
      text = `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`;
    } else {
      text = `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`;
    }
    return <span className="text-xs text-gray-500">{text}</span>;
  }

  return null;
}

export default WidgetDateRangeBadge;
