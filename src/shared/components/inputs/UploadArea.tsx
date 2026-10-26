import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import FileInput from './FileInput';

interface UploadAreaProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  multiple?: boolean;
  supportedText?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

const UploadArea = ({
  onChange,
  accept,
  multiple,
  supportedText,
  isLoading,
  disabled,
}: UploadAreaProps) => {
  return (
    <FileInput
      onChange={onChange}
      accept={accept}
      multiple={multiple}
      disabled={disabled || isLoading}
    >
      {(isDragging: boolean) => (
        <div
          className={clsx(
            'w-full border-2 border-dashed rounded-2xl p-8 transition-all duration-200 cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
              : 'border-(--palette-line) hover:bg-(--palette-surface-2) hover:border-(--palette-line-strong)',
            isLoading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="flex flex-col items-center justify-center">
            {isLoading ? (
              <LoadingSpinner size="lg" variant="document" text="Uploading files..." />
            ) : (
              <>
                <div
                  className={clsx(
                    'w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-200',
                    isDragging
                      ? 'bg-(--palette-primary-wash) text-(--palette-primary-text) animate-bounce'
                      : 'bg-(--palette-surface-3) text-(--palette-gray-400)',
                  )}
                >
                  <Icon style="solid" name="cloud-arrow-up" className="text-2xl" />
                </div>
                <p
                  className={clsx(
                    'text-sm font-medium mb-1 transition-colors',
                    isDragging ? 'text-(--palette-primary-text)' : 'text-(--palette-gray-600)',
                  )}
                >
                  {isDragging ? 'Drop files here' : 'Click to upload'}
                </p>
                <p className="text-xs text-(--palette-gray-400)">or drag and drop files</p>
                {!isDragging && supportedText && (
                  <p className="text-xs text-(--palette-gray-400) mt-2">
                    Supported: {supportedText}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </FileInput>
  );
};

export default UploadArea;
