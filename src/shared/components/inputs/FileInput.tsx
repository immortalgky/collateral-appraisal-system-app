import clsx from 'clsx';
import {
  type DragEvent,
  type InputHTMLAttributes,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useFormReadOnly } from '../form/context';

interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  children: ReactNode | ((isDragging: boolean) => ReactNode);
  fullWidth?: boolean;
  /**
   * Drop only the files that match `accept` (the default). Turn it off when the caller validates
   * what it gets and tells the user about the ones it refuses, rather than losing them silently.
   */
  filterDroppedFiles?: boolean;
}

const FileInput = ({
  children,
  fullWidth = true,
  disabled,
  onChange,
  accept,
  filterDroppedFiles = true,
  ...props
}: FileInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleClick = () => {
    if (!isDisabled) {
      fileInputRef.current?.click();
    }
  };

  const matchesAccept = useCallback(
    (file: File) => {
      if (!accept) return true;
      const acceptedTypes = accept.split(',').map(t => t.trim());
      return acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type === type;
      });
    },
    [accept],
  );

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) return;
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (isDisabled || !onChange) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => !filterDroppedFiles || matchesAccept(file),
    );
    if (droppedFiles.length === 0) return;

    // Create a synthetic change event with the filtered files
    const dt = new DataTransfer();
    droppedFiles.forEach(f => dt.items.add(f));
    const input = fileInputRef.current;
    if (input) {
      input.files = dt.files;
      const syntheticEvent = {
        target: input,
        currentTarget: input,
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
      input.value = '';
    }
  };

  return (
    <div
      className={clsx(fullWidth && 'w-full')}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        disabled={isDisabled}
        accept={accept}
        onClick={e => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={onChange}
        {...props}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={clsx('w-full', isDisabled && 'opacity-50 cursor-not-allowed')}
      >
        {typeof children === 'function' ? children(isDragging) : children}
      </button>
    </div>
  );
};

export default FileInput;
