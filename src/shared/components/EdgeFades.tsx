import clsx from 'clsx';

interface EdgeFadesProps {
  start: boolean;
  end: boolean;
  /**
   * The `from-*` class naming the strip's background, written out in full so Tailwind sees it,
   * e.g. `from-(--palette-surface)`.
   */
  fromClass: string;
}

/**
 * The cue that a sideways-scrolling strip goes on: a fade into the strip's background at each edge
 * that still hides something. Put it as a sibling after the scroller, inside a `relative` wrapper.
 * It takes no pointer events, so the tabs under it stay clickable.
 */
export function EdgeFades({ start, end, fromClass }: EdgeFadesProps) {
  const base = clsx('pointer-events-none absolute inset-y-0 w-6 to-transparent', fromClass);
  return (
    <>
      {start && <div aria-hidden className={clsx(base, 'left-0 bg-linear-to-r')} />}
      {end && <div aria-hidden className={clsx(base, 'right-0 bg-linear-to-l')} />}
    </>
  );
}
