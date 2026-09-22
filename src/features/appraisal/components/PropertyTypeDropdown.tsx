import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import { usePropertyBasePath } from '../hooks/usePropertyBasePath';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { PROPERTY_TYPES } from '../utils/propertyTypeConfig';
import { PropertyTypePicker } from './PropertyTypePicker';

// Several screens already import PROPERTY_TYPES from here; keep that entry point working.
export { PROPERTY_TYPES };

interface PropertyTypeDropdownProps {
  groupId: string;
  onSelectType?: (type: string, groupId: string, code: string) => void;
  buttonClassName?: string;
  /** Colour for the trigger's two icons — a filled button needs them light. Defaults to grey. */
  iconClassName?: string;
  buttonLabel?: string;
  disableDefaultNavigation?: boolean;
  align?: 'left' | 'right';
  /** Wrapper class — lets the caller turn the trigger into a full-width row. */
  className?: string;
}

export const PropertyTypeDropdown = ({
  groupId,
  onSelectType,
  buttonClassName,
  iconClassName,
  buttonLabel,
  disableDefaultNavigation = false,
  align = 'left',
  className,
}: PropertyTypeDropdownProps) => {
  const { t } = useTranslation('appraisal');
  const readOnly = usePageReadOnly();
  const navigate = useNavigate();
  const appraisalId = useAppraisalId();
  const layoutBasePath = useBasePath();
  const propertyBasePath = usePropertyBasePath();

  const handleSelect = (propertyType: (typeof PROPERTY_TYPES)[number]) => {
    if (readOnly) return;
    if (onSelectType) {
      onSelectType(propertyType.type, groupId, propertyType.code);
    }

    if (!disableDefaultNavigation && propertyType.route) {
      const targetPath = appraisalId
        ? `${layoutBasePath}/${propertyBasePath}/${propertyType.route}/new`
        : `/${propertyType.route}-detail`;

      navigate(`${targetPath}?groupId=${groupId}&type=${encodeURIComponent(propertyType.type)}`);
    }
  };

  return (
    // `inline-block` is the default, not a base class: passing `block` alongside it only wins by
    // Tailwind's CSS ordering, which puts inline-block last. Callers that want a full-width row
    // supply their own display utility instead.
    <Menu as="div" className={clsx('relative text-left', className ?? 'inline-block')}>
      <MenuButton
        disabled={readOnly}
        className={clsx(
          'flex items-center gap-2 transition-colors',
          readOnly && 'opacity-50 cursor-not-allowed',
          // The chrome is a default, not a base: a caller passing `px-2.5` next to a base `px-4`
          // only wins by Tailwind's output order, which is not something to build on.
          buttonClassName ??
            'px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50',
        )}
      >
        <Icon name="circle-plus" className={iconClassName ?? 'text-gray-500'} />
        <span>{buttonLabel ?? t('properties.addToGroup')}</span>
        <Icon
          name="chevron-down"
          className={clsx('ml-1', iconClassName ?? 'text-gray-400')}
          style="solid"
        />
      </MenuButton>

      <MenuItems
        anchor={{ to: align === 'right' ? 'bottom end' : 'bottom start', gap: 8 }}
        className="z-50 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none"
      >
        <PropertyTypePicker onPick={handleSelect} />
      </MenuItems>
    </Menu>
  );
};

export default PropertyTypeDropdown;
