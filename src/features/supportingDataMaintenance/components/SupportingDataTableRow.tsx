import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Icon } from '@/shared/components';
import { useTranslation } from 'react-i18next';
import { getCollateralTypeLabel } from '../utils/getLabel';

interface SupportingDataTableRowProps {
  index: number;
  data: any;
  isReadOnly: boolean;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const SupportingDataTableRow = ({
  index,
  data,
  isReadOnly,
  onEdit,
  onDelete,
}: SupportingDataTableRowProps) => {
  const { t } = useTranslation(['supportingDataMaintenance', 'common']);

  const handleRowClick = () => {
    onEdit(index);
  };

  const address = [data?.houseNo, data?.subDistrictName, data?.districtName, data?.provinceName]
    .filter(Boolean)
    .join(', ');

  const hasCoordinates =
    data?.latitude != null &&
    data?.longitude != null &&
    !(data.latitude === 0 && data.longitude === 0);

  return (
    <tr
      data-supporting-data-index={index}
      className="bg-white even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors group cursor-pointer"
    >
      {/* Sq. No */}
      <td className="px-2 py-2" onClick={handleRowClick}>
        <p className="text-sm font-medium text-gray-900 truncate">
          {index + 1 || <span className="italic text-gray-400">{t('placeholders.untitled')}</span>}
        </p>
      </td>

      {/* Property Name */}
      <td className="px-2 py-2" onClick={handleRowClick}>
        <p className="text-sm font-medium text-gray-900 truncate" title={data?.propertyName}>
          {data?.propertyName || (
            <span className="italic text-gray-400">{t('placeholders.untitled')}</span>
          )}
        </p>
      </td>

      {/* Collateral Type */}
      <td className="px-3 py-2" onClick={handleRowClick}>
        <span className="text-xs text-gray-600">
          {data?.collateralType ? getCollateralTypeLabel(data.collateralType) : '-'}
        </span>
      </td>

      {/* Address */}
      <td className="px-3 py-2 max-w-0 w-1/3" onClick={handleRowClick}>
        <p className="text-xs text-gray-700 truncate" title={address}>
          {address || <span className="italic text-gray-400">{t('placeholders.notSet')}</span>}
        </p>
      </td>

      {/* Coordinates */}
      <td className="px-3 py-2" onClick={handleRowClick}>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Icon name="map-pin" className="text-gray-400 text-[10px]" style="solid" />
          {hasCoordinates ? (
            <span>
              {Number(data.latitude).toFixed(6)}, {Number(data.longitude).toFixed(6)}
            </span>
          ) : (
            <span className="italic text-gray-400">{t('placeholders.notSet')}</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-2 py-2 text-center">
        <Menu as="div" className="relative inline-block">
          <MenuButton
            onClick={e => e.stopPropagation()}
            aria-label={t('aria.openContextMenu')}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="ellipsis-vertical" className="text-sm" style="solid" />
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            className="right-0 z-50 mt-1 w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none [--anchor-gap:4px]"
          >
            <div className="py-1">
              <MenuItem>
                {({ focus }) => (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onEdit(index);
                    }}
                    className={`${
                      focus ? 'bg-gray-50' : ''
                    } flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700`}
                  >
                    <Icon name="pen-to-square" className="text-xs text-gray-400" />
                    {t('common:actions.edit')}
                  </button>
                )}
              </MenuItem>
              {!isReadOnly && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(index);
                        }}
                        className={`${
                          focus ? 'bg-red-50' : ''
                        } flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600`}
                      >
                        <Icon name="trash" className="text-xs" />
                        {t('common:actions.delete')}
                      </button>
                    )}
                  </MenuItem>
                </>
              )}
            </div>
          </MenuItems>
        </Menu>
      </td>
    </tr>
  );
};
