import { type SelectHTMLAttributes } from 'react';
import Dropdown, { type ListBoxItem } from './Dropdown';

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: ListBoxItem[];
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
