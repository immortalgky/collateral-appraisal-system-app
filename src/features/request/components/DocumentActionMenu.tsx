import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Icon from '@/shared/components/Icon';
import type { UploadedDocument } from '../types/document';

interface DocumentActionMenuProps {
  document: UploadedDocument;
  onView?: (document: UploadedDocument) => void;
  onDelete?: (document: UploadedDocument) => void;
  onEdit?: (document: UploadedDocument) => void;
  onReplace?: (document: UploadedDocument) => void;
}

const DocumentActionMenu: React.FunctionComponent<DocumentActionMenuProps> = ({
  document,
  onView,
  onDelete,
  onEdit,
  onReplace,
}) => {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
        <Icon name="ellipsis-vertical" style="solid" className="w-5 h-5" />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="w-48 bg-white rounded-lg border border-neutral-300 shadow-lg mt-1 z-50"
      >
        {onView && (
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={() => onView(document)}
                className={`${
                  focus ? 'bg-primary-100' : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 first:rounded-t-lg`}
              >
                <Icon name="eye" style="regular" className="w-4 h-4" />
                View/Download
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
                  focus ? 'bg-primary-100' : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700`}
              >
                <Icon name="pen-to-square" style="regular" className="w-4 h-4" />
                Edit details
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
                  focus ? 'bg-primary-100' : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700`}
              >
                <Icon name="arrow-up-from-bracket" style="regular" className="w-4 h-4" />
                Replace file
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
                  focus ? 'bg-red-100' : ''
                } group flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 last:rounded-b-lg`}
              >
                <Icon name="trash" style="regular" className="w-4 h-4" />
                Delete
              </button>
            )}
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
};

export default DocumentActionMenu;
