import {
  Listbox as HeadlessListBox,
  ListboxButton as HeadlessListboxButton,
  ListboxOption as HeadlessListboxOption,
  ListboxOptions as HeadlessListboxOptions,
} from '@headlessui/react';
import { forwardRef, type ReactNode, type SelectHTMLAttributes, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

// `value` is omitted from the DOM attributes and redeclared below: this control's value is the
// option's key, and `null` is how every caller says "nothing selected" (ListBoxItem.value is
// `string | null | undefined`). SelectHTMLAttributes types it as `string | number | readonly
// string[]`, which rejects that null at every call site.
interface DropdownBaseProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value'> {
  value?: string | null;
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
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
  otherField?: boolean;
  otherTriggerValue?: string;
  otherText?: string | null;
  onOtherTextChange?: (value: string) => void;
  otherMaxLength?: number;
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
      labelAddon,
      placeholder,
      error,
      required,
      disabled,
      filterOptions,
      filterWatchValues,
      showValuePrefix = true,
      compact = false,
      otherField = false,
      otherTriggerValue = '99',
      otherText,
      onOtherTextChange,
      otherMaxLength,
      // Pulled out by name on purpose: `...props` feeds exactly one thing below
      // (props.className), so anything left in it never reaches the DOM. aria-label
      // type-checked — this interface extends SelectHTMLAttributes — and then vanished.
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation('common');
    // Default lives in the locale files, not in this signature — the old 'Please select' literal
    // was the last English string left on a fully translated form.
    const resolvedPlaceholder =
      placeholder ?? t('select.placeholder', { defaultValue: 'Please select' });
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const isOtherMode = otherField && value === otherTriggerValue;
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
      return [{ value: null, label: resolvedPlaceholder, id: '' }, ...filteredOptions];
    }, [filteredOptions, resolvedPlaceholder]);

    const selectedOption = useMemo(
      () => allOptions.find(opt => opt.value === value) ?? null,
      [allOptions, value],
    );
    const selectedOnChange = (opt: ListBoxItem) => {
      onChange?.(opt.value);
    };

    return (
      <div className={clsx('w-full', props.className)}>
        {/* Only wrap when there is an addon: the grid form layout hoists [data-field-label] out
            of this component with `display: contents`, so an extra element in between would take
            the label column and stretch. */}
        {labelAddon ? (
          <div className="flex items-center gap-1.5 mb-1">
            {label && (
              <div data-field-label className="block text-xs font-medium text-gray-700">
                {label}
                {required && <span className="text-danger ml-0.5">*</span>}
              </div>
            )}
            {labelAddon}
          </div>
        ) : (
          label && (
            <div data-field-label className="block text-xs font-medium text-gray-700 mb-1">
              {label}
              {required && <span className="text-danger ml-0.5">*</span>}
            </div>
          )
        )}
        {isOtherMode ? (
          <OtherInput
            value={otherText ?? ''}
            onChange={v => onOtherTextChange?.(v)}
            onClear={() => {
              onChange?.(null);
              onOtherTextChange?.('');
            }}
            placeholder={t('select.otherPlaceholder', { defaultValue: 'Please specify' })}
            otherLabel={t('select.other', { defaultValue: 'Other' })}
            clearTitle={t('select.clearOther', { defaultValue: 'Clear and choose again' })}
            disabled={isDisabled}
            error={error}
            compact={compact}
            maxLength={otherMaxLength}
          />
        ) : (
          <ListBox
            ref={ref}
            value={selectedOption}
            onChange={selectedOnChange}
            placeholder={resolvedPlaceholder}
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
                {showValuePrefix && option.value
                  ? `${option.value} - ${option.label}`
                  : option.label}
              </ListBoxOption>
            ))}
          </ListBox>
        )}
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

interface OtherInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  otherLabel: string;
  clearTitle: string;
  disabled?: boolean;
  error?: string;
  compact?: boolean;
  maxLength?: number;
}

const OtherInput = ({
  value,
  onChange,
  onClear,
  placeholder,
  otherLabel,
  clearTitle,
  disabled,
  error,
  compact = false,
  maxLength,
}: OtherInputProps) => {
  return (
    <div>
      <div
        className={clsx(
          'flex items-stretch w-full rounded-lg border border-gray-200 bg-white transition-colors duration-200',
          'focus-within:ring-2 focus-within:ring-gray-200 focus-within:border-gray-400',
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-300',
          error
            ? 'border-danger text-danger-900 focus:ring-danger/20 focus:border-danger'
            : 'border-gray-200 focus:ring-gray-200 focus:border-gray-400',
        )}
      >
        <span
          className={clsx(
            'flex items-center shrink-0 border-r border-gray-200 bg-gray-50 text-gray-500 rounded-l-lg',
            compact ? 'px-2 text-xs' : 'px-3 text-sm',
          )}
        >
          {otherLabel}
        </span>
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={clsx(
              'block w-full h-full bg-transparent focus:outline-none placeholder:text-gray-400',
              compact ? 'text-xs pl-2 pr-7 py-1' : 'text-sm pl-3 pr-9 py-2',
              disabled ? 'text-gray-500 cursor-not-allowed' : 'text-gray-900',
            )}
          />
          {!disabled && (
            <button
              type="button"
              onClick={onClear}
              title={clearTitle}
              className={clsx(
                'absolute inset-y-0 right-0 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none',
                compact ? 'pr-2' : 'pr-3',
              )}
            >
              <Icon style="solid" name="xmark" className={compact ? 'size-3' : 'size-3.5'} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
OtherInput.displayName = 'OtherInput';

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
