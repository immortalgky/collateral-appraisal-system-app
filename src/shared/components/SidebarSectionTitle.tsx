import clsx from 'clsx';
import Icon from './Icon';

/**
 * Sidebar section heading. The icon takes the same 1.75rem box and gap as a menu item's icon, so
 * it sits in the icon column (centred on the collapsed rail, where it stands in for the title) and
 * the title lines up with item labels — just past the rail's clip, so the rail needs no fading.
 */
export default function SidebarSectionTitle({
  icon,
  iconColor,
  title,
  className,
}: {
  icon: string;
  /** Tailwind text colour, like the amber star on Favorites. */
  iconColor: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-2.5 px-2.5', className)}>
      <span className="w-7 flex justify-center shrink-0">
        <Icon name={icon} style="solid" className={clsx('size-2.5', iconColor)} />
      </span>
      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
        {title}
      </span>
    </div>
  );
}
