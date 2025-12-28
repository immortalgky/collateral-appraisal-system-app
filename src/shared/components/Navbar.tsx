import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useState, useRef, useEffect } from 'react';
import Icon from '@shared/components/Icon';
import { useUIStore } from '@shared/store';
import clsx from 'clsx';

const searchFilters = [
  { id: 'all', label: 'All', icon: 'layer-group', color: 'gray' },
  { id: 'requests', label: 'Requests', icon: 'folder-open', color: 'blue' },
  { id: 'customers', label: 'Customers', icon: 'users', color: 'purple' },
  { id: 'properties', label: 'Properties', icon: 'building', color: 'amber' },
  { id: 'documents', label: 'Documents', icon: 'file-lines', color: 'teal' },
];

const filterColorStyles: Record<string, { bg: string; text: string; activeBg: string }> = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-500', activeBg: 'bg-gray-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-500', activeBg: 'bg-blue-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500', activeBg: 'bg-purple-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500', activeBg: 'bg-amber-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-500', activeBg: 'bg-teal-100' },
};

export default function Navbar({
  userNavigation,
}: {
  userNavigation: Record<string, string>[];
}): React.ReactNode {
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilter = searchFilters.find(f => f.id === selectedFilter) || searchFilters[0];
  const activeColorStyle = filterColorStyles[activeFilter.color];

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-100 bg-white px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all lg:hidden"
      >
        <span className="sr-only">Open sidebar</span>
        <Icon name="bars" style="solid" className="size-5" />
      </button>

      {/* Separator */}
      <div aria-hidden="true" className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Enhanced Search bar */}
        <div ref={searchRef} className="flex flex-1 items-center">
          <div className="relative w-full max-w-lg">
            {/* Search Input */}
            <div
              className={clsx(
                'relative flex items-center rounded-xl transition-all',
                searchFocused
                  ? 'bg-white shadow-sm'
                  : 'bg-gray-50 hover:bg-gray-100',
              )}
            >
              {/* Filter Badge */}
              <button
                type="button"
                onClick={() => setSearchFocused(true)}
                className={clsx(
                  'flex items-center gap-1.5 ml-2 px-2 py-1 rounded-lg text-xs font-medium transition-all',
                  activeColorStyle.bg,
                  activeColorStyle.text,
                )}
              >
                <Icon name={activeFilter.icon} style="solid" className="size-3" />
                <span className="hidden sm:inline">{activeFilter.label}</span>
                <Icon name="chevron-down" style="solid" className="size-2.5 opacity-60" />
              </button>

              {/* Search Icon */}
              <div className="pointer-events-none flex items-center pl-2">
                <Icon name="magnifying-glass" style="regular" className="size-4 text-gray-400" />
              </div>

              {/* Input */}
              <input
                name="search"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder={`Search ${activeFilter.id === 'all' ? 'everything' : activeFilter.label.toLowerCase()}...`}
                aria-label="Search"
                className="block w-full bg-transparent py-2.5 pl-2 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-0 border-none shadow-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />

            </div>

            {/* Filter Dropdown */}
            {searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                {/* Filter Options */}
                <div className="p-2 border-b border-gray-100">
                  <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Search in
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {searchFilters.map(filter => {
                      const colorStyle = filterColorStyles[filter.color];
                      const isActive = selectedFilter === filter.id;
                      return (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setSelectedFilter(filter.id)}
                          className={clsx(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                            isActive
                              ? [colorStyle.activeBg, colorStyle.text, 'ring-1 ring-inset', `ring-${filter.color}-200`]
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
                          )}
                        >
                          <Icon name={filter.icon} style="solid" className="size-3.5" />
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Searches or Quick Actions */}
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Recent
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {['REQ-2024-001', 'John Smith', 'Bangkok property'].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Icon name="clock-rotate-left" style="regular" className="size-4 text-gray-400" />
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Tips */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Tip:</span> Use filters to narrow down results
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-x-3 lg:gap-x-4">
          {/* Notification button */}
          <button
            type="button"
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
          >
            <span className="sr-only">View notifications</span>
            <Icon name="bell" style="regular" className="size-5" />
            {/* Notification indicator */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-white" />
          </button>

          {/* Separator */}
          <div aria-hidden="true" className="hidden lg:block lg:h-8 lg:w-px lg:bg-gray-200" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <MenuButton className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-50 transition-all">
              <span className="sr-only">Open user menu</span>
              <img
                alt=""
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                className="size-9 rounded-xl object-cover ring-2 ring-gray-100"
              />
              <span className="hidden lg:flex lg:flex-col lg:items-start">
                <span className="text-sm font-semibold text-gray-900">Tom Cook</span>
                <span className="text-xs text-gray-500">Administrator</span>
              </span>
              <Icon name="chevron-down" style="solid" className="hidden lg:block size-4 text-gray-400" />
            </MenuButton>
            <MenuItems
              transition
              className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl bg-white py-2 shadow-lg ring-1 ring-gray-100 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">Tom Cook</p>
                <p className="text-xs text-gray-500 truncate">tom.cook@lhbank.co.th</p>
              </div>
              {userNavigation.map(item => (
                <MenuItem key={item.name}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-50 data-focus:outline-hidden transition-colors"
                  >
                    <Icon
                      name={item.name === 'Your profile' ? 'user' : item.name === 'Settings' ? 'gear' : 'arrow-right-from-bracket'}
                      style="regular"
                      className="size-4 text-gray-400"
                    />
                    {item.name}
                  </a>
                </MenuItem>
              ))}
            </MenuItems>
          </Menu>
        </div>
      </div>
    </div>
  );
}
