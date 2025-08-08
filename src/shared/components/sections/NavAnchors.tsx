import clsx from 'clsx';
import { useEffect, useState } from 'react';

interface NavAnchorsProps {
  anchors: NavAnchorProps[];
}

interface NavAnchorProps {
  label: string;
  id: string;
  className?: string;
}

const NavAnchors = ({ anchors }: NavAnchorsProps) => {
  const [currentAnchor, setCurrentAnchor] = useState<string | undefined>(undefined);
  useEffect(() => {
    const target = document.querySelectorAll('.nav-anchor');
    const intersectionCallback: IntersectionObserverCallback = (
      entries: IntersectionObserverEntry[],
    ) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) {
        setCurrentAnchor(visible[0].target.id);
      }
    };
    const observer = new IntersectionObserver(intersectionCallback, {
      threshold: 0,
      rootMargin: '0px 0px -60% 0px',
    });
    target.forEach(e => {
      observer.observe(e);
    });
    return () => {
      target.forEach(e => {
        observer.unobserve(e);
      });
    };
  }, [setCurrentAnchor]);
  return (
    <nav className={clsx('flex flex-row gap-4 border-b border-misc-2 overflow-x-auto')}>
      {anchors.map(anchor => (
        <NavAnchor
          key={anchor.id}
          className={clsx(anchor.id === currentAnchor && 'text-neutral-5 border-b-2 border-misc-3')}
          {...anchor}
        />
      ))}
    </nav>
  );
};

const NavAnchor = ({ label, id, className }: NavAnchorProps) => {
  return (
    <a
      href={`#${id}`}
      className={clsx('py-2 uppercase px-6 text-misc-2 whitespace-nowrap', className)}
    >
      {label}
    </a>
  );
};

export default NavAnchors;
