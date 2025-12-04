import type { HTMLAttributes, ReactNode } from 'react';
import ReturnButton from '../buttons/ReturnButton';
import Icon from '../Icon';
import clsx from 'clsx';

type IconVariant = 'folder' | 'document' | 'user' | 'settings';

interface AppHeaderProps extends HTMLAttributes<HTMLDivElement> {
  iconVariant?: IconVariant;
  title: string;
  subtitle?: string;
  details?: ReactNode;
  actions?: ReactNode;
}

const iconConfig: Record<IconVariant, { icon: string; bgColor: string }> = {
  folder: { icon: 'folder-open', bgColor: 'bg-primary-600' },
  document: { icon: 'file-lines', bgColor: 'bg-accent-500' },
  user: { icon: 'user', bgColor: 'bg-secondary-500' },
  settings: { icon: 'gear', bgColor: 'bg-gray-600' },
};

const AppHeader = ({ iconVariant, title, subtitle, details, actions, className }: AppHeaderProps) => {
  const config = iconVariant ? iconConfig[iconVariant] : null;

  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <div className="flex items-center gap-4">
        <ReturnButton />

        <div className="h-8 w-px bg-gray-200" />

        {config && (
          <div
            className={clsx(
              'size-10 rounded-xl flex items-center justify-center shadow-sm',
              config.bgColor,
            )}
          >
            <Icon style="solid" name={config.icon} className="size-5 text-white" />
          </div>
        )}

        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
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
