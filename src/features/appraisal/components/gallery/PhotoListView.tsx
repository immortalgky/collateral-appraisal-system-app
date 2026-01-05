import { useState } from 'react';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import type { GalleryViewProps, GalleryImage } from '../../types/gallery';

interface PhotoListViewProps extends GalleryViewProps {
  showUsedBadge?: boolean;
}

// Collateral Usage Popover for List View
const CollateralUsagePopover = ({
  image,
  isVisible,
  onClose,
}: {
  image: GalleryImage;
  isVisible: boolean;
  onClose: () => void;
}) => {
  if (!isVisible || !image.usedInCollaterals?.length) return null;

  const typeIcons: Record<string, string> = {
    land: 'mountain-sun',
    building: 'building',
    condo: 'city',
    'land-building': 'house',
  };

  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">
          Used in {image.usedInCollaterals.length} collateral{image.usedInCollaterals.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 text-gray-400 hover:text-gray-600"
        >
          <Icon name="xmark" className="text-xs" />
        </button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {image.usedInCollaterals.map((usage, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
            <Icon
              name={typeIcons[usage.collateralType] || 'file'}
              className="text-gray-400"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{usage.collateralName}</p>
              <p className="text-gray-500 truncate">{usage.topicName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PhotoListView = ({
  images,
  onImageClick,
  onImageDelete,
  onImageEdit,
  selectedImageIds,
  onSelectionChange,
  showUsedBadge = true,
}: PhotoListViewProps) => {
  const [tooltipImageId, setTooltipImageId] = useState<string | null>(null);

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedImageIds?.size === images.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(images.map(img => img.id)));
    }
  };

  const handleSelect = (imageId: string) => {
    if (!onSelectionChange || !selectedImageIds) return;
    const newSelected = new Set(selectedImageIds);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    onSelectionChange(newSelected);
  };

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
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Status
              </th>
            )}
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Type
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
              Size
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
          {images.map(image => {
            const isSelected = selectedImageIds?.has(image.id);
            return (
              <tr
                key={image.id}
                onClick={() => onImageClick?.(image)}
                className={clsx(
                  'hover:bg-gray-50 cursor-pointer transition-colors',
                  isSelected && 'bg-primary/5'
                )}
              >
                {onSelectionChange && (
                  <td className="py-3 px-2">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleSelect(image.id);
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
                      src={image.src}
                      alt={image.alt}
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
                    {(image.isUsed || (image.usedInCollaterals && image.usedInCollaterals.length > 0)) ? (
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setTooltipImageId(tooltipImageId === image.id ? null : image.id);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                        >
                          <Icon name="link" className="text-[10px]" />
                          {image.usedInCollaterals?.length || 1} collateral{(image.usedInCollaterals?.length || 1) !== 1 ? 's' : ''}
                        </button>
                        <CollateralUsagePopover
                          image={image}
                          isVisible={tooltipImageId === image.id}
                          onClose={() => setTooltipImageId(null)}
                        />
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Not Used
                      </span>
                    )}
                  </td>
                )}
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600 capitalize">
                    {image.category || image.propertyType || '-'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-500">{formatFileSize(image.size)}</span>
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
                        onImageClick?.(image);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="View"
                    >
                      <Icon name="eye" />
                    </button>
                    {onImageEdit && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onImageEdit(image);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Icon name="pen-to-square" />
                      </button>
                    )}
                    {onImageDelete && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onImageDelete(image);
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PhotoListView;
