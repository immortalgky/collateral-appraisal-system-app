import type { ReactNode } from 'react';
import Icon from '../Icon';

export type GroupColor = 'teal' | 'blue' | 'cyan' | 'rose';

const groupAccentStyles: Record<GroupColor, { border: string; text: string }> = {
  teal: { border: 'border-l-teal-500', text: 'text-teal-600' },
  blue: { border: 'border-l-blue-500', text: 'text-blue-600' },
  cyan: { border: 'border-l-cyan-500', text: 'text-cyan-600' },
  rose: { border: 'border-l-rose-500', text: 'text-rose-600' },
};

interface GroupCardProps {
  icon: string;
  iconColor: GroupColor;
  title: string;
  children: ReactNode;
}

/** Formal group container: bordered box with left-accent title bar */
const GroupCard = ({ icon, iconColor, title, children }: GroupCardProps) => {
  const s = groupAccentStyles[iconColor];
  return (
    <section
      className={`border border-gray-200 border-l-[3px] ${s.border} rounded-sm bg-white`}
    >
      <header className="flex items-center gap-2 px-4 pt-3 pb-5">
        <Icon name={icon} style="solid" className={`size-3.5 ${s.text}`} />
        <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-gray-700">
          {title}
        </h2>
      </header>
      <div className="px-4 pb-6 divide-y divide-gray-100">{children}</div>
    </section>
  );
};

export default GroupCard;
