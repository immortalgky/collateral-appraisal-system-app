import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useEffect, useRef } from 'react';
import Icon from '@shared/components/Icon';
import { useUIStore } from '@shared/store';
import clsx from 'clsx';
import { useAuthStore } from '@features/auth/store.ts';
import { queryClient } from '@app/queryClient';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@shared/components/LanguageSwitcher';
import Avatar from '@shared/components/Avatar';
import { useGlobalSearch } from '@shared/hooks/useGlobalSearch';
import SearchResults from '@shared/components/search/SearchResults';
import SearchPreviewModal from '@shared/components/search/SearchPreviewModal';
import type { SearchFilter } from '@shared/types/search';

const searchFilters = [
  { id: 'all' as const, labelKey: 'search.filters.all', icon: 'layer-group', color: 'gray' },
  { id: 'requests' as const, labelKey: 'search.filters.requests', icon: 'folder-open', color: 'blue' },
  { id: 'customers' as const, labelKey: 'search.filters.customers', icon: 'users', color: 'purple' },
  { id: 'properties' as const, labelKey: 'search.filters.properties', icon: 'building', color: 'amber' },
];

const filterColorStyles: Record<string, { bg: string; text: string; activeBg: string }> = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-500', activeBg: 'bg-gray-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-500', activeBg: 'bg-blue-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500', activeBg: 'bg-purple-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500', activeBg: 'bg-amber-100' },
};

function handleLogout(href: string) {
  // Navigate FIRST — clearing Zustand state would trigger ProtectedRoute
  // to redirect to /login, which cancels the server logout navigation.
  // Clear storage directly without triggering React re-renders.
  localStorage.removeItem('auth_token');
  queryClient.clear();
  sessionStorage.clear();
  window.location.replace(href);
}

