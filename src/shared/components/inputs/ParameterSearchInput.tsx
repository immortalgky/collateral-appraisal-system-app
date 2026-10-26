import { forwardRef, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useParameterOptions } from '../../utils/parameterUtils';
import type { ListBoxItem } from './Dropdown';
import { useFormReadOnly } from '../form/context';
import { useFormLayout } from '../form/formLayoutContext';
import { ValidationText } from '../form/ValidationText';
import Icon from '../Icon';
import { controlFrame, controlSkin, ERROR_TEXT, REQUIRED_MARK } from './controlStyles';

interface ParameterSearchInputProps {
  /** Parameter group to search from (e.g., 'LandOffice') */
  group: string;
  /** Extra static options (merged with parameter options) */
  options?: ListBoxItem[];
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  /** Id of the text box, for an outside `<label htmlFor>` (FormFields draws the label itself). */
  id?: string;
  /** Current value (code string) */
  value?: string | null;
  onChange?: (value: string | null) => void;
  onBlur?: () => void;
  name?: string;
}

const ParameterSearchInput = forwardRef<HTMLInputElement, ParameterSearchInputProps>(
  (
    {
      group,
      options: staticOptions,
      label,
      labelAddon,
      placeholder,
      required,
      disabled,
      error,
      className,
      id,
      value,
      onChange,
      onBlur,
      name,
    },
    ref,
  ) => {
    const uuid = useId();
    const inputId = id ?? uuid;
    const { t } = useTranslation('common');
    const resolvedPlaceholder =
      placeholder ?? t('select.searchPlaceholder', { defaultValue: 'Search...' });
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const layout = useFormLayout();

    const paramOptions = useParameterOptions(group);
    const allOptions = useMemo<ListBoxItem[]>(() => {
      if (staticOptions !== undefined) return staticOptions;
      return paramOptions;
    }, [staticOptions, paramOptions]);

    // Derive the display label from current value
    const selectedOption = useMemo(
      () => allOptions.find(o => o.value === value) ?? null,
      [allOptions, value],
    );

    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Sync input display: when closed, show the selected label; when open show query
    const inputDisplayValue = isOpen
      ? query
      : selectedOption
        ? `${selectedOption.value} - ${selectedOption.label}`
        : '';

    // Filter options by code OR description (case-insensitive)
    const filtered = useMemo(() => {
      if (!query.trim()) return allOptions;
      const q = query.toLowerCase();
      return allOptions.filter(
        o => (o.value ?? '').toLowerCase().includes(q) || o.label.toLowerCase().includes(q),
      );
    }, [allOptions, query]);

    // Calculate dropdown position
    useEffect(() => {
      if (isOpen && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = Math.min(filtered.length * 36 + 8, 288); // max ~8 items
        setPosition(spaceBelow < dropdownHeight && rect.top > dropdownHeight ? 'top' : 'bottom');
      }
    }, [isOpen, filtered.length]);

    // Close on outside click
    useEffect(() => {
      const handleOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          closeDropdown();
        }
      };
      if (isOpen) document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
      if (highlightedIndex >= 0 && listRef.current) {
        const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
        item?.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex]);

    const openDropdown = () => {
      if (isDisabled) return;
      setQuery('');
      setHighlightedIndex(-1);
      setIsOpen(true);
    };

    const closeDropdown = () => {
      setIsOpen(false);
      setQuery('');
      setHighlightedIndex(-1);
    };

    const selectOption = (opt: ListBoxItem) => {
      onChange?.(opt.value ?? null);
      closeDropdown();
      onBlur?.();
    };

    const clearValue = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(null);
      closeDropdown();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDropdown();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(i => Math.min(i + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
            selectOption(filtered[highlightedIndex]);
          }
          break;
        case 'Escape':
          closeDropdown();
          break;
        case 'Tab':
          closeDropdown();
          break;
      }
    };

    const setRefs = (el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    };

    return (
      <div ref={containerRef} className={clsx('relative w-full', className)}>
        {labelAddon ? (
          <div className="flex items-center gap-1.5 mb-1">
            {label && (
              <label htmlFor={inputId} className="block text-xs font-medium text-(--palette-ink)">
                {label}
                {required && <span className={REQUIRED_MARK}>*</span>}
              </label>
            )}
            {labelAddon}
          </div>
        ) : (
          label && (
            <label
              htmlFor={inputId}
              className="block text-xs font-medium text-(--palette-ink) mb-1"
            >
              {label}
              {required && <span className={REQUIRED_MARK}>*</span>}
            </label>
          )
        )}

        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-(--palette-gray-400)">
            <Icon style="regular" name="magnifying-glass" />
          </div>

          <input
            ref={setRefs}
            id={inputId}
            name={name}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={`${inputId}-listbox`}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${inputId}-option-${highlightedIndex}` : undefined
            }
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : undefined}
            disabled={isDisabled}
            placeholder={
              isOpen
                ? t('select.typeToSearch', { defaultValue: 'Type to search...' })
                : resolvedPlaceholder
            }
            value={inputDisplayValue}
            onChange={handleInputChange}
            onClick={openDropdown}
            onFocus={openDropdown}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // delay so option mousedown fires first
              setTimeout(() => {
                if (!containerRef.current?.contains(document.activeElement)) {
                  closeDropdown();
                  onBlur?.();
                }
              }, 150);
            }}
            autoComplete="off"
            readOnly={!isOpen}
            className={clsx(
              // The form-system box (17.3). The magnifier takes the left inset, the clear button /
              // chevron the dropdown's trailing slot on the right.
              'block w-full pl-9 pr-[2.2857rem]',
              controlFrame(layout),
              controlSkin({ error: !!error, disabled: isDisabled }),
              !isDisabled && (isOpen ? 'cursor-text' : 'cursor-pointer'),
            )}
          />

          <div className="absolute inset-y-0 right-[0.7857rem] flex items-center text-base">
            {value && !isDisabled ? (
              <button
                type="button"
                tabIndex={-1}
                onClick={clearValue}
                className="text-(--palette-gray-400) hover:text-(--palette-gray-600) transition-colors"
                aria-label={t('select.clearSelection')}
              >
                <Icon style="solid" name="xmark" />
              </button>
            ) : (
              <div className="pointer-events-none text-(--palette-gray-400)">
                <Icon
                  style="regular"
                  name="chevron-down"
                  className={clsx('transition-transform duration-200', isOpen && 'rotate-180')}
                />
              </div>
            )}
          </div>

          {isOpen && (
            <ul
              ref={listRef}
              id={`${inputId}-listbox`}
              role="listbox"
              aria-label={label}
              className={clsx(
                'absolute left-0 right-0 z-50 bg-(--palette-surface) text-(--palette-ink) rounded-lg border border-(--palette-line) shadow-lg py-1 max-h-72 overflow-y-auto',
                position === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1',
              )}
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-(--palette-gray-400) text-center select-none">
                  {t('select.noResults')}
                </li>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <li
                      key={opt.id ?? opt.value}
                      id={`${inputId}-option-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={e => {
                        e.preventDefault();
                        selectOption(opt);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 text-sm leading-normal cursor-pointer transition-colors select-none text-(--palette-ink)',
                        // Same option look as `Dropdown` (17.3): highlight, then the selected wash.
                        isHighlighted
                          ? 'bg-(--palette-surface-3)'
                          : isSelected && 'bg-(--palette-accent-wash)',
                        isSelected && 'font-medium',
                      )}
                    >
                      <span className="w-3.5 flex-shrink-0">
                        {isSelected && (
                          <Icon style="solid" name="check" className="text-(--palette-ink-2)" />
                        )}
                      </span>
                      <span className="truncate">{`${opt.value} - ${opt.label}`}</span>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>

        {error && (
          <div id={`${inputId}-error`} className={clsx('mt-1', ERROR_TEXT)}>
            <ValidationText message={error} label={label} />
          </div>
        )}
      </div>
    );
  },
);

ParameterSearchInput.displayName = 'ParameterSearchInput';

export default ParameterSearchInput;
