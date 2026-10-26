import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { UploadedDocument } from '../types/document';

interface DocumentActionMenuProps {
  document: UploadedDocument;
  onView?: (document: UploadedDocument) => void;
  onDelete?: (document: UploadedDocument) => void;
  onEdit?: (document: UploadedDocument) => void;
  onReplace?: (document: UploadedDocument) => void;
  onMove?: (document: UploadedDocument) => void;
  /** A file taken from the previous appraisal: "Don't use" stands in for Delete (same effect). */
  isCarried?: boolean;
  /** `sm` is the compact trigger for a file chip. */
  size?: 'md' | 'sm';
  /** The text of the edit entry ("Notes" by default). */
  editLabel?: string;
}

const DocumentActionMenu: React.FunctionComponent<DocumentActionMenuProps> = ({
  document,
  onView,
  onDelete,
  onEdit,
  onReplace,
  onMove,
  isCarried = false,
  size = 'md',
  editLabel,
}) => {
  const { t } = useTranslation('request');

  return (
    // The compact trigger sits in a flex chip: an inline-block wrapper would put it on the baseline of
    // its own line box (text height), a couple of pixels above the chip's centre line.
    <Menu
      as="div"
      className={`relative text-left ${size === 'sm' ? 'inline-flex' : 'inline-block'}`}
    >
      <MenuButton
        aria-label={t('docCard.chip.actions')}
        className={`inline-flex items-center justify-center text-(--palette-gray-600) hover:text-(--palette-ink) hover:bg-(--palette-surface-3) rounded-full transition-colors ${
          size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'
        }`}
      >
        <Icon
          name="ellipsis-vertical"
          style="solid"
          className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'}
        />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="w-48 bg-(--palette-surface) rounded-lg border border-(--palette-line-strong) shadow-lg mt-1 z-50"
      >
        {onView && (
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={() => onView(document)}
                className={`${
                  focus ? 'bg-primary-100 dark:bg-primary-500/20' : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm text-(--palette-ink) first:rounded-t-lg`}
              >
                <Icon name="eye" style="regular" className="w-4 h-4" />
                {t('documentActions.view')}
              </button>
            )}
          </MenuItem>
        )}

        {onEdit && (
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={() => onEdit(document)}
                className={`${
                  focus ? 'bg-primary-100 dark:bg-primary-500/20' : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm text-(--palette-ink)`}
              >
                <Icon name="pen-to-square" style="regular" className="w-4 h-4" />
                {editLabel ?? t('documentActions.editDetails')}
              </button>
            )}
          </MenuItem>
        )}

        {onMove && (
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={() => onMove(document)}
                className={`${
                  focus ? 'bg-primary-100 dark:bg-primary-500/20' : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm text-(--palette-ink)`}
              >
                <Icon name="file-export" style="regular" className="w-4 h-4" />
                {t('documentActions.moveTo')}
              </button>
            )}
          </MenuItem>
        )}

        {onReplace && (
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={() => onReplace(document)}
                className={`${
                  focus ? 'bg-primary-100 dark:bg-primary-500/20' : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm text-(--palette-ink)`}
              >
                <Icon name="arrow-up-from-bracket" style="regular" className="w-4 h-4" />
                {t('documentActions.replaceFile')}
              </button>
            )}
          </MenuItem>
        )}

        {onDelete && (
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={() => onDelete(document)}
                className={`${
                  focus
                    ? isCarried
                      ? 'bg-violet-100 dark:bg-violet-500/20'
                      : 'bg-red-100 dark:bg-red-500/20'
                    : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm ${
                  isCarried
                    ? 'text-violet-700 dark:text-violet-300 font-medium'
                    : 'text-(--palette-danger)'
                } last:rounded-b-lg`}
              >
                <Icon
                  name={isCarried ? 'eye-slash' : 'trash'}
                  style="regular"
                  className="w-4 h-4"
                />
                {isCarried ? t('carryForward.menu.dontUse') : t('documentActions.delete')}
              </button>
            )}
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
};

export default DocumentActionMenu;
