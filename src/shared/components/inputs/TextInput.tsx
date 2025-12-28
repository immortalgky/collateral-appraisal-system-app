import { type InputHTMLAttributes } from 'react';
import Input from '../Input';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  readonly?: boolean;
  error?: string;
  /** Show character count when maxLength is set */
  showCharCount?: boolean;
}

const TextInput = ({ error, showCharCount, ...props }: TextInputProps) => {
  return <Input error={error} showCharCount={showCharCount} {...props} />;
};

export default TextInput;
