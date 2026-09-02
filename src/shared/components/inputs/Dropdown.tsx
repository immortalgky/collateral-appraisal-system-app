import {
  Listbox as HeadlessListBox,
  ListboxButton as HeadlessListboxButton,
  ListboxOption as HeadlessListboxOption,
  ListboxOptions as HeadlessListboxOptions,
} from '@headlessui/react';
import { forwardRef, type ReactNode, type SelectHTMLAttributes, useMemo } from 'react';
import Icon from '../Icon';
import clsx from 'clsx';
import { useParameterOptions } from '../../utils/parameterUtils';
import type { AtLeastOne } from '@/shared/types';
import { useFormReadOnly } from '../form/context';

type DropdownProps = DropdownBaseProps & AtLeastOne<{ group: string; options: ListBoxItem[] }>;

export type OptionFilter =
  | { type: 'include'; values: string[] }
  | { type: 'exclude'; values: string[] }
  | { type: 'isActive'; values: boolean }
  | { type: 'match'; pattern: string } // regex match
  | { type: 'exclude-match'; pattern: string } //regex match to exclude
  | { type: 'dynamic'; field: string; map: Record<string, string[]> } // map of watched value to allowed options.
  | { type: 'dynamic-array'; field: string; itemField: string; map: Record<string, string[]> }; // map of watched value to allowed options for array.

function applyOptionFilters(
  options: ListBoxItem[],
  filters: OptionFilter[],
  watchValues: Record<string, unknown> = {},
): ListBoxItem[] {
  return options.filter(opt => {
    const value = opt.value ?? '';
    return filters.every(filter => {
      switch (filter.type) {
        case 'include':
          return filter.values.includes(value);
        case 'isActive':
          return (opt as any).isActive !== false;
        case 'exclude':
          return !filter.values.includes(value);
        case 'match':
          return new RegExp(filter.pattern).test(value);
        case 'exclude-match':
          return !new RegExp(filter.pattern).test(value);
        case 'dynamic': {
          const watched = watchValues[filter.field];
          const key = String(watched ?? '');
          const allowed = filter.map[key] ?? filter.map['*'] ?? null;
          if (allowed === null) return true;
          return allowed.includes(value);
        }
        case 'dynamic-array': {
          const field = watchValues[filter.field];
          const arr = Array.isArray(field) ? field : field != null ? [field] : [];
          if (arr.length === 0) return true;
          const allowed = new Set<string>();
          for (const item of arr) {
            const key = item?.[filter.itemField] != null ? String(item[filter.itemField]) : '';
            const mapped = filter.map[key] ?? filter.map['*'] ?? null;
            if (mapped === null) return true;
            mapped.forEach(v => allowed.add(v));
          }
          return allowed.has(value);
        }
        default:
          return true;
      }
    });
  });
}

interface DropdownBaseProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  onChange?: (value: any) => void;
  error?: string;
  filterOptions?: OptionFilter | OptionFilter[];
  /**
   * Shrink the control for a dense bar — a pagination footer, a toolbar — instead of a form row.
   * Same component, same behaviour, smaller box: without it the only way to fit a dropdown into
   * those places was a native <select>, which renders as an OS menu and matches nothing else here.
   *
   * Not called `size`: this interface extends SelectHTMLAttributes, where `size` is the number of
   * visible rows, and shadowing it with a string union makes the whole interface stop extending.
   */
  compact?: boolean;
  filterWatchValues?: Record<string, unknown>;
  showValuePrefix?: boolean;
  /**
   * Render the option's `value` as a `"value - label"` prefix in both the
   * trigger and the option list. Defaults to `true` to preserve the existing
   * "code - description" pattern used for parameter codes (e.g. country codes).
   * Set to `false` for filters where the value is an internal enum and only
   * the human label should be shown (e.g. status filters).
   */
}

interface ListBoxProps {
  value: string | null | unknown;
  onChange?: (value: any) => void;
  placeholder: string;
  //selectedLabel?: string;
  selected?: ListBoxItem | null;
  children: ReactNode;
  disabled?: boolean;
  error?: string;
  showValuePrefix?: boolean;
  compact?: boolean;
  /** Names the control for assistive tech where there is no visible label — a toolbar or footer. */
  ariaLabel?: string;
}

interface ListBoxOptionProps {
  children: ReactNode;
  value: ListBoxItem | null;
}

export type ListBoxItem = {
  value: string | null | undefined;
  label: string;
  id?: string | number;
  isActive?: boolean;
};

