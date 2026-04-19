import Icon from '@shared/components/Icon';

type WidgetErrorProps = {
  message?: string;
  onRetry?: () => void;
};

function WidgetError({ message = 'Failed to load data', onRetry }: WidgetErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <Icon name="triangle-exclamation" style="solid" className="size-5 text-red-500" />
      </div>
      <p className="text-sm text-gray-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default WidgetError;
