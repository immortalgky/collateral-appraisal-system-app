import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { useFormLayout } from '@/shared/components/form/formLayoutContext';
import Icon from '@/shared/components/Icon';

import type { Photo } from './PhotoGallery';
import type { PhotoSectionView } from './PropertyPhotoSection';

/** Thumbnails shown under the cover; the last of them carries "+N" when there are more (DESIGN.md 17.9). */
const MAX_THUMBS = 7;

const PhotoImage = ({ photo }: { photo: Photo }) =>
  photo.isUploading ? (
    <Icon name="spinner" style="solid" className="animate-spin text-base text-(--palette-ink-3)" />
  ) : (
    <img src={photo.url} alt={photo.fileName} className="size-full object-cover" />
  );

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1';

/**
 * The photos of a record as the property shell's rail card (DESIGN.md 17.9, wide layout): the cover
 * large (4:3), the other photos as square thumbnails under it (the cover is not repeated, so a single
 * photo has none), then the dashed "+" tile as the last cell. The card is only the box; the rail owns
 * its width and stickiness. Narrower than the rail the shell uses the default photo strip instead
 * (`PhotoGallery`).
 *
 * Drawn from the photo section's own view (`renderGallery`), so uploads, the picker, the viewer and
 * set-as-cover / remove are the section's and nothing is repeated here: a photo opens the viewer, which
 * holds the cover and remove actions. With no photos the whole dashed box is the add button (read-only:
 * no tile, and a plain box saying there are none). Standard and Compact differ in radius and padding
 * only, read from `useFormLayout()`.
 */
export function PhotoAside({ view }: { view: PhotoSectionView }) {
  const { t } = useTranslation('appraisal');
  const compact = useFormLayout() === 'compact';
  const { photos, thumbnailId, readOnly, onAdd, onPreview } = view;

  const coverPhoto = photos.find(p => p.id === thumbnailId);
  // The chosen cover fills the big tile; without one the first photo does, with no cover badge.
  const shown = coverPhoto ?? photos[0];
  const isEmpty = photos.length === 0;
  // The rest, numbered by their place among all the photos.
  const others = photos
    .map((photo, i) => ({ photo, n: i + 1 }))
    .filter(({ photo }) => photo.id !== shown?.id);
  const thumbs = others.slice(0, MAX_THUMBS);
  // Only past MAX_THUMBS: the last visible thumbnail then stands for itself and every one cut off
  // after it. Exactly MAX_THUMBS others all fit, with no "+N".
  const hiddenCount = others.length > MAX_THUMBS ? others.length - MAX_THUMBS + 1 : 0;

  const coverRadius = compact ? 'rounded-[0.4286rem]' : 'rounded-[0.7143rem]';
  const emptyBox = clsx(
    'flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 border border-dashed border-(--palette-line-strong) bg-(--palette-surface-2) px-2 text-center text-xs text-(--palette-ink-2)',
    coverRadius,
  );

  return (
    <aside
      aria-label={t('photoGallery.photos')}
      className={clsx(
        'grid min-w-0 border border-(--palette-line) bg-(--palette-surface)',
        compact
          ? 'gap-[0.5714rem] rounded-[0.5714rem] p-[0.5714rem]'
          : 'gap-[0.7143rem] rounded-section p-[0.8571rem]',
      )}
    >
      {isEmpty ? (
        readOnly ? (
          <div className={emptyBox}>
            <Icon name="image" style="solid" className="text-[1.5rem] text-(--palette-ink-3)" />
            <span>{t('photoGallery.noPhotos')}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className={clsx(
              emptyBox,
              'cursor-pointer transition-colors hover:bg-(--palette-surface-3)',
              focusRing,
            )}
          >
            <Icon name="plus" style="solid" className="text-[1.5rem] text-(--palette-ink-2)" />
            <span>{t('photoGallery.addPicture')}</span>
          </button>
        )
      ) : (
        <>
          <button
            type="button"
            onClick={() => onPreview(shown)}
            title={shown.fileName}
            aria-label={shown.fileName}
            className={clsx(
              'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-(--palette-surface-3) ring-1 ring-(--palette-line)',
              coverRadius,
            )}
          >
            <PhotoImage photo={shown} />
            {coverPhoto && (
              <span className="absolute left-[0.5714rem] top-[0.5714rem] rounded bg-amber-400 px-1.5 text-xs font-semibold leading-normal text-warning-content">
                {t('photoGallery.cover')}
              </span>
            )}
          </button>

          {/* The cover is not repeated: thumbnails are the others, then the add tile. */}
          {(thumbs.length > 0 || !readOnly) && (
            <div className="grid grid-cols-4 gap-[0.4286rem]">
              {thumbs.map(({ photo, n }, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onPreview(photo)}
                  title={photo.fileName}
                  aria-label={t('photoGallery.photoN', { n })}
                  className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 border-transparent bg-(--palette-surface-3) hover:border-(--palette-line-strong)"
                >
                  <PhotoImage photo={photo} />
                  {hiddenCount > 0 && i === MAX_THUMBS - 1 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-base font-semibold text-white">
                      +{hiddenCount}
                    </span>
                  )}
                </button>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={onAdd}
                  aria-label={t('photoGallery.addPhoto')}
                  title={t('photoGallery.addPhoto')}
                  className={clsx(
                    'flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-(--palette-line-strong) bg-(--palette-surface-2) text-(--palette-ink-2) transition-colors hover:bg-(--palette-surface-3) hover:text-(--palette-ink)',
                    focusRing,
                  )}
                >
                  <Icon name="plus" style="solid" className="text-base" />
                </button>
              )}
            </div>
          )}

          {/* ponytail: the spec's link opens the gallery tab; the view has no such action, so it opens the viewer. */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => onPreview(shown)}
              className="justify-self-start text-xs text-(--palette-accent-ink) hover:underline"
            >
              {t('photoGallery.viewAll', { n: photos.length })}
            </button>
          )}
        </>
      )}
    </aside>
  );
}
