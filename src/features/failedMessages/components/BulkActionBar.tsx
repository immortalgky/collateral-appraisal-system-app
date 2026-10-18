import { useTranslation } from 'react-i18next';

interface BulkActionBarProps {
  source: 'consumer' | 'outbox';
  count: number;
  onRetry: () => void;
  onDiscard: () => void;
  onResend: () => void;
  onClear: () => void;
  // Disables the action buttons (not "clear") while the active list's last poll failed — acting on a
  // selection computed from stale data risks retrying/discarding/resending the wrong rows.
  disabled?: boolean;
}

const BulkActionBar = ({
  source,
  count,
  onRetry,
  onDiscard,
  onResend,
  onClear,
  disabled,
}: BulkActionBarProps) => {
  const { t } = useTranslation('failedMessages');

  if (count === 0) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[18px] z-20 max-w-[calc(100%-32px)] flex items-center gap-2.5 flex-wrap rounded-[14px] border border-base-300 bg-base-100/80 backdrop-blur-md shadow-lg px-4 py-2">
      <span className="text-[13px]">{t('bulkBar.selected', { count })}</span>
      {source === 'outbox' ? (
        <button
          type="button"
          onClick={onResend}
          disabled={disabled}
          className="rounded-lg bg-primary text-primary-content text-[13px] font-medium px-3 py-1.5 disabled:opacity-50"
        >
          {t('bulkBar.resend')}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onRetry}
            disabled={disabled}
            className="rounded-lg bg-primary text-primary-content text-[13px] font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {t('bulkBar.retry')}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={disabled}
            className="rounded-lg border border-red-300 text-red-600 text-[13px] font-medium px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
          >
            {t('bulkBar.discard')}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onClear}
        className="text-[13px] text-base-content/60 px-2 py-1.5"
      >
        {t('bulkBar.clear')}
      </button>
    </div>
  );
};

export default BulkActionBar;
