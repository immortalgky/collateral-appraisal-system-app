import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';

type WidgetErrorProps = {
  message?: string;
  onRetry?: () => void;
};

function WidgetError({ message, onRetry }: WidgetErrorProps) {
  const { t } = useTranslation('dashboard');
  const displayMessage = message ?? t('widgetError.defaultMessage');

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-(--palette-req-wash) flex items-center justify-center">
        <Icon name="triangle-exclamation" style="solid" className="size-5 text-red-500" />
      </div>
      <p className="text-sm text-(--palette-gray-600)">{displayMessage}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {t('widgetError.retry')}
        </button>
      )}
    </div>
  );
}

export default WidgetError;
