import type { CSSProperties, ReactNode } from 'react';
import { FormShellBody, type FormShellPhotos } from './FormShellBody';

interface FormShellProps {
  /**
   * What the scroller pins at its top, e.g. the identity row and the tab bar. It must be a direct
   * child of the scroller (a sticky element only sticks inside its parent), so it is rendered here.
   */
  header?: ReactNode;
  /** Height of whatever the header pins: `FormSection` scrolls to land under it. 0 if nothing. */
  pinnedHeight?: string;
  /**
   * Draws the record's photo section, given the `renderGallery` it must hand to its photo section.
   * It mounts once and draws through a portal into the rail or the narrow strip. Omit for a form
   * with no photos.
   */
  photos?: FormShellPhotos;
  /** The tab being shown, if the page has tabs. */
  activeTab?: string;
  /** The section TOC under the photo card; off where a section bar is the contents. Default on. */
  toc?: boolean;
  /** Padding of the body. Default is the property pages': `px-3 pb-6 pt-[0.8571rem]`. */
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * The scroller of every form page that has photos or a section TOC (DESIGN.md 17.8), the one
 * assembly behind the property pages (`PropertyFormShell`), the market comparable editor
 * (`ComparableFormShell`) and Block's tower and model pages (`CondoDetailShell`):
 * `#form-scroll-container` with `--form-scroll-offset`, the pinned `header`, then `FormShellBody`
 * (the `@container/form-shell` body with the photo rail or strip and the TOC).
 *
 * It renders only the scroller; the page keeps its `<form>`, the `ActionBar` and its dialogs.
 */
export function FormShell({
  header,
  pinnedHeight = '0rem',
  photos,
  activeTab,
  toc,
  bodyClassName = 'px-3 pb-6 pt-[0.8571rem]',
  children,
}: FormShellProps) {
  return (
    <div
      id="form-scroll-container"
      style={{ '--form-scroll-offset': pinnedHeight } as CSSProperties}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
    >
      {header}
      <FormShellBody photos={photos} activeTab={activeTab} toc={toc} className={bodyClassName}>
        {children}
      </FormShellBody>
    </div>
  );
}
