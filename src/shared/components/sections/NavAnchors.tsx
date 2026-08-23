import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';

interface NavAnchorsProps {
  anchors: NavAnchorItem[];
  containerId?: string;
  variant?: 'default' | 'compact';
}

interface NavAnchorItem {
  label: string;
  id: string;
  icon?: string;
  /** Custom onClick handler - if provided, overrides default scroll behavior */
  onClick?: () => void;
  /** If provided, navigates to this URL instead of scrolling to anchor */
  href?: string;
}

/**
 * Icon tint per anchor, keyed on the icon name rather than a new prop, so the ~40 call sites
 * stay untouched and any page using the same icon gets the same colour for free.
 *
 * The hues echo the section header chips the pages already paint: photos indigo, land amber,
 * lease purple, rental teal. Construction is amber-500 — the site-safety yellow, and the one
 * colour asked for by name.
 */
const ANCHOR_ICON_TINT: Record<string, string> = {
  images: 'text-indigo-500',
  camera: 'text-indigo-500',
  'helmet-safety': 'text-amber-500',
  'mountain-sun': 'text-amber-600',
  building: 'text-sky-600',
  buildings: 'text-sky-600',
  'file-contract': 'text-purple-500',
  'calendar-days': 'text-teal-500',
  clock: 'text-teal-500',
  'layer-group': 'text-cyan-600',
  'chart-line': 'text-emerald-600',
  'magnifying-glass-chart': 'text-emerald-600',
  'circle-check': 'text-green-600',
  gavel: 'text-rose-500',
  user: 'text-blue-500',
  'user-tie': 'text-blue-600',
  tags: 'text-pink-500',
  tag: 'text-pink-500',
  rotate: 'text-orange-500',
  'hand-pointer': 'text-violet-500',
  'map-location-dot': 'text-amber-600',
};

const NavAnchors = ({ anchors, containerId, variant = 'default' }: NavAnchorsProps) => {
  const navigate = useNavigate();
  const isCompact = variant === 'compact';
  const [currentAnchor, setCurrentAnchor] = useState<string>(anchors[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleSectionsRef = useRef<Set<string>>(new Set());

  // Scroll spy using IntersectionObserver
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const container = containerId ? document.getElementById(containerId) : null;

    // Get all target sections by ID
    const targets = anchors
      .map(anchor => document.getElementById(anchor.id))
      .filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    const handleIntersect: IntersectionObserverCallback = entries => {
      // Update visible sections set
      entries.forEach(entry => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          visibleSectionsRef.current.add(id);
        } else {
          visibleSectionsRef.current.delete(id);
        }
      });

      // Find the first visible section in order
      for (const anchor of anchors) {
        if (visibleSectionsRef.current.has(anchor.id)) {
          setCurrentAnchor(anchor.id);
          return;
        }
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      root: container,
      threshold: [0, 0.25, 0.5],
      rootMargin: '-5% 0px -50% 0px',
    });

    targets.forEach(target => observerRef.current?.observe(target));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [containerId, anchors]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, anchor: NavAnchorItem) => {
    e.preventDefault();

    // If href is provided, navigate to that URL instead
    if (anchor.href) {
      navigate(anchor.href);
      return;
    }

    // Update active state immediately
    setCurrentAnchor(anchor.id);

    // Call custom onClick if provided (in addition to scroll behavior)
    if (anchor.onClick) {
      anchor.onClick();
    }

    const target = document.getElementById(anchor.id);
    if (!target) return;

    // Get scroll container
    const container = containerId ? document.getElementById(containerId) : null;

    if (container) {
      // Calculate scroll position within container
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const scrollTop = container.scrollTop + (targetRect.top - containerRect.top);

      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    } else {
      // Scroll in window
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div className="relative">
      <nav
        className={clsx(
          'flex gap-0.5',
          isCompact ? 'bg-gray-100/80 p-0.5 rounded-lg' : 'bg-gray-50/80 p-0.5 rounded-lg border border-gray-100',
        )}
      >
        {anchors.map(anchor => {
          const isActive = anchor.id === currentAnchor;
          return (
            <a
              key={anchor.id}
              href={`#${anchor.id}`}
              data-anchor-id={anchor.id}
              onClick={e => handleClick(e, anchor)}
              className={clsx(
                'relative z-10 flex items-center gap-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer',
                isCompact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
                isActive
                  ? 'text-primary-700 bg-white shadow-sm ring-1 ring-primary-200'
                  : 'text-gray-500 hover:text-primary-600 hover:bg-white/60',
              )}
            >
              {anchor.icon && (
                <Icon
                  style="solid"
                  name={anchor.icon}
                  className={clsx(
                    'size-3.5 transition-opacity',
                    ANCHOR_ICON_TINT[anchor.icon] ?? 'text-primary-500',
                    isActive ? 'opacity-100' : 'opacity-55',
                  )}
                />
              )}
              <span>{anchor.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
};

export default NavAnchors;
