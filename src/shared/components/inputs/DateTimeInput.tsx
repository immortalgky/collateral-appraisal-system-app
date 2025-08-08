import { type InputHTMLAttributes } from 'react';
import Input from '../Input';

interface DateTimeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

const DateTimeInput = ({ error, ...props }: DateTimeInputProps) => {
  return <Input type="datetime-local" error={error} {...props} />;
};

export default DateTimeInput;
