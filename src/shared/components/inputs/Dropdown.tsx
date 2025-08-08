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
  value: string;
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
      ? options
      : Array.isArray(fetchedOptions)
        ? fetchedOptions.map(p => {
            return { value: p.code, label: p.description, id: p.code };
          })
        : [];
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
        <div className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-danger"> *</span>}
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
      {error && <div className="mt-1 text-sm text-danger">{error}</div>}
    </div>
  );
};

const ListBox = ({ placeholder, children, disabled, error, ...props }: ListBoxProps) => {
  return (
    <HeadlessListBox disabled={disabled} {...props}>
      <HeadlessListboxButton
        className={clsx(
          'relative w-full rounded-lg border text-left focus:not-data-focus:outline-none pr-10',
          disabled ? 'bg-neutral-100 hover:border-neutral-300' : 'bg-white',
          error
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 hover:!border-red-500'
            : 'border-neutral-300',
        )}
      >
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
          <Icon style="regular" name="chevron-down" />
        </div>
        <HeadlessListboxSelectedOption
          placeholder={<div className="px-4 py-2 text-gray-400">{placeholder}</div>}
          options={children}
        />
      </HeadlessListboxButton>
      <HeadlessListboxOptions
        anchor="bottom"
        className="w-(--button-width) bg-white rounded-lg border border-neutral-300"
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
      className="group flex gap-2 data-focus:bg-primary-100 px-4 py-2 rounded-lg"
      {...props}
    >
      {({ selected }) => (selected ? <>{children}</> : <div>{children}</div>)}
    </HeadlessListboxOption>
  );
};

export default Dropdown;
