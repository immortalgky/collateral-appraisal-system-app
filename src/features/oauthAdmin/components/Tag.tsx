import type { ReactNode } from 'react';
import clsx from 'clsx';

/** A small neutral label for grant types, scopes, resources and client names. */
const Tag = ({
  children,
  mono = false,
  title,
}: {
  children: ReactNode;
  mono?: boolean;
  title?: string;
}) => (
  <span
    title={title}
    className={clsx(
      'inline-flex items-center rounded-[0.3571rem] bg-(--palette-surface-3) px-2 py-px text-xs whitespace-nowrap text-(--palette-ink)',
      mono && 'font-mono',
    )}
  >
    {children}
  </span>
);

export default Tag;
