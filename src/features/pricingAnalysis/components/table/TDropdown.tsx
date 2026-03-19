import {
  Listbox as HeadlessListBox,
  ListboxButton as HeadlessListboxButton,
  ListboxOption as HeadlessListboxOption,
  ListboxOptions as HeadlessListboxOptions,
  ListboxSelectedOption as HeadlessListboxSelectedOption,
} from '@headlessui/react';
import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from '@/shared/components/form';
import { Icon } from '@/shared/components';
import type { AtLeastOne } from '@/shared/types';
import { useParameters } from './useParameters';

type DropdownProps = DropdownBaseProps &
  AtLeastOne<{ queryParameters: ParameterParams; options: ListBoxItem[] }>;

interface DropdownBaseProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  onChange?: (value: any) => void;
  error?: string;
}

interface ListBoxProps {
  value: string | null | unknown;
  onChange?: (value: any) => void;
  placeholder: string;
  selected?: ListBoxItem | null;
  children: ReactNode;
  disabled?: boolean;
  error?: string;
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
      ...props
    },
    ref,
  ) => {
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const { data: fetchedOptions } = useParameters(queryParameters);
    let dropdownOptions =
      options !== undefined
        ? options
        : Array.isArray(fetchedOptions)
          ? fetchedOptions.map(p => {
              return { value: p.code, label: p.description, id: p.code };
            })
          : [];

    // to allow selecting placeholder
    dropdownOptions = [{ value: null, label: placeholder, id: '' }, ...dropdownOptions];

    const isControlled = onChange !== undefined && value !== undefined;
    const selectedOption = dropdownOptions.find(opt => opt.value === value) ?? null;
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
          error={error}
        >
          {dropdownOptions.map(option => (
            <ListBoxOption key={option.id ?? option.value} value={option}>
              <span className={option.colorClass}>{option.label}</span>
            </ListBoxOption>
          ))}
        </ListBox>
        {error && <div className="mt-1 text-xs text-danger">{error}</div>}
      </div>
    );
  },
);

const ListBox = forwardRef<HTMLButtonElement, ListBoxProps>(
  ({ placeholder, selected, children, disabled, error, ...props }, ref) => {
    return (
      <HeadlessListBox disabled={disabled} by="value" {...props}>
        <div className="relative">
          <HeadlessListboxButton
            ref={ref}
            className={clsx(
              'relative w-full rounded-lg border text-left text-xs transition-colors duration-200 pr-9',
              'focus:outline-none focus:ring-2',
              disabled
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'bg-white hover:border-gray-300',
              error
                ? 'border-danger text-danger-900 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-gray-200 focus:border-gray-400',
            )}
          >
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <Icon style="regular" name="chevron-down" className="size-3.5" />
            </div>
            <div className={clsx('px-3 py-2 truncate', selected?.colorClass)}>
              {selected?.value ? (
                `${selected.value} - ${selected.label}`
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
