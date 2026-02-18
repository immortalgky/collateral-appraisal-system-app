import { memo, useCallback } from 'react';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import type { GalleryViewProps, GalleryImage } from '../../types/gallery';

interface PhotoGridViewProps extends GalleryViewProps {
  showUsedBadge?: boolean;
}

interface GridItemProps {
  image: GalleryImage;
  isSelected: boolean;
  showUsedBadge: boolean;
  hasSelection: boolean;
  hasDelete: boolean;
  onSelect: (imageId: string, e: React.MouseEvent) => void;
  onClick: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
}

const GridItem = memo(({
  image,
  isSelected,
  showUsedBadge,
  hasSelection,
  hasDelete,
  onSelect,
  onClick,
  onDelete,
}: GridItemProps) => (
  <div
    onClick={() => onClick(image)}
    className={clsx(
      'group relative flex flex-col gap-2.5 overflow-hidden cursor-pointer',
      isSelected && 'ring-2 ring-primary ring-offset-2 rounded-xl'
    )}
  >
    {/* Image Container */}
    <div className="relative h-[108px] w-full rounded-xl overflow-hidden bg-gray-100">
      <img
        src={image.thumbnailSrc}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />

      {/* Used Badge */}
      {showUsedBadge && image.isUsedInReport && (
        <div className="absolute top-2 left-2">
          <span
            className="px-2 py-0.5 bg-green-600 rounded text-white text-xs font-bold flex items-center gap-1"
            title="In Use"
          >
            <Icon name="check" className="text-[10px]" />
            In Use
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
              : 'bg-white border-gray-300 text-transparent hover:border-primary hover:text-primary/50'
          )}
          title={isSelected ? 'Deselect photo' : 'Select photo'}
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

      {/* Delete button */}
      {hasDelete && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDelete(image);
          }}
          className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center text-red-500 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
          title="Delete"
        >
          <Icon name="trash" style="solid" />
        </button>
      )}
    </div>

    {/* Image Info */}
    <div className="flex flex-col gap-1">
      {image.fileName && (
        <p className="text-[10px] text-black font-normal truncate">
          {image.fileName}
        </p>
      )}
      <p
        className={clsx(
          'text-sm font-normal truncate',
          image.description ? 'text-gray-700' : 'text-gray-300'
        )}
      >
        {image.description || 'Description'}
      </p>
    </div>
  </div>
));
GridItem.displayName = 'GridItem';

export const PhotoGridView = ({
  images,
  onImageClick,
  onImageDelete,
  selectedImageIds,
  onSelectionChange,
  showUsedBadge = true,
}: PhotoGridViewProps) => {
  const handleSelect = useCallback((imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange || !selectedImageIds) return;

    const newSelected = new Set(selectedImageIds);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    onSelectionChange(newSelected);
  }, [onSelectionChange, selectedImageIds]);

  const handleClick = useCallback((image: GalleryImage) => {
    onImageClick?.(image);
  }, [onImageClick]);

  const handleDelete = useCallback((image: GalleryImage) => {
    onImageDelete?.(image);
  }, [onImageDelete]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon name="images" className="text-2xl text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">No images in gallery</p>
        <p className="text-xs text-gray-400 mt-1">Upload images to see them here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {images.map(image => (
        <GridItem
          key={image.id}
          image={image}
          isSelected={!!selectedImageIds?.has(image.id)}
          showUsedBadge={showUsedBadge}
          hasSelection={!!onSelectionChange}
          hasDelete={!!onImageDelete}
          onSelect={handleSelect}
          onClick={handleClick}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

export default PhotoGridView;
