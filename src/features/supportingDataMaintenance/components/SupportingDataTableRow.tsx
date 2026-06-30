import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Icon } from '@/shared/components';
import { useTranslation } from 'react-i18next';
import { getCollateralTypeLabel } from '../utils/getLabel';
import { formatAddressNames } from '@/features/common/historySearch/utils';

interface SupportingDataTableRowProps {
  index: number;
  data: any;
  isReadOnly: boolean;
  hasAuthorityToDecision: boolean;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const SupportingDataTableRow = ({
  index,
  data,
  isReadOnly,
  hasAuthorityToDecision,
  onEdit,
  onDelete,
  isBatchMode = false,
  isSelected = false,
  onToggleSelect,
}: SupportingDataTableRowProps) => {
  const { t } = useTranslation(['supportingDataMaintenance', 'common']);

  const handleRowClick = () => {
    if (isBatchMode) {
      onToggleSelect?.(data.id);
    } else {
      onEdit(index);
    }
  };

  const hasCoordinates =
    data?.latitude != null &&
    data?.longitude != null &&
    !(data.latitude === 0 && data.longitude === 0);

  const address = formatAddressNames(data?.subDistrict, data?.district, data?.province);

  return (
    <tr
      data-supporting-data-index={index}
      onClick={handleRowClick}
      className={`transition-colors group cursor-pointer ${
        isBatchMode && isSelected
          ? 'bg-red-50 hover:bg-red-100/70'
          : 'bg-white even:bg-gray-50/50 hover:bg-gray-100/50'
      }`}
    >
      {/* Checkbox (batch mode) or Sq. No */}
      <td className="px-4 py-2">
        {isBatchMode ? (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(data.id)}
            onClick={e => e.stopPropagation()}
            className="size-4 rounded border-gray-300 text-red-500 accent-red-500 cursor-pointer"
            aria-label={`Select row ${index + 1}`}
          />
        ) : (
          <p className="text-sm font-medium text-gray-900 truncate">
            {index + 1 || (
              <span className="italic text-gray-400">{t('placeholders.untitled')}</span>
            )}
          </p>
        )}
      </td>

      {/* Property Name */}
      <td className="px-2 py-2">
        <p className="text-sm font-medium text-gray-900 truncate" title={data?.propertyName}>
          {data?.propertyName || (
            <span className="italic text-gray-400">{t('placeholders.untitled')}</span>
          )}
        </p>
      </td>

      {/* Collateral Type */}
      <td className="px-3 py-2">
        <span className="text-xs text-gray-600">
          {data?.collateralType ? getCollateralTypeLabel(data.collateralType) : '-'}
        </span>
      </td>

      {/* Address */}
      <td className="px-3 py-2 max-w-0 w-1/3">
        <p className="text-xs text-gray-700 truncate" title={address}>
          {address || <span className="italic text-gray-400">{t('placeholders.notSet')}</span>}
        </p>
      </td>

      {/* Coordinates */}
      <td className="px-3 py-2">
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

      {/* Actions - hidden in batch mode */}
      <td className="px-2 py-2 text-center">
        {!isBatchMode && (
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
                      <Icon
                        name={
                          hasAuthorityToDecision ? 'arrow-up-right-from-square' : 'pen-to-square'
                        }
                        className="text-xs text-gray-400"
                      />
                      {hasAuthorityToDecision ? t('actions.open') : t('actions.edit')}
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
        )}
      </td>
    </tr>
  );
};
