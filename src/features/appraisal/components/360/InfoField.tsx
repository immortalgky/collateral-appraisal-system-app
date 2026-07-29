import type { ReactNode } from 'react';
import clsx from 'clsx';

interface InfoFieldProps {
  label: string;
  /** Rendered as-is when a node; plain values fall back to an em dash when empty. */
  value?: ReactNode;
}

/**
 * Label/value pair used by the 360 overview cards.
 * Renders a muted em dash placeholder for null/empty scalar values.
 */
const InfoField = ({ label, value }: InfoFieldProps) => {
  const isEmpty = value == null || value === '';

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <div
        className={clsx('mt-1 text-sm truncate', isEmpty ? 'text-gray-300' : 'text-gray-900')}
        title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
      >
        {isEmpty ? '—' : value}
      </div>
    </div>
  );
};

export default InfoField;
