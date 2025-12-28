import clsx from 'clsx';
import { type InputHTMLAttributes, type ReactNode, useRef } from 'react';
import { useFormReadOnly } from '../form/context';

interface FileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

const FileInput = ({ children, fullWidth = true, disabled, ...props }: FileInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  const handleClick = () => {
    if (!isDisabled) {
      fileInputRef.current?.click();
    }
  };
  return (
    <div className={clsx(fullWidth && 'w-full')}>
      <input type="file" ref={fileInputRef} multiple className="hidden" disabled={isDisabled} {...props} />
      <button type="button" onClick={handleClick} disabled={isDisabled} className={clsx('w-full', isDisabled && 'opacity-50 cursor-not-allowed')}>
        {children}
      </button>
    </div>
  );
};

export default FileInput;
