import {
  Listbox as HeadlessListBox,
  ListboxButton as HeadlessListboxButton,
  ListboxOption as HeadlessListboxOption,
  ListboxOptions as HeadlessListboxOptions,
} from '@headlessui/react';
import { forwardRef, useMemo, type ReactNode, type SelectHTMLAttributes } from 'react';
import Icon from '../Icon';
import clsx from 'clsx';
import { useParameterOptions } from '../../utils/parameterUtils';
import type { AtLeastOne } from '@/shared/types';
import { useFormReadOnly } from '../form/context';

type DropdownProps = DropdownBaseProps &
  AtLeastOne<{ group: string; options: ListBoxItem[] }>;

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
  selectedLabel?: string;
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
      ...props
    },
    ref,
  ) => {
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const parameterOptions = useParameterOptions(group ?? '');
    const dropdownOptions = useMemo(() => {
      const base = options !== undefined ? options : parameterOptions;
      return [{ value: undefined, label: placeholder, id: '' }, ...base];
    }, [options, parameterOptions, placeholder]);

    const isControlled = onChange !== undefined && value !== undefined;
    const selectedOption = useMemo(
      () => dropdownOptions.find(opt => opt.value === value) ?? null,
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
          onChange={onChange === undefined ? undefined : selectedOnChange}
          placeholder={placeholder}
          selectedLabel={selectedOption?.label}
          disabled={isDisabled}
          error={error}
        >
          {dropdownOptions.map(option => (
            <ListBoxOption key={option.id ?? option.value} value={option}>
              {option.label}
            </ListBoxOption>
          ))}
        </ListBox>
        {error && <div className="mt-1 text-xs text-danger">{error}</div>}
      </div>
    );
  },
);

const ListBox = forwardRef<HTMLButtonElement, ListBoxProps>(
  ({ placeholder, selectedLabel, children, disabled, error, ...props }, ref) => {
    return (
      <HeadlessListBox disabled={disabled} by="value" {...props}>
        <div className="relative">
          <HeadlessListboxButton
            ref={ref}
            className={clsx(
              'relative w-full rounded-lg border text-left text-sm transition-colors duration-200 pr-9',
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
            <div className="px-3 py-2">
              {selectedLabel || <span className="text-gray-400">{placeholder}</span>}
            </div>
          </HeadlessListboxButton>
          <HeadlessListboxOptions className="absolute left-0 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
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
          <span className={selected ? '' : 'ml-5'}>{children}</span>
        </div>
      )}
    </HeadlessListboxOption>
  );
};

export default Dropdown;
