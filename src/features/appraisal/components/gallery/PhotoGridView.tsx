import { useState } from 'react';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import type { GalleryViewProps, GalleryImage } from '../../types/gallery';

interface PhotoGridViewProps extends GalleryViewProps {
  showUsedBadge?: boolean;
}

// Collateral Usage Tooltip Component
const CollateralUsageTooltip = ({
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

export const PhotoGridView = ({
  images,
  onImageClick,
  onImageDelete,
  selectedImageIds,
  onSelectionChange,
  showUsedBadge = true,
}: PhotoGridViewProps) => {
  const [tooltipImageId, setTooltipImageId] = useState<string | null>(null);

  const handleSelect = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {images.map(image => {
        const isSelected = selectedImageIds?.has(image.id);
        return (
          <div
            key={image.id}
            onClick={() => onImageClick?.(image)}
            className={clsx(
              'group relative flex flex-col gap-2.5 overflow-hidden cursor-pointer',
              isSelected && 'ring-2 ring-primary ring-offset-2 rounded-xl'
            )}
          >
            {/* Image Container */}
            <div className="relative h-[108px] w-full rounded-xl overflow-hidden bg-gray-100">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />

              {/* Used Badge with Collateral Count */}
              {showUsedBadge && (image.isUsed || (image.usedInCollaterals && image.usedInCollaterals.length > 0)) && (
                <div className="absolute top-2 left-2">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setTooltipImageId(tooltipImageId === image.id ? null : image.id);
                    }}
                    className="px-2 py-0.5 bg-green-600 hover:bg-green-700 rounded text-white text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Icon name="link" className="text-[10px]" />
                    {image.usedInCollaterals?.length || 1}
                  </button>
                  <CollateralUsageTooltip
                    image={image}
                    isVisible={tooltipImageId === image.id}
                    onClose={() => setTooltipImageId(null)}
                  />
                </div>
              )}

              {/* Selection Checkbox - Always visible */}
              {onSelectionChange && (
                <button
                  type="button"
                  onClick={e => handleSelect(image.id, e)}
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
                {/* Expand icon */}
                <div className="absolute bottom-2 left-2 w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center shadow-sm">
                  <Icon name="expand" className="text-gray-600" style="solid" />
                </div>
              </div>

              {/* Delete button - outside overlay for better interaction */}
              {onImageDelete && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onImageDelete(image);
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
        );
      })}
    </div>
  );
};

export default PhotoGridView;
