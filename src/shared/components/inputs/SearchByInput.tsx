import type { ReactNode } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import { FOCUS } from './controlStyles';
import { KEYBOARD_RING_PLAIN, usePointerMode } from '@/shared/hooks/usePointerMode';

export interface SearchByOption {
  value: string;
  label: string;
  /** Icon name (FA sprite) shown for the field — reflects what you're searching by. */
  icon?: string;
  /** 'pill' variant: the classes of the pill while this field is the selected one (its tint),
   *  in place of the default grey. */
  pillClass?: string;
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
  /**
   * 'pill' draws the field selector as the soft grey pill of the top bar's quick search, inside
   * the same white bordered box, followed by a magnifier — no divider. Opt-in: the other callers
   * keep the plain selector.
   */
  variant?: 'default' | 'pill';
  /**
   * 'pill' only: what clicking the scope pill does. The pill has no menu of its own — the caller
   * opens its own panel (the page's suggestion panel, with the scope chips), as the top bar's
   * quick-search badge does. It is a real button, so Enter and Space reach it too.
   */
  onFieldClick?: () => void;
  /**
   * 'pill' only: what the pill is for, e.g. "Search in field". The button's name then reads
   * "<this>: <current scope>" instead of just the scope's own label.
   */
  fieldAriaLabel?: string;
  /** 'pill' only: whether the panel the pill opens is showing, for aria-expanded. */
  fieldExpanded?: boolean;
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
  variant = 'default',
  onFieldClick,
  fieldAriaLabel,
  fieldExpanded,
}: SearchByInputProps) {
  const selected = options.find(o => o.value === field);
  const pill = variant === 'pill';
  const { pointerMode, onPointerDownCapture } = usePointerMode();

  return (
    <div
      className={clsx(
        'flex items-center rounded-lg border border-(--palette-input-edge) bg-(--palette-surface) transition-colors',
        FOCUS.within,
        className,
      )}
      onPointerDownCapture={onPointerDownCapture}
    >
      {/* Field selector */}
      {pill ? (
        // The top bar's badge, class for class (Navbar), in its grey: icon, label, chevron. The
        // ring is the keyboard focus ring, not the global outline (switched off inline) — and
        // not after the mouse (see usePointerMode).
        <button
          type="button"
          onClick={onFieldClick}
          aria-label={fieldAriaLabel ? `${fieldAriaLabel}: ${selected?.label ?? ''}` : undefined}
          // It opens a panel (not a menu); expanded follows whether that panel is showing.
          aria-haspopup="dialog"
          aria-expanded={fieldExpanded}
          style={{ outline: 'none' }}
          className={clsx(
            'ml-1.5 flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium whitespace-nowrap transition-all',
            selected?.pillClass ?? 'bg-(--palette-surface-3) text-(--palette-gray-500)',
            !pointerMode && KEYBOARD_RING_PLAIN,
          )}
        >
          {selected?.icon && <Icon style="solid" name={selected.icon} className="size-3" />}
          <span className="leading-none">{selected?.label ?? ''}</span>
          <Icon style="solid" name="chevron-down" className="size-2.5 opacity-60" />
        </button>
      ) : (
        <Menu as="div" className="relative shrink-0">
          <MenuButton
            style={{ outline: 'none' }}
            className="flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm text-(--palette-ink) whitespace-nowrap hover:bg-(--palette-surface-2)"
          >
            {selected?.icon && (
              <Icon
                style="solid"
                name={selected.icon}
                className="size-3.5 text-(--palette-gray-500)"
              />
            )}
            {selected?.label ?? ''}
            <Icon
              style="regular"
              name="chevron-down"
              className="size-3 text-(--palette-gray-400)"
            />
          </MenuButton>
          <MenuItems
            // The menu takes the focus when it opens; the global unlayered :focus-visible outline
            // would box the whole panel in blue, and `focus:outline-none` cannot beat it.
            style={{ outline: 'none' }}
            anchor="bottom start"
            className="mt-1 min-w-44 rounded-lg border border-(--palette-line) bg-(--palette-surface) py-1 shadow-lg z-50 focus:outline-none"
          >
            {options.map(o => {
              const isSelected = o.value === field;
              return (
                <MenuItem key={o.value}>
                  <button
                    type="button"
                    onClick={() => onFieldChange(o.value)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors data-focus:bg-(--palette-surface-3)"
                  >
                    {o.icon && (
                      <Icon
                        style="solid"
                        name={o.icon}
                        className={clsx(
                          'size-3.5',
                          isSelected ? 'text-(--palette-ink)' : 'text-(--palette-gray-400)',
                        )}
                      />
                    )}
                    <span
                      className={clsx(
                        'flex-1 truncate',
                        isSelected && 'font-medium text-(--palette-ink)',
                      )}
                    >
                      {o.label}
                    </span>
                    {isSelected && (
                      <Icon
                        style="solid"
                        name="check"
                        className="size-3.5 text-(--palette-gray-600)"
                      />
                    )}
                  </button>
                </MenuItem>
              );
            })}
          </MenuItems>
        </Menu>
      )}

      {!pill && <div className="h-5 w-px shrink-0 bg-(--palette-line)" />}

      {/* Search input */}
      <div className={clsx('flex flex-1 items-center', pill ? 'pl-2 pr-3' : 'px-3')}>
        {pill && (
          <Icon
            name="magnifying-glass"
            style="regular"
            className="pointer-events-none mr-2 size-4 shrink-0 text-(--palette-gray-400)"
          />
        )}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={describedBy}
          // Inline outline:none — the global `:focus-visible` rule (src/index.css) is unlayered
          // and beats Tailwind's layered outline utilities; an inline style outranks it.
          style={{ outline: 'none' }}
          className="w-full min-w-0 bg-transparent py-2 text-sm placeholder:text-(--palette-gray-400)"
        />
        {endAdornment && <div className="ml-2 flex shrink-0 items-center">{endAdornment}</div>}
      </div>
    </div>
  );
}

export default SearchByInput;
