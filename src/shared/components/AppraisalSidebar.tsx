import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '../store';
import Icon from './Icon';
import BrandLogo from './BrandLogo';
import SidebarHeader from './SidebarHeader';
import SidebarSectionTitle from './SidebarSectionTitle';
import { SidebarFavoritesSection } from '@features/menuFavorites/components/SidebarFavoritesSection';
import { useSidebarHover } from '@shared/hooks/useSidebarHover';
import { getIconBgClass } from './icon-bg';
import clsx from 'clsx';
import type { NavItem } from '@shared/config/navigationTypes';
import { DENSITY_SCALE } from './densityConstants';
import { useAppraisalNavigation, useNavigation } from '@shared/hooks/useNavigation';
import {
  useAppraisalRequestId,
  useAppraisalIsPma,
  useAppraisalIsBlock,
  useAppraisalBlockProjectType,
  useAppraisalStatus,
  useBasePath,
} from '@features/appraisal/context/AppraisalContext';

type AppraisalSidebarProps = {
  logo: string;
  hideGeneralNav?: boolean;
  loading?: boolean;
};

const SKELETON_LABEL_WIDTHS = ['w-28', 'w-20', 'w-32', 'w-24', 'w-16', 'w-28', 'w-20'];

function SkeletonRow({ index }: { index: number }) {
  const delay = `${index * 120}ms`;
  const labelWidth = SKELETON_LABEL_WIDTHS[index % SKELETON_LABEL_WIDTHS.length];
  return (
    <div className="flex items-center gap-2.5 py-2 px-2.5">
      <div className="w-7 h-7 rounded-lg shimmer shrink-0" style={{ animationDelay: delay }} />
      <div
        className={clsx('h-2.5 rounded-full shimmer', labelWidth)}
        style={{ animationDelay: delay }}
      />
    </div>
  );
}

/**
 * The application item for the page the user is on: the one whose href is the path itself or the
 * longest prefix of it. Property Information lives at `:basePath/property`, but its forms, market
 * comparables and laws open below it (`…/property/land/:id`), and an exact comparison left the
 * whole section dark there. Longest wins, so only one item ever lights.
 */
