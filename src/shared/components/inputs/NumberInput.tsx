import { type InputHTMLAttributes } from 'react';
import Input from '../Input';

interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  readonly?: boolean;
  error?: string;
}

const NumberInput = ({ error, ...props }: NumberInputProps) => {
  return <Input {...props} error={error} type="number" />;
};

export default NumberInput;
