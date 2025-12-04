import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
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
}

const NavAnchors = ({ anchors, containerId, variant = 'default' }: NavAnchorsProps) => {
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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    const target = document.getElementById(id);
    if (!target) return;

    // Update active state immediately
    setCurrentAnchor(id);

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
              onClick={e => handleClick(e, anchor.id)}
              className={clsx(
                'relative z-10 flex items-center gap-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer',
                isCompact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
                isActive
                  ? 'text-primary bg-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
              )}
            >
              {anchor.icon && (
                <Icon
                  style="solid"
                  name={anchor.icon}
                  className={clsx('size-3.5', isActive ? 'text-primary' : 'text-gray-400')}
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
