import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import { useUIStore } from '@shared/store';
import clsx from 'clsx';
import { useAuthStore } from '@features/auth/store.ts';
import { logout } from '@features/auth/utils/logout';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@shared/components/LanguageSwitcher';
// import ThemeToggle from '@shared/components/ThemeToggle'; // hidden for now
import DensityPicker from '@shared/components/DensityPicker';
import FormLayoutPicker from '@shared/components/FormLayoutPicker';
import Avatar from '@shared/components/Avatar';
import { useGlobalSearch } from '@shared/hooks/useGlobalSearch';
import { quickSearchHint } from '@shared/utils/platform';
import SearchResults from '@shared/components/search/SearchResults';
import type { SearchScope } from '@shared/types/search';
import NotificationDropdown from '@features/notification/components/NotificationDropdown';
import ConnectionStatusIndicator, {
  ConnectionStatusDot,
} from '@features/notification/components/ConnectionStatusIndicator';
import { HeaderFavoritesDropdown } from '@features/menuFavorites/components/HeaderFavoritesDropdown';
import type { UserNavItem } from '@shared/config/userNavigation';

/**
 * These pick which GROUP OF COLUMNS the server searches — not what kind of thing comes back.
 * Every result is an appraisal now, so a scope named after an entity would be misleading.
 */
const searchScopes = [
  { id: 'all' as const, labelKey: 'search.filters.all', icon: 'layer-group', color: 'gray' },
  {
    id: 'documents' as const,
    labelKey: 'search.filters.documents',
    icon: 'hashtag',
    color: 'blue',
  },
  {
    id: 'customers' as const,
    labelKey: 'search.filters.customers',
    icon: 'users',
    color: 'purple',
  },
  {
    id: 'properties' as const,
    labelKey: 'search.filters.properties',
    icon: 'building',
    color: 'amber',
  },
];

// Written out as literals: Tailwind scans source text, so an interpolated `ring-${color}-200`
// is never generated and the active chip silently loses its ring.
const scopeColorStyles: Record<
  string,
  { bg: string; text: string; activeBg: string; ring: string }
