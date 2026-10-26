import type { CSSProperties, FormEventHandler, ReactNode } from 'react';

import { CondoProjectHeader } from './CondoProjectHeader';
import { useCondoFocus } from './CondoShellContext';

interface CondoFrameProps {
  /** `form` makes the frame the page's `<form>` (the project-info tab); default is a plain `div`. */
  as?: 'div' | 'form';
  onSubmit?: FormEventHandler<HTMLFormElement>;
  /**
   * `scroll` (default): the header and the content scroll together in one scroller, the shape of a
   * form or a sheet. `fill`: the header stays pinned and the content gets the rest of the height in
   * its own `flex-1 min-h-0 overflow-y-auto` box, exactly what the list tabs (units, towers, models,
   * prices, markets...) were written against; they manage their own inner scrolling.
   */
  body?: 'scroll' | 'fill';
  /** Pinned under the content, e.g. the `ActionBar`. */
  footer?: ReactNode;
  /** Id of the panel wrapping `children`: `${tabId}-section`, which the form-error scroll looks for. */
  panelId?: string;
  children: ReactNode;
}

/**
 * The page frame of a Condo tab: header, tab bar, then the tab's content. BlockProjectPage wraps
 * every list tab in `body="fill"`; the project-info form uses `as="form"` so its fields, scroller and
 * `ActionBar` share one `<form>`.
 *
 * ```tsx
 * <CondoFrame as="form" onSubmit={handleSubmit(save)} panelId="project-info-section"
 *             footer={<ActionBar>...</ActionBar>}>
 *   <FormSheet>...</FormSheet>
 * </CondoFrame>
 * ```
 *
 * The header (KPI card + pill tabs) is `shrink-0` above the content, so it stays put. Block pages have
 * one look, the Standard form layout (DESIGN.md 17.1).
 */
export function CondoFrame({
  as = 'div',
  onSubmit,
  body = 'scroll',
  footer,
  panelId,
  children,
}: CondoFrameProps) {
  // Focus ("expand table"): the project header and its tab bar make room for the tab's content.
  const { focus } = useCondoFocus();

  const header = !focus && (
    <div className="shrink-0 pb-3">
      <CondoProjectHeader />
    </div>
  );

  const content =
    body === 'fill' ? (
      <>
        {header}
        <div id={panelId} className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </>
    ) : (
      <>
        {header}
        {/* The form shell (DESIGN.md 17.1): the element FormSection and the table kit measure.
          Nothing is pinned inside the scroller, so sections scroll to its top edge. */}
        <div
          id="form-scroll-container"
          style={{ '--form-scroll-offset': '0rem' } as CSSProperties}
          className="@container/form-shell flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-4"
        >
          <div id={panelId} className="min-w-0">
            {children}
          </div>
        </div>
      </>
    );

  const className = 'flex flex-col h-full min-h-0';
  return as === 'form' ? (
    <form onSubmit={onSubmit} className={className}>
      {content}
      {footer}
    </form>
  ) : (
    <div className={className}>
      {content}
      {footer}
    </div>
  );
}
