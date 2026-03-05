import { memo, useCallback } from 'react';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import type { GalleryViewProps, GalleryImage } from '../../types/gallery';

interface PhotoGridViewProps extends GalleryViewProps {
  showUsedBadge?: boolean;
  prepend?: React.ReactNode;
}

interface GridItemProps {
  image: GalleryImage;
  isSelected: boolean;
  showUsedBadge: boolean;
  hasSelection: boolean;
  hasEdit: boolean;
  hasDelete: boolean;
  onSelect: (imageId: string, e: React.MouseEvent) => void;
  onClick: (image: GalleryImage) => void;
  onEdit: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
}

const GridItem = memo(({
  image,
  isSelected,
  showUsedBadge,
  hasSelection,
  hasEdit,
  hasDelete,
  onSelect,
  onClick,
  onEdit,
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
      {showUsedBadge && image.isInUse && (
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
            title="Edit"
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
            title="Delete"
          >
            <Icon name="trash" style="solid" />
          </button>
        )}
      </div>
    </div>

    {/* Image Info */}
    <div className="flex flex-col gap-0.5">
      {image.fileName && (
        <p className="text-[10px] text-black font-normal truncate">
          {image.fileName}
        </p>
      )}
      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        {image.fileExtension && (
          <span className="uppercase">{image.fileExtension}</span>
        )}
        {image.fileSizeBytes != null && (
          <>
            {image.fileExtension && <span>&middot;</span>}
            <span>{image.fileSizeBytes < 1024 * 1024 ? `${(image.fileSizeBytes / 1024).toFixed(1)} KB` : `${(image.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`}</span>
          </>
        )}
      </div>
      <p
        className={clsx(
          'text-xs font-normal truncate',
          image.description ? 'text-gray-500' : 'text-gray-300'
        )}
      >
        {image.description || 'No description'}
      </p>
    </div>
  </div>
));
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

  const handleEdit = useCallback((image: GalleryImage) => {
    onImageEdit?.(image);
  }, [onImageEdit]);

  const handleDelete = useCallback((image: GalleryImage) => {
    onImageDelete?.(image);
  }, [onImageDelete]);

  if (images.length === 0 && !prepend) {
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
