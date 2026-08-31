import type { ReactNode } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';

export interface SearchByOption {
  value: string;
  label: string;
  /** Icon name (FA sprite) shown for the field — reflects what you're searching by. */
  icon?: string;
}

interface SearchByInputProps {
  /** Options for the "search by" field selector. */
  options: SearchByOption[];
  /** Currently selected field value. */
  field: string;
  onFieldChange: (field: string) => void;
  /** Search term (controlled). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /**
   * Rendered inside the pill, after the input — a spinner while a search is in flight, a clear
   * button, that kind of thing. Optional so the callers that predate it are unchanged.
   */
  endAdornment?: ReactNode;
  /**
   * Forwarded to the input as aria-describedby. Without it a hint rendered beside this control
   * (e.g. "type at least 3 characters") is orphaned and never announced.
   */
  describedBy?: string;
}

/**
 * Combined search control: a "search by" field selector on the left, a divider, then
 * the search input — all inside one bordered container. The field selector's menu sizes
 * to its own content, so it can be wider than the pill.
 */
function SearchByInput({
  options,
  field,
  onFieldChange,
  value,
  onChange,
  placeholder,
  className,
  endAdornment,
  describedBy,
}: SearchByInputProps) {
  const selected = options.find(o => o.value === field);

  return (
    <div
      className={clsx(
        'flex items-center rounded-lg border border-gray-200 bg-white transition-colors',
        'focus-within:ring-2 focus-within:ring-gray-200 focus-within:border-gray-400',
        className,
      )}
    >
      {/* Field selector */}
      <Menu as="div" className="relative shrink-0">
        <MenuButton
          style={{ outline: 'none' }}
          className="flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm text-gray-700 whitespace-nowrap hover:bg-gray-50"
        >
          {selected?.icon && (
            <Icon style="solid" name={selected.icon} className="size-3.5 text-primary" />
          )}
          {selected?.label ?? ''}
          <Icon style="regular" name="chevron-down" className="size-3 text-gray-400" />
        </MenuButton>
        <MenuItems
          anchor="bottom start"
          className="mt-1 min-w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50 focus:outline-none"
        >
          {options.map(o => {
            const isSelected = o.value === field;
            return (
              <MenuItem key={o.value}>
                <button
                  type="button"
                  onClick={() => onFieldChange(o.value)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors data-focus:bg-gray-100"
                >
                  {o.icon && (
                    <Icon
                      style="solid"
                      name={o.icon}
                      className={clsx('size-3.5', isSelected ? 'text-primary' : 'text-gray-400')}
                    />
                  )}
                  <span
                    className={clsx('flex-1 truncate', isSelected && 'font-medium text-gray-900')}
                  >
                    {o.label}
                  </span>
                  {isSelected && (
                    <Icon style="solid" name="check" className="size-3.5 text-gray-600" />
                  )}
                </button>
              </MenuItem>
            );
          })}
        </MenuItems>
      </Menu>

      {/* Divider */}
      <div className="h-5 w-px shrink-0 bg-gray-200" />

      {/* Search input */}
      <div className="flex flex-1 items-center px-3">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={describedBy}
          // Inline outline:none — the global `:focus-visible` rule (src/index.css) is unlayered
          // and beats Tailwind's layered outline utilities; an inline style outranks it.
          style={{ outline: 'none' }}
          className="w-full min-w-0 bg-transparent py-2 text-sm placeholder:text-gray-400"
        />
        {endAdornment && <div className="ml-2 flex shrink-0 items-center">{endAdornment}</div>}
      </div>
    </div>
  );
}

export default SearchByInput;
