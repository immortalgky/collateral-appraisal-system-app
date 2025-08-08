import clsx from 'clsx';
import { useRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface FileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

const FileInput = ({ children, fullWidth = true, ...props }: FileInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  return (
    <div className={clsx(fullWidth && 'w-full')}>
      <input type="file" ref={fileInputRef} multiple className="hidden" {...props} />
      <button type="button" onClick={handleClick} className='w-full'>
        {children}
      </button>
    </div>
  );
};

export default FileInput;