export default function Navbar({
  userNavigation,
}: {
  userNavigation: Record<string, string>[];
}): React.ReactNode {
  const { t } = useTranslation('nav');
  const currentUser = useAuthStore(state => state.user);
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const search = useGlobalSearch();

  const activeFilter = searchFilters.find(f => f.id === search.selectedFilter) || searchFilters[0];
  const activeColorStyle = filterColorStyles[activeFilter.color];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        search.closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [search.closeDropdown]);

  return (
    <>
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
          {/* Search bar */}
          <div
            ref={searchContainerRef}
            className="flex flex-1 items-center"
            onKeyDown={search.handleKeyDown}
          >
            <div className="relative w-full max-w-lg" role="combobox" aria-expanded={search.isFocused} aria-haspopup="listbox">
              {/* Search Input */}
              <div
                className={clsx(
                  'relative flex items-center rounded-xl transition-all',
                  search.isFocused ? 'bg-white shadow-sm' : 'bg-gray-50 hover:bg-gray-100',
                )}
              >
                {/* Filter Badge */}
                <button
                  type="button"
                  onClick={() => search.setIsFocused(true)}
                  className={clsx(
                    'flex items-center gap-1.5 ml-2 px-2 h-7 rounded-lg text-xs font-medium transition-all',
                    activeColorStyle.bg,
                    activeColorStyle.text,
                  )}
                >
                  <Icon name={activeFilter.icon} style="solid" className="size-3" />
                  <span className="hidden sm:inline leading-none">{t(activeFilter.labelKey as never)}</span>
                  <Icon name="chevron-down" style="solid" className="size-2.5 opacity-60" />
                </button>

                {/* Search Icon */}
                <div className="pointer-events-none flex items-center pl-2">
                  <Icon name="magnifying-glass" style="regular" className="size-4 text-gray-400" />
                </div>

                {/* Input */}
                <input
                  ref={search.inputRef}
                  name="search"
                  type="search"
                  value={search.searchQuery}
                  onChange={e => search.setSearchQuery(e.target.value)}
                  onFocus={() => search.setIsFocused(true)}
                  placeholder={t('search.placeholder')}
                  aria-label="Search"
                  aria-controls="search-results"
                  aria-activedescendant={search.highlightedIndex >= 0 ? `search-result-${search.highlightedIndex}` : undefined}
                  className="block w-full bg-transparent py-2.5 pl-2 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-0 border-none shadow-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none"
                  style={{ outline: 'none', boxShadow: 'none' }}
                />

                {/* Cmd+K hint */}
                {!search.isFocused && (
                  <div className="hidden sm:flex items-center gap-1 mr-3 pointer-events-none">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
                      ⌘K
                    </kbd>
                  </div>
                )}
              </div>

              {/* Dropdown */}
              {search.isFocused && (
                <div
                  id="search-results"
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
                >
                  {/* Filter Options */}
                  <div className="p-2 border-b border-gray-100">
                    <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('search.searchIn')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {searchFilters.map(filter => {
                        const colorStyle = filterColorStyles[filter.color];
                        const isActive = search.selectedFilter === filter.id;
                        return (
                          <button
                            key={filter.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => search.setSelectedFilter(filter.id as SearchFilter)}
                            className={clsx(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                              isActive
                                ? [
                                    colorStyle.activeBg,
                                    colorStyle.text,
                                    'ring-1 ring-inset',
                                    `ring-${filter.color}-200`,
                                  ]
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
                            )}
                          >
                            <Icon name={filter.icon} style="solid" className="size-3.5" />
                            {t(filter.labelKey as never)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search Results or Recent Searches */}
                  <SearchResults
                    data={search.data}
                    filter={search.selectedFilter}
                    isLoading={search.isLoading}
                    isError={search.isError}
                    isShowingResults={search.isShowingResults}
                    highlightedIndex={search.highlightedIndex}
                    flatResults={search.flatResults}
                    recentSearches={search.recentSearches}
                    onSelectResult={search.selectResult}
                    onSelectRecentSearch={search.selectRecentSearch}
                    onRetry={() => search.refetch()}
                  />

                  {/* Search Tips */}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Tip:</span> {t('search.tip')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-x-3 lg:gap-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Notification button */}
            <button
              type="button"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
            >
              <span className="sr-only">{t('notifications')}</span>
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
                <Avatar
                  src={currentUser?.avatarUrl}
                  name={`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'User'}
                  size="md"
                  className="rounded-xl ring-2 ring-gray-100"
                />
                <span className="hidden lg:flex lg:flex-col lg:items-start">
                  <span className="text-sm font-semibold text-gray-900">
                    {`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`}
                  </span>
                  <span className="text-xs text-gray-500">{currentUser?.position}</span>
                </span>
                <Icon
                  name="chevron-down"
                  style="solid"
                  className="hidden lg:block size-4 text-gray-400"
                />
              </MenuButton>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl bg-white py-2 shadow-lg ring-1 ring-gray-100 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                {/* User info header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                </div>
                {userNavigation.map(item =>
                  item.name === 'Sign out' ? (
                    <MenuItem
                      key={item.name}
                      as="button"
                      type="button"
                      onClick={() => handleLogout(item.href)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-50 data-focus:outline-hidden transition-colors"
                    >
                      <Icon
                        name="arrow-right-from-bracket"
                        style="regular"
                        className="size-4 text-gray-400"
                      />
                      {item.nameKey ? t(item.nameKey as never) : item.name}
                    </MenuItem>
                  ) : (
                    <MenuItem key={item.name}>
                      <a
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-50 data-focus:outline-hidden transition-colors"
                      >
                        <Icon
                          name={
                            item.name === 'Your profile'
                              ? 'user'
                              : item.name === 'Settings'
                                ? 'gear'
                                : 'arrow-right-from-bracket'
                          }
                          style="regular"
                          className="size-4 text-gray-400"
                        />
                        {item.nameKey ? t(item.nameKey as never) : item.name}
                      </a>
                    </MenuItem>
                  ),
                )}
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      {/* Search Preview Modal */}
      <SearchPreviewModal item={search.previewItem} onClose={search.closePreview} />
    </>
  );
}
