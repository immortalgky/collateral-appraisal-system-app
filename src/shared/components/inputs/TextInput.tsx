import { type InputHTMLAttributes } from 'react';
import Input from '../Input';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  readonly?: boolean;
  error?: string;
}

const TextInput = ({ error, ...props }: TextInputProps) => {
  return <Input error={error} {...props} />;
};

export default TextInput;
