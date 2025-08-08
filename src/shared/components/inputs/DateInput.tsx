import { type InputHTMLAttributes } from 'react';
import Input from '../Input';

interface DateInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

const DateInput = ({ error, ...props }: DateInputProps) => {
  return <Input type="date" error={error} {...props} />;
};

export default DateInput;
