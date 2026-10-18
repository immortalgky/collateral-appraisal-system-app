import clsx from 'clsx';
import Icon from '../Icon';
import type { ReactNode } from 'react';

interface InfoRowProps {
  icon: string;
  label: string;
  value: ReactNode;
  muted?: boolean;
}

// Only a machine-looking token is cut with an ellipsis; ordinary text (Thai has no spaces between
// words) wraps.
const CODE = /^[A-Za-z0-9_.:\-/]+$/;

const InfoRow = ({ icon, label, value, muted }: InfoRowProps) => {
  const isCode = typeof value === 'string' && CODE.test(value);
  return (
    <div className="flex items-start justify-between gap-3">
      {/* The label is capped at half the row and wraps past that, so it cannot squeeze the value. */}
      <div className="flex max-w-1/2 shrink-0 items-start gap-2 text-xs text-gray-500">
        <Icon style="regular" name={icon} className="mt-0.5 size-3.5 shrink-0 text-gray-400" />
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <span
        title={typeof value === 'string' ? value : undefined}
        className={clsx(
          'min-w-0 flex-1 text-xs font-medium text-right',
          isCode ? 'truncate' : 'line-clamp-5 break-words',
          muted ? 'text-gray-400' : 'text-gray-700',
        )}
      >
        {value}
      </span>
    </div>
  );
};

export default InfoRow;
