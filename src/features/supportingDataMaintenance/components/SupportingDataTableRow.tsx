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
          ? 'bg-(--palette-req-wash) hover:bg-red-100/70 dark:hover:bg-red-500/20'
          : 'bg-(--palette-surface) even:bg-(--palette-surface-2)/50 hover:bg-(--palette-surface-3)/50'
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
            className="size-4 rounded border-(--palette-line-strong) text-red-500 accent-red-500 cursor-pointer"
            aria-label={`Select row ${index + 1}`}
          />
        ) : (
          <p className="text-sm font-medium text-(--palette-ink) truncate">
            {index + 1 || (
              <span className="italic text-(--palette-gray-400)">{t('placeholders.untitled')}</span>
            )}
          </p>
        )}
      </td>

      {/* Property Name */}
      <td className="px-2 py-2">
        <p className="text-sm font-medium text-(--palette-ink) truncate" title={data?.propertyName}>
          {data?.propertyName || (
            <span className="italic text-(--palette-gray-400)">{t('placeholders.untitled')}</span>
          )}
        </p>
      </td>

      {/* Collateral Type */}
      <td className="px-3 py-2">
        <span className="text-xs text-(--palette-gray-600)">
          {data?.collateralType ? getCollateralTypeLabel(data.collateralType) : '-'}
        </span>
      </td>

      {/* Address */}
      <td className="px-3 py-2 max-w-0 w-1/3">
        <p className="text-xs text-(--palette-ink) truncate" title={address}>
          {address || (
            <span className="italic text-(--palette-gray-400)">{t('placeholders.notSet')}</span>
          )}
        </p>
      </td>

      {/* Coordinates */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 text-xs text-(--palette-gray-600)">
          <Icon name="map-pin" className="text-(--palette-gray-400) text-[10px]" style="solid" />
          {hasCoordinates ? (
            <span>
              {Number(data.latitude).toFixed(6)}, {Number(data.longitude).toFixed(6)}
            </span>
          ) : (
            <span className="italic text-(--palette-gray-400)">{t('placeholders.notSet')}</span>
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
              className="p-1.5 rounded hover:bg-(--palette-surface-3) text-(--palette-gray-400) hover:text-(--palette-gray-600) transition-colors"
            >
              <Icon name="ellipsis-vertical" className="text-sm" style="solid" />
            </MenuButton>
            <MenuItems
              anchor="bottom end"
              className="right-0 z-50 mt-1 w-36 origin-top-right rounded-md bg-(--palette-surface) shadow-lg ring-1 ring-black/5 focus:outline-none [--anchor-gap:4px]"
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
                        focus ? 'bg-(--palette-surface-2)' : ''
                      } flex w-full items-center gap-2 px-3 py-2 text-sm text-(--palette-ink)`}
                    >
                      <Icon
                        name={hasAuthorityToDecision ? 'eye' : 'pen-to-square'}
                        className="text-xs text-(--palette-gray-400)"
                      />
                      {hasAuthorityToDecision ? t('actions.view') : t('actions.edit')}
                    </button>
                  )}
                </MenuItem>
                {!isReadOnly && (
                  <>
                    <div className="border-t border-(--palette-line-soft) my-1" />
                    <MenuItem>
                      {({ focus }) => (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDelete(index);
                          }}
                          className={`${
                            focus ? 'bg-(--palette-req-wash)' : ''
                          } flex w-full items-center gap-2 px-3 py-2 text-sm text-(--palette-danger)`}
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
