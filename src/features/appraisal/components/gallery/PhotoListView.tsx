import { memo, useCallback } from 'react';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import type { GalleryViewProps, GalleryImage } from '../../types/gallery';

interface PhotoListViewProps extends GalleryViewProps {
  showUsedBadge?: boolean;
}

interface ListRowProps {
  image: GalleryImage;
  isSelected: boolean;
  showUsedBadge: boolean;
  hasSelection: boolean;
  hasEdit: boolean;
  hasDelete: boolean;
  onSelect: (imageId: string) => void;
  onClick: (image: GalleryImage) => void;
  onEdit: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
}

const ListRow = memo(({
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
}: ListRowProps) => (
  <tr
    onClick={() => onClick(image)}
    className={clsx(
      'hover:bg-gray-50 cursor-pointer transition-colors',
      isSelected && 'bg-primary/5'
    )}
  >
    {hasSelection && (
      <td className="py-3 px-2">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onSelect(image.id);
          }}
          className={clsx(
            'w-5 h-5 rounded border flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-primary border-primary text-white'
              : 'border-gray-300 hover:border-gray-400'
          )}
        >
          {isSelected && <Icon name="check" style="solid" className="text-xs" />}
        </button>
      </td>
    )}
    <td className="py-3 px-4">
      <div className="w-12 h-9 rounded overflow-hidden bg-gray-100">
        <img
          src={image.thumbnailSrc}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
    </td>
    <td className="py-3 px-4">
      <span className="text-sm text-gray-900 font-medium">
        {image.fileName || image.alt}
      </span>
    </td>
    {showUsedBadge && (
      <td className="py-3 px-4">
        {image.isUsedInReport ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
          >
            <Icon name="check" className="text-[10px]" />
            In Use
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            Not Used
          </span>
        )}
      </td>
    )}
    <td className="py-3 px-4">
      <span className="text-sm text-gray-600 capitalize">
        {image.category || image.photoType || '-'}
      </span>
    </td>
    <td className="py-3 px-4">
      <span className="text-sm text-gray-500 truncate max-w-[200px] block">
        {image.description || '-'}
      </span>
    </td>
    <td className="py-3 px-4">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onClick(image);
          }}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="View"
        >
          <Icon name="eye" />
        </button>
        {hasEdit && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onEdit(image);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Edit"
          >
            <Icon name="pen-to-square" />
          </button>
        )}
        {hasDelete && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete(image);
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
    </td>
  </tr>
));
ListRow.displayName = 'ListRow';

export const PhotoListView = ({
  images,
  onImageClick,
  onImageDelete,
  onImageEdit,
  selectedImageIds,
  onSelectionChange,
  showUsedBadge = true,
}: PhotoListViewProps) => {
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (selectedImageIds?.size === images.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(images.map(img => img.id)));
    }
  }, [onSelectionChange, selectedImageIds, images]);

  const handleSelect = useCallback((imageId: string) => {
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

  const allSelected = selectedImageIds?.size === images.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {onSelectionChange && (
              <th className="py-3 px-2 w-10">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={clsx(
                    'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                    allSelected
                      ? 'bg-primary border-primary text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                >
                  {allSelected && <Icon name="check" style="solid" className="text-xs" />}
                </button>
              </th>
            )}
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
              Preview
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            {showUsedBadge && (
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Status
              </th>
            )}
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Type
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {images.map(image => (
            <ListRow
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
        </tbody>
      </table>
    </div>
  );
};

export default PhotoListView;
