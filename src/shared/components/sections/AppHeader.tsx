import type { HTMLAttributes, ReactNode } from 'react';
import ReturnButton from '../buttons/ReturnButton';
import clsx from 'clsx';

interface AppHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  details?: ReactNode;
  actions?: ReactNode;
}

const AppHeader = ({ title, subtitle, details, actions, className }: AppHeaderProps) => {

  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <div className="flex items-center gap-3">
        <ReturnButton />

        <div>
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>

        {details && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <div className="text-sm text-gray-500">{details}</div>
          </>
        )}
      </div>

      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

export default AppHeader;