function activeApplicationHref(items: NavItem[], pathname: string): string | null {
  // A group's pricing analysis lives at `:basePath/groups/:id/pricing-analysis`, under no menu
  // item, but is opened from Property Information's Properties tab — the breadcrumb files it there
  // too — so it lights that item.
  const property = items.find(item => item.itemKey === 'appraisal.property');
  const path =
    property && /\/groups\/[^/]+\/pricing-analysis(\/|$)/.test(pathname) ? property.href : pathname;
  let best: string | null = null;
  for (const { href } of items) {
    if (!href || href === '#') continue;
    const matches = path === href || path.startsWith(`${href}/`);
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}

function CompactMenuItem({
  item,
  active,
  lockWhenReadOnly = true,
}: {
  item: NavItem & { canEdit?: boolean };
  /** Decided by the caller for the application section; otherwise the path must match exactly. */
  active?: boolean;
  /** Application pages can be read-only for this task; General links are just navigation. */
  lockWhenReadOnly?: boolean;
}) {
  const location = useLocation();
  const to = item.href;
  const isActive = active ?? location.pathname === item.href;
  const isReadOnly = lockWhenReadOnly && item.canEdit === false;
  const iconStyle = (item.iconStyle || 'solid') as
    | 'solid'
    | 'regular'
    | 'light'
    | 'thin'
    | 'duotone'
    | 'brands';

  const iconWithBadge = (
    <div
      className={clsx(
        'relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
        isActive ? 'bg-primary/10' : getIconBgClass(item.iconColor),
        'group-hover:scale-105',
      )}
    >
      <Icon
        name={item.icon}
        style={iconStyle}
        className={clsx('size-3.5', item.iconColor || 'text-gray-500')}
      />
      {isReadOnly && (
        <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-white flex items-center justify-center">
          <Icon name="lock" style="solid" className="size-1.5 text-gray-400" />
        </div>
      )}
    </div>
  );

  return (
    <Link
      to={to}
      className={clsx(
        'group flex items-center gap-2.5 py-2 px-2.5 rounded-lg transition-all duration-200',
        isActive ? 'bg-primary/10' : 'hover:bg-gray-50',
      )}
    >
      {iconWithBadge}
      <span className={clsx('text-xs font-medium', isActive ? 'text-primary' : 'text-gray-700')}>
        {item.name}
      </span>
    </Link>
  );
}

/**
 * The General links: the first few, with the rest behind "Show more". The toggle's chevron sits in
 * the icon column, so it is usable on the collapsed rail too without shifting anything.
 */
function NavSection({
  title,
  items,
  initialVisibleCount = 3,
}: {
  title: string;
  items: NavItem[];
  initialVisibleCount?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { pathname } = useLocation();
  // Groups (Task, Standalone…) carry href '#' and this list has no sub-rows; send a group to its
  // first entry (Task → All tasks) instead of a dead link. The rest are on the group's page menu.
  const links = useMemo(
    () =>
      items.map(item =>
        item.href === '#' && item.children?.length
          ? { ...item, href: item.children[0].href }
          : item,
      ),
    [items],
  );
  const hiddenCount = links.length - initialVisibleCount;
  const visibleItems = isExpanded ? links : links.slice(0, initialVisibleCount);
  const hiddenActiveItem =
    !isExpanded && links.slice(initialVisibleCount).some(item => pathname === item.href);

  return (
    <div className="mb-3">
      <SidebarSectionTitle icon="grid-2" iconColor="text-sky-500" title={title} className="mb-1" />
      <ul className="flex flex-col gap-0.5">
        {visibleItems.map(item => (
          <li key={item.itemKey || item.href}>
            <CompactMenuItem item={item} lockWhenReadOnly={false} />
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          title={isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
          className={clsx(
            'flex w-full items-center gap-2.5 py-1.5 px-2.5 mt-1 text-xs font-medium rounded-lg transition-colors',
            hiddenActiveItem
              ? 'text-primary bg-primary/5'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
          )}
        >
          <span className="w-7 flex justify-center shrink-0">
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              style="solid"
              className="size-2.5"
            />
          </span>
          <span className="whitespace-nowrap">
            {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
          </span>
        </button>
      )}
    </div>
  );
}

export function MobileAppraisalSidebar({
  logo,
  hideGeneralNav = false,
  loading = false,
}: AppraisalSidebarProps): React.ReactNode {
  const sidebarOpen = useUIStore(state => state.sidebarOpen);
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen);
  const requestId = useAppraisalRequestId();
  const basePath = useBasePath();
  const isPma = useAppraisalIsPma();
  const isBlock = useAppraisalIsBlock();
  const blockProjectType = useAppraisalBlockProjectType();
  const status = useAppraisalStatus();

  const navContext = useMemo(
    () => ({ isPma, isBlock, blockProjectType, status, basePath, requestId }),
    [isPma, isBlock, blockProjectType, status, basePath, requestId],
  );

  const applicationNav = useAppraisalNavigation(navContext);
  const { pathname } = useLocation();
  const activeHref = activeApplicationHref(applicationNav, pathname);
  const mainNav = useNavigation();

  // Use first 3 main nav items as "general" compact links

  return (
    <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex">
        <DialogPanel
          transition
          className="relative mr-16 flex w-full max-w-[256px] flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
        >
          <TransitionChild>
            <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
              <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                <span className="sr-only">Close sidebar</span>
                <Icon name="xmark" className="size-6 text-white" />
              </button>
            </div>
          </TransitionChild>

          <div className="flex grow flex-col overflow-y-auto bg-white">
            {/* Logo Area */}
            <div className="px-3 py-4">
              <BrandLogo logo={logo} onClick={() => setSidebarOpen(false)} />
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col px-3 py-2">
              {/* GENERAL Section */}
              {!hideGeneralNav &&
                (loading ? (
                  <div className="mb-3 flex flex-col gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonRow key={i} index={i} />
                    ))}
                  </div>
                ) : (
                  <NavSection title="General" items={mainNav} />
                ))}

              {/* APPLICATION Section */}
              <div className={clsx('pt-3', !hideGeneralNav && 'border-t border-gray-100')}>
                <SidebarSectionTitle
                  icon="folder-open"
                  iconColor="text-emerald-500"
                  title="Application"
                  className="mb-1"
                />
                <ul className="flex flex-col gap-0.5">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <li key={i}>
                          <SkeletonRow index={i + 3} />
                        </li>
                      ))
                    : applicationNav.map(item => (
                        <li key={item.href + item.itemKey}>
                          <CompactMenuItem item={item} active={item.href === activeHref} />
                        </li>
                      ))}
                </ul>
              </div>
            </nav>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default function AppraisalSidebar({
  logo,
  hideGeneralNav = false,
  loading = false,
}: AppraisalSidebarProps): React.ReactNode {
  const requestId = useAppraisalRequestId();
  const basePath = useBasePath();
  const isPma = useAppraisalIsPma();
  const isBlock = useAppraisalIsBlock();
  const blockProjectType = useAppraisalBlockProjectType();
  const status = useAppraisalStatus();
  const { expanded, overlay, width, contentStyle, hoverProps } = useSidebarHover('appraisal');
  // The rail is the full menu clipped to the 4rem rail, so every item keeps its position when
  // hovering opens the menu and the cursor stays on what it was over.
  const resetSidebarWidth = useUIStore(state => state.resetSidebarWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ move: ((e: PointerEvent) => void) | null; up: (() => void) | null }>({
    move: null,
    up: null,
  });

  useEffect(() => {
    return () => {
      if (dragRef.current.move) window.removeEventListener('pointermove', dragRef.current.move);
      if (dragRef.current.up) window.removeEventListener('pointerup', dragRef.current.up);
      document.body.style.userSelect = '';
    };
  }, []);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    const startX = e.clientX;
    const startW = useUIStore.getState().sidebarWidth;
    // The stored width is design px; the rendered edge is scaled by density, so the
    // cursor delta has to be converted back for the handle to track 1:1.
    const scale = DENSITY_SCALE[useUIStore.getState().density];
    const move = (ev: PointerEvent) =>
      useUIStore.getState().setSidebarWidth(startW + (ev.clientX - startX) / scale);
    const up = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      if (dragRef.current.move) window.removeEventListener('pointermove', dragRef.current.move);
      if (dragRef.current.up) window.removeEventListener('pointerup', dragRef.current.up);
      dragRef.current = { move: null, up: null };
    };
    dragRef.current = { move, up };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, []);

  const navContext = useMemo(
    () => ({ isPma, isBlock, blockProjectType, status, basePath, requestId }),
    [isPma, isBlock, blockProjectType, status, basePath, requestId],
  );

  const applicationNav = useAppraisalNavigation(navContext);
  const { pathname } = useLocation();
  const activeHref = activeApplicationHref(applicationNav, pathname);
  const mainNav = useNavigation();

  return (
    <aside
      {...hoverProps}
      className={clsx(
        'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col',
        overlay && 'lg:shadow-xl',
      )}
      style={{
        width,
        transition: isDragging ? 'none' : 'width 300ms',
      }}
    >
      <div className="flex grow flex-col min-h-0 overflow-hidden border-r border-gray-100 bg-white shadow-sm">
        <div className="flex grow flex-col min-h-0" style={contentStyle}>
          <SidebarHeader logo={logo} expanded={expanded} scope="appraisal" />

          {/* Favorites stay pinned under the logo, as on the main sidebar. */}
          <div className="shrink-0 max-h-[40vh] overflow-y-auto overflow-x-hidden pt-3 px-2">
            <SidebarFavoritesSection collapsed={!expanded} />
          </div>

          {/* Only the menu below the logo scrolls */}
          <div className="flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden">
            <nav className="flex flex-1 flex-col py-3 px-2">
              {/* GENERAL Section */}
              {!hideGeneralNav &&
                (loading ? (
                  <div className="mb-3 flex flex-col gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonRow key={i} index={i} />
                    ))}
                  </div>
                ) : (
                  <NavSection title="General" items={mainNav} />
                ))}

              {/* APPLICATION Section */}
              <div className={clsx('pt-3', !hideGeneralNav && 'border-t border-gray-100')}>
                <SidebarSectionTitle
                  icon="folder-open"
                  iconColor="text-emerald-500"
                  title="Application"
                  className="mb-1"
                />
                <ul className="flex flex-col gap-0.5">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <li key={i}>
                          <SkeletonRow index={i + 3} />
                        </li>
                      ))
                    : applicationNav.map(item => (
                        <li key={item.href + item.itemKey}>
                          <CompactMenuItem item={item} active={item.href === activeHref} />
                        </li>
                      ))}
                </ul>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Resize handle — only when expanded */}
      {expanded && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors"
          onPointerDown={handleResizePointerDown}
          onDoubleClick={resetSidebarWidth}
          aria-hidden="true"
        />
      )}
    </aside>
  );
}
