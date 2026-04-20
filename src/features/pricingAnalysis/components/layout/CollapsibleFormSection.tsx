import type { ReactNode } from 'react';
import { Icon } from '@/shared/components';

interface CollapsibleFormSectionProps {
  title: string;
  icon?: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: ReactNode;
  actions?: ReactNode;
}

export function CollapsibleFormSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
  actions,
}: CollapsibleFormSectionProps) {
  return (
    <details open={defaultOpen || undefined} className="group">
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4 pt-2">
          {icon && <Icon name={icon} className="size-4 text-gray-500 shrink-0" />}
          <h3 className="text-base font-semibold text-gray-800 flex-1">{title}</h3>
          {badge != null && (
            <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
          <Icon
            name="chevron-down"
            className="chevron-icon size-4 text-gray-400 transition-transform duration-200 group-open:rotate-180 shrink-0"
          />
        </div>
      </summary>
      <div className="px-4 pt-2 pb-4">{children}</div>
    </details>
  );
}
