import type { ReactNode } from 'react';
import Icon from '../Icon';

export type GroupColor = 'teal' | 'blue' | 'cyan' | 'rose' | 'yellow';

const groupAccentStyles: Record<GroupColor, { border: string; text: string }> = {
  teal: { border: 'border-l-teal-500', text: 'text-(--palette-accent-ink)' },
  blue: { border: 'border-l-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  cyan: { border: 'border-l-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  rose: { border: 'border-l-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  yellow: { border: 'border-l-yellow-300 dark:border-l-yellow-500/40', text: 'text-yellow-400' },
};

interface GroupCardProps {
  icon: string;
  iconColor: GroupColor;
  title: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

/** Formal group container: bordered box with left-accent title bar */
const GroupCard = ({ icon, iconColor, title, rightSlot, children }: GroupCardProps) => {
  const s = groupAccentStyles[iconColor];
  return (
    <section
      className={`border border-(--palette-line) border-l-[3px] ${s.border} rounded-sm bg-(--palette-surface)`}
    >
      <header className="flex items-center gap-2 px-4 pt-3 pb-5">
        <Icon name={icon} style="solid" className={`size-3.5 ${s.text}`} />
        <h2 className="text-xs font-bold tracking-[0.12em] uppercase text-(--palette-ink)">
          {title}
        </h2>
        {rightSlot && <div className="ml-auto">{rightSlot}</div>}
      </header>
      <div className="px-4 pb-6 divide-y divide-(--palette-line-soft)">{children}</div>
    </section>
  );
};

export default GroupCard;
