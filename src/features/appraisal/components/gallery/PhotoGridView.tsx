import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import type { GalleryViewProps, GalleryImage } from '../../types/gallery';

interface PhotoGridViewProps extends GalleryViewProps {
  showUsedBadge?: boolean;
  prepend?: React.ReactNode;
  /**
   * `dense` packs about twice as many photos per row and puts the caption first — the gallery's
   * layout. `default` is the original four-up grid, kept for every caller that asks for nothing.
   */
  layout?: 'default' | 'dense';
  /**
   * A fixed column count. The Photos tab passes a topic's report columns, so the screen shows the
   * topic the way the report will lay it out. Uses the caption-first tile, like `dense`.
   */
  columns?: 1 | 2 | 3;
  /** A short line under the caption — the upload date or file name the gallery is sorted by. */
  metaText?: (image: GalleryImage) => string | null;
}

interface GridItemProps {
  image: GalleryImage;
  isSelected: boolean;
  showUsedBadge: boolean;
  hasSelection: boolean;
  hasEdit: boolean;
  hasDelete: boolean;
  compact: boolean;
  captionLines: 1 | 2;
  meta: string | null;
  onSelect: (imageId: string, e: React.MouseEvent) => void;
  onClick: (image: GalleryImage) => void;
  onEdit: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
}

const GridItem = memo(
  ({
    image,
    isSelected,
    showUsedBadge,
    hasSelection,
    hasEdit,
    hasDelete,
    compact,
    captionLines,
    meta,
    onSelect,
    onClick,
    onEdit,
    onDelete,
  }: GridItemProps) => {
    const { t } = useTranslation('appraisal');
    return (
      <div
        onClick={() => onClick(image)}
        className={clsx(
          'group relative flex flex-col overflow-hidden cursor-pointer',
          compact ? 'gap-1.5' : 'gap-2.5',
          isSelected && 'ring-2 ring-primary ring-offset-2 rounded-xl',
        )}
      >
        {/* Image Container */}
        <div
          className={clsx(
            'relative w-full overflow-hidden bg-gray-100',
            compact ? 'aspect-[4/3] rounded-lg' : 'h-[108px] rounded-xl',
          )}
        >
          <img
            src={image.thumbnailSrc}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />

          {/* Used badge. The compact tile marks unused photos too — that is the one the
              appraiser is looking for when tidying up before the report. */}
          {showUsedBadge && (image.isInUse || compact) && (
            <div className="absolute top-2 left-2">
              <span
                className={clsx(
                  'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white',
                  image.isInUse ? 'bg-green-600' : 'bg-gray-800/70',
                )}
              >
                {image.isInUse && <Icon name="check" className="text-[9px]" />}
                {image.isInUse ? t('gallery.grid.used') : t('gallery.grid.unused')}
              </span>
            </div>
          )}

          {/* Selection Checkbox */}
          {hasSelection && (
            <button
              type="button"
              onClick={e => onSelect(image.id, e)}
              className={clsx(
                'absolute top-2 right-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all shadow-sm',
                isSelected
                  ? 'bg-primary border-primary text-white'
                  : 'bg-white border-gray-300 text-transparent hover:border-primary hover:text-primary/50',
              )}
              title={isSelected ? t('gallery.grid.deselect') : t('gallery.grid.select')}
            >
              <Icon name="check" style="solid" className="text-sm" />
            </button>
          )}

          {/* Hover Overlay with Actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="absolute bottom-2 left-2 w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center shadow-sm">
              <Icon name="expand" className="text-gray-600" style="solid" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {hasEdit && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onEdit(image);
                }}
                className="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center text-gray-600 shadow-sm"
                title={t('gallery.grid.edit')}
              >
                <Icon name="pen-to-square" style="solid" />
              </button>
            )}
            {hasDelete && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(image);
                }}
                className="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm"
                title={t('gallery.grid.delete')}
              >
                <Icon name="trash" style="solid" />
              </button>
            )}
          </div>
        </div>

        {/* Image Info */}
        {compact ? (
          <div className="min-w-0 px-0.5">
            <p
              className={clsx(
                'text-[11.5px] break-words',
                captionLines === 1 ? 'truncate' : 'line-clamp-2',
                image.description ? 'text-gray-700' : 'italic text-gray-400',
              )}
            >
              {image.description || t('gallery.grid.noCaption')}
            </p>
            {meta && <p className="truncate text-[10.5px] tabular-nums text-gray-400">{meta}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {image.fileName && (
              <p className="text-[10px] text-black font-normal truncate">{image.fileName}</p>
            )}
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              {image.fileExtension && <span className="uppercase">{image.fileExtension}</span>}
              {image.fileSizeBytes != null && (
                <>
                  {image.fileExtension && <span>&middot;</span>}
                  <span>
                    {image.fileSizeBytes < 1024 * 1024
                      ? `${(image.fileSizeBytes / 1024).toFixed(1)} KB`
                      : `${(image.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`}
                  </span>
                </>
              )}
            </div>
            <p
              className={clsx(
                'text-xs font-normal line-clamp-2 break-words',
                image.description ? 'text-gray-500' : 'text-gray-300',
              )}
            >
              {image.description || t('gallery.grid.noCaption')}
            </p>
          </div>
        )}
      </div>
    );
  },
);
GridItem.displayName = 'GridItem';

export const PhotoGridView = ({
  images,
  onImageClick,
  onImageDelete,
  onImageEdit,
  selectedImageIds,
  onSelectionChange,
  showUsedBadge = true,
  prepend,
  layout = 'default',
  columns,
  metaText,
}: PhotoGridViewProps) => {
  const { t } = useTranslation('appraisal');
  const compact = layout === 'dense' || columns != null;

  const handleSelect = useCallback(
    (imageId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onSelectionChange || !selectedImageIds) return;

      const newSelected = new Set(selectedImageIds);
      if (newSelected.has(imageId)) {
        newSelected.delete(imageId);
      } else {
        newSelected.add(imageId);
      }
      onSelectionChange(newSelected);
    },
    [onSelectionChange, selectedImageIds],
  );

  const handleClick = useCallback(
    (image: GalleryImage) => {
      onImageClick?.(image);
    },
    [onImageClick],
  );

  const handleEdit = useCallback(
    (image: GalleryImage) => {
      onImageEdit?.(image);
    },
    [onImageEdit],
  );

  const handleDelete = useCallback(
    (image: GalleryImage) => {
      onImageDelete?.(image);
    },
    [onImageDelete],
  );

  if (images.length === 0 && !prepend) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon name="images" className="text-2xl text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">{t('gallery.grid.empty')}</p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'grid',
        columns != null
          ? 'gap-4'
          : layout === 'dense'
            ? 'grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3'
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
      )}
      style={columns != null ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {prepend}
      {images.map(image => (
        <GridItem
          key={image.id}
          image={image}
          isSelected={!!selectedImageIds?.has(image.id)}
          showUsedBadge={showUsedBadge}
          hasSelection={!!onSelectionChange}
          hasEdit={!!onImageEdit}
          hasDelete={!!onImageDelete}
          compact={compact}
          captionLines={columns != null ? 2 : 1}
          meta={metaText ? metaText(image) : null}
          onSelect={handleSelect}
          onClick={handleClick}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

export default PhotoGridView;
