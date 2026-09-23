import { type SelectHTMLAttributes } from 'react';
import Dropdown, { type ListBoxItem } from './Dropdown';

// A pass-through to Dropdown, so it carries Dropdown's value contract, not the DOM one: the value
// is an option's key and `null` means nothing is selected. See Dropdown.tsx.
interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value'> {
  options: ListBoxItem[];
  value?: string | null;
  label?: string;
  placeholder?: string;
  onChange?: (value: any) => void;
  error?: string;
}

// TODO: Change dropdown to modal
const SelectInput = ({ ...props }: SelectInputProps) => {
  return <Dropdown {...props} />;
};

export default SelectInput;