> = {
  // Text is the 700 shade on the light tint and the 300 shade on the dark one: 4.5:1 either way.
  gray: {
    bg: 'bg-(--palette-surface-3)',
    text: 'text-(--palette-gray-500)',
    activeBg: 'bg-(--palette-surface-3)',
    ring: 'ring-(--palette-line-strong)',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    activeBg: 'bg-blue-100 dark:bg-blue-900',
    ring: 'ring-blue-200 dark:ring-blue-800',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-700 dark:text-purple-300',
    activeBg: 'bg-purple-100 dark:bg-purple-900',
    ring: 'ring-purple-200 dark:ring-purple-800',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    activeBg: 'bg-amber-100 dark:bg-amber-900',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
};

const userMenuItemClass =
  'flex w-full items-center gap-3 px-4 py-2 text-sm text-(--palette-ink) data-focus:bg-(--palette-surface-3) data-focus:outline-hidden transition-colors';

const userMenuIcons: Record<string, string> = {
  'Your profile': 'user',
  Settings: 'gear',
};

export default function Navbar({
  userNavigation,
}: {
  userNavigation: UserNavItem[];
}): React.ReactNode {
  const { t } = useTranslation('nav');
  const currentUser = useAuthStore(state => state.user);
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const search = useGlobalSearch();

  const activeScope = searchScopes.find(s => s.id === search.selectedScope) ?? searchScopes[0];
  const activeColorStyle = scopeColorStyles[activeScope.color];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        search.closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [search.closeDropdown]);

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-(--palette-line) bg-(--palette-surface) px-4 sm:gap-x-6 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-(--palette-surface-2) text-(--palette-gray-500) hover:bg-(--palette-surface-3) hover:text-(--palette-ink) transition-all lg:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <Icon name="bars" style="solid" className="size-5" />
        </button>

        {/* Separator */}
        <div aria-hidden="true" className="h-6 w-px bg-(--palette-line) lg:hidden" />

        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          {/* Search bar */}
          <div
            ref={searchContainerRef}
            className="flex flex-1 items-center"
            onKeyDown={search.handleKeyDown}
          >
            <div
              className="relative w-full max-w-lg"
              role="combobox"
              aria-expanded={search.isFocused}
              aria-haspopup="listbox"
            >
              {/* Search Input */}
              <div
                className={clsx(
                  'relative flex items-center rounded-xl transition-all',
                  search.isFocused
                    ? 'bg-(--palette-surface) shadow-sm'
                    : 'bg-(--palette-surface-2) hover:bg-(--palette-surface-3)',
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
                  <Icon name={activeScope.icon} style="solid" className="size-3" />
                  <span className="hidden sm:inline leading-none">
                    {t(activeScope.labelKey as never)}
                  </span>
                  <Icon name="chevron-down" style="solid" className="size-2.5 opacity-60" />
                </button>

                {/* Search icon, or a spinner while a request is actually on the wire — not while
                    the debounce is still counting down, or it would spin on every keystroke. The
                    panel below covers that window with skeletons instead. */}
                <div className="pointer-events-none flex items-center pl-2">
                  <Icon
                    name={search.isSearching ? 'spinner' : 'magnifying-glass'}
                    style={search.isSearching ? 'solid' : 'regular'}
                    className={clsx(
                      'size-4',
                      search.isSearching
                        ? 'animate-spin text-(--palette-accent)'
                        : 'text-(--palette-gray-400)',
                    )}
                  />
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
                  aria-label={t('search.ariaLabel')}
                  aria-controls="search-results"
                  aria-activedescendant={
                    search.highlightedIndex >= 0
                      ? `search-result-${search.highlightedIndex}`
                      : undefined
                  }
                  className="block w-full bg-transparent py-2.5 pl-2 pr-4 text-sm text-(--palette-ink) placeholder:text-(--palette-gray-400) outline-none ring-0 border-none shadow-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none"
                  style={{ outline: 'none', boxShadow: 'none' }}
                />

                {/* Cmd+K on a Mac, Ctrl K elsewhere */}
                {!search.isFocused && (
                  <div className="hidden sm:flex items-center gap-1 mr-3 pointer-events-none">
                    <kbd className="whitespace-nowrap px-1.5 py-0.5 text-[10px] font-medium text-(--palette-gray-400) bg-(--palette-surface-3) rounded border border-(--palette-line)">
                      {quickSearchHint()}
                    </kbd>
                  </div>
                )}
              </div>

              {/* Dropdown */}
              {search.isFocused && (
                <div
                  id="search-results"
                  className="absolute top-full left-0 right-0 mt-2 bg-(--palette-surface) rounded-xl shadow-lg border border-(--palette-line) overflow-hidden z-50"
                >
                  {/* Filter Options */}
                  <div className="p-2 border-b border-(--palette-line-soft)">
                    <p className="px-2 py-1 text-xs font-semibold text-(--palette-gray-400) uppercase tracking-wider">
                      {t('search.searchIn')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {searchScopes.map(scope => {
                        const colorStyle = scopeColorStyles[scope.color];
                        const isActive = search.selectedScope === scope.id;
                        return (
                          <button
                            key={scope.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => search.setSelectedScope(scope.id as SearchScope)}
                            className={clsx(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                              isActive
                                ? [
                                    colorStyle.activeBg,
                                    colorStyle.text,
                                    'ring-1 ring-inset',
                                    colorStyle.ring,
                                  ]
                                : 'bg-(--palette-surface-2) text-(--palette-gray-600) hover:bg-(--palette-surface-3)',
                            )}
                          >
                            <Icon name={scope.icon} style="solid" className="size-3.5" />
                            {t(scope.labelKey as never)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="px-2 pt-2 text-xs text-(--palette-gray-400)">
                      {t(`search.scopeHint.${search.selectedScope}` as never)}
                    </p>
                  </div>

                  {/* Search Results or Recent Searches */}
                  <SearchResults
                    exactGroups={search.exactGroups}
                    restGroups={search.restGroups}
                    collapsedGroups={search.collapsedGroups}
                    onToggleGroup={search.toggleGroup}
                    isSearching={search.isLoading || search.isSearching || search.hasPendingTerm}
                    isError={search.isError}
                    isShowingResults={search.isShowingResults}
                    expandSubstring={search.expandSubstring}
                    highlightedIndex={search.highlightedIndex}
                    seeAllIndex={search.seeAllIndex}
                    totalMatched={search.totalMatched}
                    recentSearches={search.recentSearches}
                    onOpenResult={search.openResult}
                    onOpenFullResults={search.openFullResults}
                    onSelectRecentSearch={search.selectRecentSearch}
                    onSearchSubstring={search.searchSubstring}
                    onRetry={() => search.refetch()}
                  />

                  {/* Search Tips */}
                  <div className="px-4 py-2 bg-(--palette-surface-2) border-t border-(--palette-line-soft)">
                    <p className="text-xs text-(--palette-gray-500)">
                      <span className="font-medium">{t('search.tipLabel')}</span> {t('search.tip')}
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

            {/* Theme Toggle - hidden for now */}
            {/* <ThemeToggle /> */}

            {/* Favorites button */}
            <HeaderFavoritesDropdown />

            {/* Notification button */}
            <NotificationDropdown />

            {/* Separator */}
            <div
              aria-hidden="true"
              className="hidden lg:block lg:h-8 lg:w-px lg:bg-(--palette-line)"
            />

            {/* Profile dropdown */}
            <Menu as="div" className="relative">
              <MenuButton className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-(--palette-surface-3) transition-all">
                <span className="sr-only">Open user menu</span>
                <span className="relative inline-block">
                  <Avatar
                    src={currentUser?.avatarUrl}
                    name={
                      `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
                      'User'
                    }
                    size="md"
                    className="rounded-xl ring-2 ring-gray-100"
                  />
                  <ConnectionStatusDot ring className="absolute -bottom-0.5 -right-0.5 h-3 w-3" />
                </span>
                <span className="hidden lg:flex lg:flex-col lg:items-start">
                  <span className="text-sm font-semibold text-(--palette-ink)">
                    {`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`}
                  </span>
                  <span className="text-xs text-(--palette-gray-500)">{currentUser?.position}</span>
                </span>
                <Icon
                  name="chevron-down"
                  style="solid"
                  className="hidden lg:block size-4 text-(--palette-gray-400)"
                />
              </MenuButton>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-xl bg-(--palette-surface) py-2 shadow-lg ring-1 ring-(--palette-line) transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                {/* User info header */}
                <div className="px-4 py-3 border-b border-(--palette-line-soft)">
                  <p className="text-sm font-medium text-(--palette-ink)">{`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`}</p>
                  <p className="text-xs text-(--palette-gray-500) truncate">{currentUser?.email}</p>
                </div>

                {/* Realtime connection status + control */}
                <div className="border-b border-(--palette-line-soft)">
                  <ConnectionStatusIndicator />
                </div>

                {/* UI density — scales the whole app for smaller screens */}
                <div className="border-b border-(--palette-line-soft)">
                  <DensityPicker />
                </div>

                {/* Appraisal form layout — grid vs classic field arrangement */}
                <div className="border-b border-(--palette-line-soft)">
                  <FormLayoutPicker />
                </div>

                {userNavigation.map(item =>
                  item.signOut ? (
                    <MenuItem
                      key={item.name}
                      as="button"
                      type="button"
                      onClick={() => void logout()}
                      className={userMenuItemClass}
                    >
                      <Icon
                        name="arrow-right-from-bracket"
                        style="regular"
                        className="size-4 text-(--palette-gray-400)"
                      />
                      {item.nameKey ? t(item.nameKey as never) : item.name}
                    </MenuItem>
                  ) : (
                    // In-app destinations go through the router so the SPA does not
                    // reload on every click.
                    <MenuItem key={item.name}>
                      <Link to={item.href} className={userMenuItemClass}>
                        <Icon
                          name={userMenuIcons[item.name] ?? 'circle'}
                          style="regular"
                          className="size-4 text-(--palette-gray-400)"
                        />
                        {item.nameKey ? t(item.nameKey as never) : item.name}
                      </Link>
                    </MenuItem>
                  ),
                )}
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>
    </>
  );
}
