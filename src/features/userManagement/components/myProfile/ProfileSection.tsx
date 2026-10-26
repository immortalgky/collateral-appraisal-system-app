import Icon from '@shared/components/Icon';

const SECTION_ICON_COLORS = {
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
  rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
  amber: 'bg-(--palette-warn-wash) text-amber-500',
  teal: 'bg-(--palette-accent-wash) text-teal-500',
  violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-500',
  slate: 'bg-(--palette-surface-3) text-(--palette-ink-2)',
} as const;

interface ProfileSectionProps {
  icon: string;
  color?: keyof typeof SECTION_ICON_COLORS;
  title: string;
  /** Optional count chip after the title (roles, teams, …). */
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The card shell used by every profile section. Mirrors the section markup in
 * UserDetailPanel so the self-service page and the admin panel read as one system.
 */
const ProfileSection = ({
  icon,
  color = 'blue',
  title,
  count,
  action,
  children,
}: ProfileSectionProps) => (
  <section className="bg-white dark:bg-base-200 rounded-xl border border-gray-200 dark:border-base-300 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-base-300">
      <div className="flex items-center gap-2">
        <span
          className={`flex size-6 items-center justify-center rounded-md ${SECTION_ICON_COLORS[color]}`}
        >
          <Icon name={icon} style="solid" className="size-3" />
        </span>
        <span className="text-sm font-semibold text-gray-800 dark:text-base-content">{title}</span>
        {count !== undefined && (
          <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 dark:bg-base-300 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
    <div className="px-4 py-4">{children}</div>
  </section>
);

export default ProfileSection;
