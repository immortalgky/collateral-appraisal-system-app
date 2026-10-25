import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useCardIsWide } from '@/features/request/components/documentCard/usePaneLayout';
import {
  FormSection,
  FormSectionsProvider,
  FormSectionStatusContext,
  FormSheet,
  useFormLayout,
  useFormSections,
  type FormSectionEntry,
} from '@/shared/components/form';
import { SectionToc } from '@/shared/components/sections/SectionToc';
import { wideShellPx } from './formShellWidth';
import { PhotoAside } from './PhotoAside';
import PhotoGallery from './PhotoGallery';
import type { PhotoSectionView } from './PropertyPhotoSection';

/** Draws a record's photo section, given the `renderGallery` it must hand to that section. */
export type FormShellPhotos = (renderGallery: (view: PhotoSectionView) => ReactNode) => ReactNode;

interface FormShellBodyProps {
  /**
   * Draws the record's photo section (it mounts once, here). Omit for a form with no photos: no
   * photo card, no photo strip.
   */
  photos?: FormShellPhotos;
  /** The tab being shown, if the page has tabs: the TOC re-reads which sections are visible. */
  activeTab?: string;
  /** The section TOC under the photo card. Off where something else is the contents (a section bar). */
  toc?: boolean;
  /** Padding of the body, e.g. `px-3 pb-6 pt-[0.8571rem]`. */
  className?: string;
  /** The form. A panel that is not showing carries the `hidden` class and is left out of the TOC. */
  children: ReactNode;
}

/** The sections of the tab being shown, in page order: the TOC lists what the reader can scroll to. */
function useShownSections(activeTab?: string) {
  const sections = useFormSections();
  const [shown, setShown] = useState<FormSectionEntry[]>([]);
  useEffect(() => {
    setShown(
      sections.filter(({ id }) => !document.getElementById(id)?.closest('.hidden, [hidden]')),
    );
  }, [sections, activeTab]);
  return shown;
}

function Body({ photos, activeTab, toc = true, className, children }: FormShellBodyProps) {
  const { t } = useTranslation('appraisal');
  const compact = useFormLayout() === 'compact';
  const [ref, wide] = useCardIsWide(wideShellPx);
  const [railSlot, setRailSlot] = useState<HTMLDivElement | null>(null);
  const [stripSlot, setStripSlot] = useState<HTMLDivElement | null>(null);
  const shownSections = useShownSections(activeTab);
  const tocSections = toc ? shownSections : [];
  const hasPhotos = !!photos;
  // A form with no photos and no FormSection yet (not migrated) has nothing to put in a rail.
  const hasRail = wide && (hasPhotos || tocSections.length > 0);
  // Where no TOC shows each section's missing-fields status, the section's own header does.
  const tocShown = hasRail && toc && tocSections.length > 0;

  // Slots keep their place in the tree between the two layouts (`false` holds the slot), so the
  // form (`children`) is never remounted when the shell crosses the breakpoint.
  return (
    <FormSectionStatusContext.Provider value={!tocShown}>
      {/* Outside the measured box: the section's modals are `position: fixed`, and a query container
        must not be their containing block. Only what it portals into the slots lives inside. */}
      {photos?.(view => {
        const slot = wide ? railSlot : stripSlot;
        if (!slot) return null;
        return createPortal(
          wide ? (
            <PhotoAside view={view} />
          ) : (
            <PhotoGallery
              photos={view.photos}
              thumbnailId={view.thumbnailId}
              onAddClick={view.onAdd}
              onPreview={view.onPreview}
              onDelete={id => view.onDelete?.(id)}
              onSetThumbnail={id => view.onSetThumbnail?.(id)}
              disabled={view.readOnly}
            />
          ),
          slot,
        );
      })}
      <div ref={ref} className={clsx('@container/form-shell', className)}>
        <div
          className={clsx(
            hasRail
              ? clsx(
                  'grid items-start',
                  compact
                    ? 'grid-cols-[minmax(0,1fr)_var(--spacing-rail-c)] gap-x-[0.8571rem]'
                    : 'grid-cols-[minmax(0,1fr)_var(--spacing-rail)] gap-x-[1.1429rem]',
                )
              : 'min-w-0',
          )}
        >
          <div
            className={clsx(
              'flex min-w-0 flex-col',
              compact ? 'gap-[0.5714rem]' : 'gap-[0.8571rem]',
            )}
          >
            {!wide && hasPhotos && (
              <FormSheet>
                <FormSection
                  title={t('photoGallery.photos')}
                  icon="images"
                  hint={t('editorHeader.firstIsCover')}
                  status={false}
                >
                  <div
                    ref={setStripSlot}
                    className={clsx('col-span-12 min-w-0', compact && 'p-[0.7143rem]')}
                  />
                </FormSection>
              </FormSheet>
            )}
            {children}
          </div>
          {hasRail && (
            <div
              className={clsx(
                'sticky flex min-w-0 flex-col self-start',
                compact ? 'gap-[0.5714rem]' : 'gap-[0.8571rem]',
              )}
              style={{ top: 'calc(var(--form-scroll-offset, 0rem) + 0.8571rem)' }}
            >
              {hasPhotos && <div ref={setRailSlot} className="min-w-0" />}
              {toc && <SectionToc sections={tocSections} />}
            </div>
          )}
        </div>
      </div>
    </FormSectionStatusContext.Provider>
  );
}

/**
 * The body of every form page that has a photo rail (DESIGN.md 17.8), shared by the property pages
 * (`PropertyFormShell`) and Block's tower and model pages (`CondoDetailShell`).
 *
 * This is the `@container/form-shell` element the table kit and `FormSection` measure. It is two
 * columns when its own width is at least 84.2857rem: the form, and a sticky rail with the photo card
 * (`PhotoAside`) over the section TOC (`SectionToc`, fed by the `FormSection`s below through
 * `FormSectionsProvider`). Narrower there is no rail and no TOC: the photo strip (`PhotoGallery`) is
 * a section of its own above the form. The width is measured here, in JS, so the photo section mounts
 * once: it draws through a portal into whichever slot applies, and crossing the breakpoint never drops
 * photos picked but not saved yet.
 *
 * The scroller above it sets `--form-scroll-offset` (the height of whatever it pins; 0 if nothing).
 */
export function FormShellBody(props: FormShellBodyProps) {
  return (
    <FormSectionsProvider>
      <Body {...props} />
    </FormSectionsProvider>
  );
}
