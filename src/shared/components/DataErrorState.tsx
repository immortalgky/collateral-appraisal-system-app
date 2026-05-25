import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Button from './Button';
import Icon from './Icon';

interface DataErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: 'page' | 'inline';
}

const DataErrorState = ({ title, message, onRetry, variant = 'page' }: DataErrorStateProps) => {
  const { t } = useTranslation('common');

  const isPage = variant === 'page';

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center',
        isPage ? 'h-64 gap-4' : 'py-8 gap-3',
      )}
    >
      <Icon
        style="solid"
        name="triangle-exclamation"
        className={clsx('text-red-500', isPage ? 'size-12' : 'size-8')}
      />
      <p className={clsx(isPage ? 'text-gray-600' : 'text-sm text-gray-600')}>
        {title ?? t('status.failedToLoad', 'Failed to load data')}
      </p>
      {message && <p className="text-sm text-gray-400">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('actions.retry', 'Retry')}
        </Button>
      )}
    </div>
  );
};

export default DataErrorState;
