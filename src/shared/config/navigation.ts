export type NavItem = {
  name: string;
  href: string;
  icon: string;
  iconColor?: string; // Tailwind text color class
  iconStyle?: string; // Icon style: 'solid', 'regular', 'light'
  children?: NavItem[];
};

export const mainNavigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: 'gauge',
    iconColor: 'text-blue-500',
    iconStyle: 'solid',
  },
  {
    name: 'Task',
    href: '/task',
    icon: 'list-check',
    iconColor: 'text-purple-500',
    iconStyle: 'solid',
    children: [
      {
        name: 'My Tasks',
        href: '/task/my',
        icon: 'user-check',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
      },
      {
        name: 'All Tasks',
        href: '/task/all',
        icon: 'list',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
      },
    ],
  },
  {
    name: 'Notification',
    href: '/notification',
    icon: 'bell',
    iconColor: 'text-amber-500',
    iconStyle: 'solid',
  },
  {
    name: 'Appraisal',
    href: '/appraisal',
    icon: 'magnifying-glass-chart',
    iconColor: 'text-cyan-500',
    iconStyle: 'solid',
    children: [
      {
        name: 'Search',
        href: '/appraisal/search',
        icon: 'magnifying-glass',
        iconColor: 'text-cyan-500',
        iconStyle: 'solid',
      },
      {
        name: 'Create Request',
        href: '/request',
        icon: 'file-circle-plus',
        iconColor: 'text-emerald-500',
        iconStyle: 'solid',
      },
    ],
  },
  {
    name: 'Standalone',
    href: '/standalone',
    icon: 'puzzle-piece',
    iconColor: 'text-teal-500',
    iconStyle: 'solid',
  },
  {
    name: 'Parameter',
    href: '/parameter',
    icon: 'sliders',
    iconColor: 'text-rose-500',
    iconStyle: 'solid',
  },
  {
    name: 'Development',
    href: '/dev',
    icon: 'code',
    iconColor: 'text-orange-500',
    iconStyle: 'solid',
    children: [
      {
        name: 'Test Links',
        href: '/dev/test',
        icon: 'link',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Components',
        href: '/dev/components',
        icon: 'cubes',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Sandbox',
        href: '/dev/sandbox',
        icon: 'flask',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Land Detail',
        href: '/land-detail',
        icon: 'earth-asia',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
    ],
  },
];

export const userNavigation = [
  { name: 'Your profile', href: '/profile' },
  { name: 'Sign out', href: '/logout' },
];
