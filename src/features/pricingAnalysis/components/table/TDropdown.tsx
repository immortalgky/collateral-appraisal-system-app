import {
  Listbox as HeadlessListBox,
  ListboxButton as HeadlessListboxButton,
  ListboxOption as HeadlessListboxOption,
  ListboxOptions as HeadlessListboxOptions,
} from '@headlessui/react';
import { forwardRef, useMemo, type ReactNode, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from '@/shared/components/form';
import { Icon } from '@/shared/components';
import type { AtLeastOne } from '@/shared/types';
import { useParameterOptions } from '@/shared/utils/parameterUtils';

type DropdownProps = DropdownBaseProps &
  AtLeastOne<{ queryParameters: ParameterParams; options: ListBoxItem[] }>;

interface DropdownBaseProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  onChange?: (value: any) => void;
  showValue?: boolean;
  error?: string;
  /**
   * Opt-in compact sizing (smaller padding) for dense table cells — e.g. the
   * pricing-analysis scoring grids. Defaults to false so every existing caller renders
   * byte-identically; only pass `dense` from a context that actually needs a short row.
   */
  dense?: boolean;
  /** False drops the blank "please select" entry, for fields that must always hold a value. */
  allowEmpty?: boolean;
}

interface ListBoxProps {
  value: string | null | unknown;
  onChange?: (value: any) => void;
  placeholder: string;
  selected?: ListBoxItem | null;
  children: ReactNode;
  disabled?: boolean;
  showValue?: boolean;
  error?: string;
  dense?: boolean;
}

interface ListBoxOptionProps {
  children: ReactNode;
  value: ListBoxItem | null;
}

export type ListBoxItem = {
  value: string | undefined;
  label: string;
  id?: string | number;
  colorClass?: string;
  showValue?: boolean;
};

const TDropdown = forwardRef<HTMLButtonElement, DropdownProps>(
  (
    {
      queryParameters,
      options,
      value,
      onChange,
      label,
      placeholder = 'Please select',
      error,
      required,
      disabled,
      showValue = true,
      dense = false,
      allowEmpty = true,
      ...props
    },
    ref,
  ) => {
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;

    const paramOptions = useParameterOptions(queryParameters);
    let dropdownOptions = useMemo<ListBoxItem[]>(() => {
      if (options !== undefined) return options;
      return paramOptions;
    }, [options, paramOptions]);

    // to allow selecting placeholder
    if (allowEmpty) {
      dropdownOptions = [{ value: null, label: placeholder, id: '' }, ...dropdownOptions];
    }

    const isControlled = onChange !== undefined && value !== undefined;

    // Derive the display label from current value
    const selectedOption = useMemo(
      () => dropdownOptions.find(o => o.value === value) ?? null,
      [dropdownOptions, value],
    );

    const selectedOnChange = (opt: ListBoxItem) => {
      if (isControlled) {
        onChange(opt.value);
      }
    };

    return (
      <div className={clsx('w-full', props.className)}>
        {label && (
          <div className="block text-xs font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </div>
        )}
        <ListBox
          ref={ref}
          value={value === undefined ? undefined : selectedOption}
          onChange={selectedOnChange}
          selected={selectedOption}
          placeholder={placeholder}
          disabled={isDisabled}
          showValue={showValue}
          error={error}
          dense={dense}
        >
          {dropdownOptions.map(option => (
            <ListBoxOption key={option.id ?? option.value} value={option}>
              <span className={clsx(option.colorClass, 'truncate')}>{option.label}</span>
            </ListBoxOption>
          ))}
        </ListBox>
        {error && <div className="mt-1 text-xs text-danger">{error}</div>}
      </div>
    );
  },
);

const ListBox = forwardRef<HTMLButtonElement, ListBoxProps>(
  ({ placeholder, selected, children, disabled, showValue, error, dense, ...props }, ref) => {
    return (
      <HeadlessListBox disabled={disabled} by="value" {...props}>
        <div className="relative">
          <HeadlessListboxButton
            ref={ref}
            className={clsx(
              'relative w-full border text-left transition-colors duration-200 pr-9 focus:outline-none focus:ring-2',
              // Dense follows the mock's `select.in` exactly (pricing-analysis-compact-mock.html:
              // 192-198): 21px tall, 4px radius, 12px text, quiet #f6f9f9 fill with a transparent
              // border at rest — border only on hover/focus. `ring-2` stays defined above so an
              // error state still gets a visible ring; the non-error dense case neutralises it
              // with `focus:ring-transparent` instead of dropping the width utility (dropping it
              // would leave error's `focus:ring-danger/20` with no width to render against).
              // `block` is load-bearing, not cosmetic: a <button> is inline-block, so it
              // sits in a line box and the strut's descender space is added under it.
              // Inside a 26px scoring-grid cell that made the whole row 28px (21px button
              // + ~7px of baseline gap) while every row without a select stayed at 26.
              // As a block box it takes its own 21px and nothing else. Dense only —
              // non-dense callers keep the inline-block flow they render with today.
              dense
                ? 'block h-[21px] rounded-[4px] text-[12px] leading-none'
                : 'rounded-lg text-xs',
              disabled
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : dense
                  ? 'bg-[#f6f9f9] hover:border-[#cbd5d3]'
                  : 'bg-white hover:border-gray-300',
              error
                ? 'border-danger text-danger-900 focus:ring-danger/20 focus:border-danger'
                : dense
                  ? 'border-transparent focus:ring-transparent focus:border-[#0d9488] focus:bg-white'
                  : 'border-gray-200 focus:ring-gray-200 focus:border-gray-400',
            )}
          >
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <Icon style="regular" name="chevron-down" className="size-3.5" />
            </div>
            <div
              className={clsx(
                dense ? 'px-1.5 py-0.5 truncate leading-none' : 'px-3 py-2 truncate',
                selected?.colorClass,
              )}
            >
              {selected?.value ? (
                showValue ? (
                  `${selected.value} - ${selected.label}`
                ) : (
                  `${selected.label}`
                )
              ) : (
                <span className="text-gray-400">{placeholder}</span>
              )}
            </div>
          </HeadlessListboxButton>
          <HeadlessListboxOptions
            anchor="bottom"
            className="w-(--button-width) mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50 max-h-80 overflow-y-auto"
          >
            {children}
          </HeadlessListboxOptions>
        </div>
      </HeadlessListBox>
    );
  },
);
ListBox.displayName = 'ListBox';
TDropdown.displayName = 'Dropdown';

const ListBoxOption = ({ children, value, ...props }: ListBoxOptionProps) => {
  return (
    <HeadlessListboxOption
      value={value}
      className={clsx(
        'group flex gap-2 px-3 py-2 text-xs cursor-pointer transition-colors',
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

export default TDropdown;
