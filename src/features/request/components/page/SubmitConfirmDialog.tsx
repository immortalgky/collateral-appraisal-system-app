import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Icon from '@/shared/components/Icon';

interface SubmitConfirmDialogProps {
  /** What the request holds right now; null keeps the dialog closed. */
  counts: { customers: number; properties: number; titles: number; files: number } | null;
  onClose: () => void;
  onConfirm: () => void;
}

/** Last look before Submit: what is about to be sent, and that it can only be edited if sent back. */
const SubmitConfirmDialog = ({ counts, onClose, onConfirm }: SubmitConfirmDialogProps) => {
  const { t } = useTranslation(['request', 'common']);
  const cells = counts && [
    [counts.customers, t('page.submit.customers')],
    [counts.properties, t('page.submit.properties')],
    [counts.titles, t('page.submit.titles')],
    [counts.files, t('page.submit.files')],
  ];

  return (
    <ConfirmDialog
      isOpen={counts !== null}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('page.submit.title')}
      confirmText={t('page.submit.confirm')}
      cancelText={t('common:actions.cancel')}
      variant="primary"
    >
      <p className="mb-3 text-sm text-(--palette-gray-500)">{t('page.submit.message')}</p>
      <dl className="mb-3 grid grid-cols-4 gap-2">
        {cells?.map(([n, label]) => (
          <div key={label} className="rounded-lg bg-(--palette-surface-2) px-2 py-2">
            <dd className="text-base font-semibold text-(--palette-ink)">{n}</dd>
            <dt className="text-xs text-(--palette-gray-500)">{label}</dt>
          </div>
        ))}
      </dl>
      <p className="flex items-start gap-1.5 rounded-lg bg-(--palette-warn-wash) px-3 py-2 text-left text-xs text-(--palette-warn)">
        <Icon style="solid" name="circle-info" className="mt-0.5 size-3! shrink-0" />
        {t('page.submit.warning')}
      </p>
    </ConfirmDialog>
  );
};

export default SubmitConfirmDialog;