const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(
  (
    {
      group,
      options,
      value,
      onChange,
      label,
      placeholder = 'Please select',
      error,
      required,
      disabled,
      filterOptions,
      filterWatchValues,
      showValuePrefix = true,
      compact = false,
      // Pulled out by name on purpose: `...props` feeds exactly one thing below
      // (props.className), so anything left in it never reaches the DOM. aria-label
      // type-checked — this interface extends SelectHTMLAttributes — and then vanished.
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const parameterOptions = useParameterOptions(group ?? '');
    const filters = useMemo<OptionFilter[]>(() => {
      if (!filterOptions) return [];
      return Array.isArray(filterOptions) ? filterOptions : [filterOptions];
    }, [filterOptions]);

    const allOptions = useMemo(() => {
      return options !== undefined ? options : parameterOptions;
    }, [options, parameterOptions]);

    const filteredOptions = useMemo(() => {
      return applyOptionFilters(allOptions, filters, filterWatchValues);
    }, [allOptions, filters, filterWatchValues]);

    const dropdownOptions = useMemo(() => {
      return [{ value: null, label: placeholder, id: '' }, ...filteredOptions];
    }, [filteredOptions, placeholder]);

    const selectedOption = useMemo(
      () => allOptions.find(opt => opt.value === value) ?? null,
      [allOptions, value],
    );
    const selectedOnChange = (opt: ListBoxItem) => {
      onChange?.(opt.value);
    };

    return (
      <div className={clsx('w-full', props.className)}>
        {label && (
          <div data-field-label className="block text-xs font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </div>
        )}
        <ListBox
          ref={ref}
          value={selectedOption}
          onChange={selectedOnChange}
          placeholder={placeholder}
          //selectedLabel={selectedOption?.label}
          selected={selectedOption}
          disabled={isDisabled}
          error={error}
          compact={compact}
          ariaLabel={ariaLabel}
          showValuePrefix={showValuePrefix}
        >
          {dropdownOptions.map(option => (
            <ListBoxOption key={option.id ?? option.value} value={option}>
              {showValuePrefix && option.value ? `${option.value} - ${option.label}` : option.label}
            </ListBoxOption>
          ))}
        </ListBox>
        {error && <div className="mt-1 text-xs text-danger">{error}</div>}
      </div>
    );
  },
);

const ListBox = forwardRef<HTMLButtonElement, ListBoxProps>(
  (
    {
      placeholder,
      selected,
      children,
      disabled,
      error,
      showValuePrefix = true,
      compact = false,
      ariaLabel,
      ...props
    },
    ref,
  ) => {
    return (
      <HeadlessListBox disabled={disabled} by="value" {...props}>
        <div className="relative">
          <HeadlessListboxButton
            ref={ref}
            aria-label={ariaLabel}
            className={clsx(
              'block relative w-full rounded-lg border text-left transition-colors duration-200',
              compact ? 'text-xs pr-7' : 'text-sm pr-9',
              'focus:outline-none focus:ring-2',
              disabled
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'bg-white hover:border-gray-300',
              error
                ? 'border-danger text-danger-900 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-gray-200 focus:border-gray-400',
            )}
          >
            <div
              className={clsx(
                'absolute inset-y-0 right-0 flex items-center pointer-events-none text-gray-400',
                compact ? 'pr-2' : 'pr-3',
              )}
            >
              <Icon
                style="regular"
                name="chevron-down"
                className={compact ? 'size-3' : 'size-3.5'}
              />
            </div>
            <div className={clsx('truncate', compact ? 'px-2 py-1' : 'px-3 py-2')}>
              {selected?.value ? (
                showValuePrefix ? (
                  `${selected.value} - ${selected.label}`
                ) : (
                  selected.label
                )
              ) : (
                <span className="text-gray-400">{placeholder}</span>
              )}
            </div>
          </HeadlessListboxButton>
          <HeadlessListboxOptions
            anchor="bottom start"
            // Headless UI 2's `anchor` system writes an inline
            //   max-height: min(var(--anchor-max-height, 100vh), <available-px>)
            // which defeats any Tailwind class or React `style.maxHeight` we set.
            // Override by clamping the CSS variable itself — the lib's own min()
            // then evaluates to our cap.
            style={{ '--anchor-max-height': '20rem' } as React.CSSProperties}
            className="min-w-(--button-width) max-w-[min(28rem,calc(100vw-2rem))] mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50 overflow-y-auto"
          >
            {children}
          </HeadlessListboxOptions>
        </div>
      </HeadlessListBox>
    );
  },
);
ListBox.displayName = 'ListBox';
Dropdown.displayName = 'Dropdown';

const ListBoxOption = ({ children, value, ...props }: ListBoxOptionProps) => {
  return (
    <HeadlessListboxOption
      value={value}
      className={clsx(
        'group flex gap-2 px-3 py-2 text-sm cursor-pointer transition-colors',
        'data-focus:bg-gray-100 data-focus:text-gray-900',
        'data-selected:bg-gray-100 data-selected:text-gray-900 data-selected:font-medium',
      )}
      {...props}
    >
      {({ selected }) => (
        <div className="flex items-center gap-2 w-full">
          {selected && <Icon style="solid" name="check" className="size-3.5 text-gray-600" />}
          <span className={clsx('truncate', selected ? '' : 'ml-5')}>{children}</span>
        </div>
      )}
    </HeadlessListboxOption>
  );
};

export default Dropdown;
