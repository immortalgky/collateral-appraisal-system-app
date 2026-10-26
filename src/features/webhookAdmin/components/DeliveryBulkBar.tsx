import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';

interface DeliveryBulkBarProps {
  count: number;
  onRetry: () => void;
  onClear: () => void;
  disabled?: boolean;
}

/** Floating bar for the rows ticked on the current page (Failed rows only). */
const DeliveryBulkBar = ({ count, onRetry, onClear, disabled }: DeliveryBulkBarProps) => {
  const { t } = useTranslation('webhookAdmin');
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl bg-gray-800 py-2 pr-2 pl-4 text-sm text-gray-50 shadow-lg">
      <span>{t('bulk.selected', { count })}</span>
      <Button
        size="sm"
        onClick={onRetry}
        disabled={disabled}
        leftIcon={<Icon name="rotate-right" style="regular" className="text-sm" />}
      >
        {t('bulk.retry', { count })}
      </Button>
      <Button size="sm" variant="ghost" className="text-gray-300!" onClick={onClear}>
        {t('bulk.clear')}
      </Button>
    </div>
  );
};

export default DeliveryBulkBar;
