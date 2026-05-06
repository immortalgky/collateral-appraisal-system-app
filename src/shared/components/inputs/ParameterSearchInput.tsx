import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useParameterOptions } from '../../utils/parameterUtils';
import type { ListBoxItem } from './Dropdown';
import { useFormReadOnly } from '../form/context';
import Icon from '../Icon';

interface ParameterSearchInputProps {
  /** Parameter group to search from (e.g., 'LandOffice') */
  group: string;
  /** Extra static options (merged with parameter options) */
  options?: ListBoxItem[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
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
      placeholder = 'Search...',
      required,
      disabled,
      error,
      className,
      value,
      onChange,
      onBlur,
      name,
    },
    ref,
  ) => {
    const uuid = useId();
    const inputId = uuid;
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;

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
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Icon style="regular" name="magnifying-glass" className="size-3.5" />
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
            disabled={isDisabled}
            placeholder={isOpen ? 'Type to search...' : placeholder}
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
              'block w-full pl-9 pr-9 py-2 border rounded-lg text-sm transition-colors duration-200',
              'placeholder:text-gray-400',
              error
                ? 'border-danger text-danger-900 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
              isDisabled
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'bg-white hover:border-gray-300 cursor-pointer',
              isOpen && !isDisabled && 'cursor-text',
            )}
          />

          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {value && !isDisabled ? (
              <button
                type="button"
                tabIndex={-1}
                onClick={clearValue}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear selection"
              >
                <Icon style="solid" name="xmark" className="size-3.5" />
              </button>
            ) : (
              <div className="pointer-events-none text-gray-400">
                <Icon
                  style="regular"
                  name="chevron-down"
                  className={clsx(
                    'size-3.5 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {isOpen && (
          <ul
            ref={listRef}
            id={`${inputId}-listbox`}
            role="listbox"
            aria-label={label}
            className={clsx(
              'absolute left-0 right-0 z-50 bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-72 overflow-y-auto',
              position === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1',
            )}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-400 text-center select-none">
                No results found
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
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors select-none',
                      isHighlighted ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      isSelected && 'font-medium',
                    )}
                  >
                    <span className="w-3.5 flex-shrink-0">
                      {isSelected && (
                        <Icon style="solid" name="check" className="size-3.5 text-gray-600" />
                      )}
                    </span>
                    <span className="truncate">{`${opt.value} - ${opt.label}`}</span>
                  </li>
                );
              })
            )}
          </ul>
        )}

        {error && <div className="mt-1 text-xs text-danger">{error}</div>}
      </div>
    );
  },
);

ParameterSearchInput.displayName = 'ParameterSearchInput';

export default ParameterSearchInput;
