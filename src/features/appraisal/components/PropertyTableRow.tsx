import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';

// Map property type to route segment
const getRouteSegment = (type: string): string => {
  const typeMap: Record<string, string> = {
    Building: 'building',
    Condominium: 'condo',
    'Land and building': 'land-building',
    Lands: 'land',
    'Lease Agreement Building': 'building',
    'Lease Agreement Land and building': 'land-building',
    'Lease Agreement Lands': 'land',
    L: 'land',
    B: 'building',
    LB: 'land-building',
    U: 'condo',
  };
  return typeMap[type] || 'land';
};

interface PropertyTableRowProps {
  property: PropertyItem;
  groupId: string;
  onEdit: (property: PropertyItem, groupId: string) => void;
  onMoveTo: (property: PropertyItem, groupId: string) => void;
  onCopy: (property: PropertyItem) => void;
  onPaste: (groupId: string) => void;
  onDelete: (property: PropertyItem, groupId: string) => void;
  hasClipboard: boolean;
}

export const PropertyTableRow = ({
  property,
  groupId,
  onEdit,
  onMoveTo,
  onCopy,
  onPaste,
  onDelete,
  hasClipboard,
}: PropertyTableRowProps) => {
  const navigate = useNavigate();
  const { appraisalId } = useParams<{ appraisalId: string }>();

  const handleClick = () => {
    const routeSegment = getRouteSegment(property.type);
    if (appraisalId) {
      navigate(
        `/appraisal/${appraisalId}/property/${routeSegment}/${property.id}?groupId=${groupId}`,
      );
    }
  };

  return (
    <tr className="bg-white hover:bg-gray-50 transition-colors group">
      {/* Thumbnail */}
      <td className="px-2 py-2" onClick={handleClick}>
        <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden cursor-pointer">
          {property.image ? (
            <img
              src={property.image}
              alt={property.address}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name="image" className="text-gray-400 text-xs" />
            </div>
          )}
        </div>
      </td>

      {/* Address */}
      <td className="px-3 py-2 cursor-pointer" onClick={handleClick}>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate" title={property.address}>
            {property.address}
          </p>
          <p className="text-xs text-gray-500 truncate">{property.location}</p>
        </div>
      </td>

      {/* Type Badge */}
      <td className="px-3 py-2 cursor-pointer" onClick={handleClick}>
        <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium whitespace-nowrap">
          {property.type}
        </span>
      </td>

      {/* Area */}
      <td className="px-3 py-2 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Icon name="ruler-combined" className="text-gray-400 text-[10px]" style="solid" />
          <span>{property.area}</span>
        </div>
      </td>

      {/* Price */}
      <td className="px-3 py-2 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Icon name="baht-sign" className="text-gray-400 text-[10px]" style="solid" />
          <span className="truncate">{property.priceRange}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-2 py-2">
        <Menu as="div" className="relative">
          <MenuButton className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <Icon name="ellipsis-vertical" className="text-sm" style="solid" />
          </MenuButton>
          <MenuItems className="absolute right-0 z-10 mt-1 w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
            <div className="py-1">
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => onEdit(property, groupId)}
                    className={`${
                      focus ? 'bg-gray-50' : ''
                    } flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700`}
                  >
                    <Icon name="pen-to-square" className="text-xs text-gray-400" />
                    Edit
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => onMoveTo(property, groupId)}
                    className={`${
                      focus ? 'bg-gray-50' : ''
                    } flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700`}
                  >
                    <Icon name="arrow-right-arrow-left" className="text-xs text-gray-400" />
                    Move to
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => onCopy(property)}
                    className={`${
                      focus ? 'bg-gray-50' : ''
                    } flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700`}
                  >
                    <Icon name="copy" className="text-xs text-gray-400" />
                    Copy
                  </button>
                )}
              </MenuItem>
              <MenuItem disabled={!hasClipboard}>
                {({ focus }) => (
                  <button
                    onClick={() => hasClipboard && onPaste(groupId)}
                    disabled={!hasClipboard}
                    className={`${
                      !hasClipboard
                        ? 'text-gray-400 cursor-not-allowed'
                        : focus
                          ? 'bg-gray-50 text-gray-700'
                          : 'text-gray-700'
                    } flex w-full items-center gap-2 px-3 py-2 text-sm`}
                  >
                    <Icon name="paste" className="text-xs text-gray-400" />
                    Paste
                  </button>
                )}
              </MenuItem>
              <div className="border-t border-gray-100 my-1" />
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => onDelete(property, groupId)}
                    className={`${
                      focus ? 'bg-red-50' : ''
                    } flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600`}
                  >
                    <Icon name="trash" className="text-xs" />
                    Delete
                  </button>
                )}
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>
      </td>
    </tr>
  );
};
