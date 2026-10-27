import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { saveBlob } from '@shared/utils/saveBlob';
import { copyToClipboard } from '@shared/utils/clipboard';

interface RecoveryCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The freshly issued codes. Shown once and held by the caller's state only, never in a query cache. */
  codes: string[];
}

/**
 * One-time reveal of the recovery codes (same contract as AccessWindowPasswordModal): the server
 * keeps only hashes, so the only way out is the "I saved them" checkbox. Closing via Esc or the
 * backdrop is blocked until it is ticked.
 */
const RecoveryCodesModal = ({ isOpen, onClose, codes }: RecoveryCodesModalProps) => {
  const { t } = useTranslation(['userManagement']);
  const [confirmed, setConfirmed] = useState(false);

  const handleClose = () => {
    if (!confirmed) return;
    setConfirmed(false);
    onClose();
  };

  const copyAll = () =>
    copyToClipboard(
      codes.join('\n'),
      () => toast.success(t('twoFactor.recovery.copied')),
      () => toast.error(t('twoFactor.recovery.copyFailed')),
    );

  const download = () =>
    saveBlob(new Blob([codes.join('\n') + '\n'], { type: 'text/plain' }), 'recovery-codes.txt');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('twoFactor.recovery.title')}
      size="sm"
      showCloseButton={false}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="size-5! text-amber-500 mt-0.5"
          />
          <p className="text-sm text-amber-800">{t('twoFactor.recovery.warning')}</p>
        </div>

        <ul className="grid grid-cols-2 gap-2" aria-label={t('twoFactor.recovery.title')}>
          {codes.map(code => (
            <li
              key={code}
              className="font-mono text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 text-center select-all"
            >
              {code}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Icon name="copy" style="regular" className="size-3.5!" />}
            onClick={copyAll}
          >
            {t('twoFactor.recovery.copyAll')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Icon name="download" style="regular" className="size-3.5!" />}
            onClick={download}
          >
            {t('twoFactor.recovery.download')}
          </Button>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary/30"
          />
          {t('twoFactor.recovery.confirmCheckbox')}
        </label>

        <div className="flex justify-end">
          <Button onClick={handleClose} disabled={!confirmed}>
            {t('twoFactor.recovery.done')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RecoveryCodesModal;
