import {
  Listbox as HeadlessListBox,
  ListboxButton as HeadlessListboxButton,
  ListboxOption as HeadlessListboxOption,
  ListboxOptions as HeadlessListboxOptions,
  ListboxSelectedOption as HeadlessListboxSelectedOption,
} from '@headlessui/react';
import { type ReactNode, type SelectHTMLAttributes } from 'react';
import Icon from '../Icon';
import clsx from 'clsx';
import { useParameters } from '../../api/parameters';
import type { ParameterParams } from '@/shared/types/api';
import type { AtLeastOne } from '@/shared/types';

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

const Dropdown = ({
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
}: DropdownProps) => {
  const { data: fetchedOptions } = useParameters(queryParameters);
  const dropdownOptions =
    options !== undefined
      ? required
        ? options
        : [{ value: undefined, label: `${placeholder}` }, ...options]
      : Array.isArray(fetchedOptions)
        ? fetchedOptions.map(p => {
            return { value: p.code, label: p.description, id: p.code };
          })
        : [];
  const selectedOption = dropdownOptions.find(opt => opt.value === value) ?? null;
  const selectedOnChange = (opt: ListBoxItem) => {
    console.log(selectedOption);
    onChange?.(opt.value);
  };

  return (
    <div className={clsx('w-full', props.className)}>
      {label && (
        <div className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </div>
      )}

      <ListBox
        value={value === undefined ? undefined : selectedOption}
        onChange={onChange === undefined ? undefined : selectedOnChange}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
      >
        {dropdownOptions.map(option => (
          <ListBoxOption key={option.id ?? option.value} value={option}>
            {option.label}
          </ListBoxOption>
        ))}
      </ListBox>
      {error && <div className="mt-1.5 text-sm text-danger">{error}</div>}
    </div>
  );
};

const ListBox = ({ placeholder, children, disabled, error, ...props }: ListBoxProps) => {
  return (
    <HeadlessListBox disabled={disabled} {...props}>
      <HeadlessListboxButton
        className={clsx(
          'relative w-full rounded-lg border text-left text-sm transition-colors duration-200 pr-10 overflow-clip',
          'focus:outline-none focus:ring-2',
          disabled
            ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
            : 'bg-white hover:border-gray-400',
          error
            ? 'border-danger text-danger-900 focus:ring-danger/20 focus:border-danger'
            : 'border-gray-300 focus:ring-primary-500/20 focus:border-primary-500',
        )}
      >
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
          <Icon style="regular" name="chevron-down" className="size-4" />
        </div>
        <HeadlessListboxSelectedOption
          placeholder={<div className="px-4 py-2.5 text-gray-400">{placeholder}</div>}
          options={children}
        />
      </HeadlessListboxButton>
      <HeadlessListboxOptions
        anchor="bottom"
        className="w-(--button-width) bg-white rounded-lg border border-gray-200 shadow-lg mt-1 py-1 z-50"
      >
        {children}
      </HeadlessListboxOptions>
    </HeadlessListBox>
  );
};

const ListBoxOption = ({ children, value, ...props }: ListBoxOptionProps) => {
  return (
    <HeadlessListboxOption
      value={value}
      className={clsx(
        'group flex gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors',
        'data-focus:bg-primary-50 data-focus:text-primary-700',
        'data-selected:bg-primary-100 data-selected:text-primary-800 data-selected:font-medium',
      )}
      {...props}
    >
      {({ selected }) => (
        <div className="flex items-center gap-2 w-full">
          {selected && <Icon style="solid" name="check" className="size-4 text-primary-600" />}
          <span className={selected ? '' : 'ml-6'}>{children}</span>
        </div>
      )}
    </HeadlessListboxOption>
  );
};

export default Dropdown;
