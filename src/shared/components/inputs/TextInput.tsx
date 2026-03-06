import { type InputHTMLAttributes } from 'react';
import Input from '../Input';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  readonly?: boolean;
  error?: string;
  /** Show character count when maxLength is set */
  showCharCount?: boolean;
  /** Input mask pattern (9=digit, a=letter, *=any). Literals auto-inserted. */
  inputMask?: string;
}

/**
 * Apply an input mask to a raw value.
 * Pattern chars: 9=digit, a=letter, *=any. Others are literals.
 */
function applyMask(raw: string, mask: string): string {
  let result = '';
  let rawIdx = 0;

  for (let maskIdx = 0; maskIdx < mask.length && rawIdx < raw.length; maskIdx++) {
    const maskChar = mask[maskIdx];

    if (maskChar === '9') {
      while (rawIdx < raw.length && !/\d/.test(raw[rawIdx])) rawIdx++;
      if (rawIdx < raw.length) result += raw[rawIdx++];
      else break;
    } else if (maskChar === 'a') {
      while (rawIdx < raw.length && !/[a-zA-Z]/.test(raw[rawIdx])) rawIdx++;
      if (rawIdx < raw.length) result += raw[rawIdx++];
      else break;
    } else if (maskChar === '*') {
      result += raw[rawIdx++];
    } else {
      result += maskChar;
    }
  }

  return result;
}

function maskToPlaceholder(mask: string): string {
  return mask
    .replace(/9/g, '_')
    .replace(/a/g, '_')
    .replace(/\*/g, '_');
}

const TextInput = ({ error, showCharCount, inputMask, ...props }: TextInputProps) => {
  if (!inputMask) {
    return <Input error={error} showCharCount={showCharCount} {...props} />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyMask(e.target.value, inputMask);
    props.onChange?.({ ...e, target: { ...e.target, value: masked } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <Input
      error={error}
      showCharCount={showCharCount}
      {...props}
      maxLength={inputMask.length}
      placeholder={props.placeholder || maskToPlaceholder(inputMask)}
      onChange={handleChange}
    />
  );
};

export default TextInput;
