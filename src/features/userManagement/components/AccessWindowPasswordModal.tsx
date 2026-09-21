import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';

interface AccessWindowPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The freshly issued password — shown once and never persisted anywhere by this component. */
  password: string;
}

/**
 * One-time reveal of the password issued when an access window is opened (mirrors
 * SecretRevealModal in oauthAdmin). Unlike that modal, the password can also be masked, and the
 * only way out is the confirm checkbox — closing via the X, backdrop, or Esc is blocked until the
 * admin has ticked "I copied this password", since it can never be retrieved again afterwards.
 */
const AccessWindowPasswordModal = ({ isOpen, onClose, password }: AccessWindowPasswordModalProps) => {
  const { t } = useTranslation(['userManagement']);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleClose = () => {
    if (!confirmed) return;
    setVisible(false);
    setCopied(false);
    setConfirmed(false);
    onClose();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('accessWindow.passwordModal.title')}
      size="sm"
      showCloseButton={false}
    >
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <Icon name="triangle-exclamation" style="solid" className="size-5 text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-800">{t('accessWindow.passwordModal.warning')}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {t('fields.password')}
          </label>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 font-mono text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 break-all">
              {visible ? password : '•'.repeat(password.length)}
            </div>
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              className="shrink-0 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label={visible ? t('buttons.hidePasswords') : t('buttons.showPasswords')}
            >
              <Icon name={visible ? 'eye-slash' : 'eye'} style="regular" className="size-4" />
            </button>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Icon name={copied ? 'check' : 'copy'} style="regular" className="size-4 mr-1" />
              {copied ? t('accessWindow.passwordModal.copied') : t('accessWindow.passwordModal.copy')}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary/30"
          />
          {t('accessWindow.passwordModal.confirmCheckbox')}
        </label>
      </div>

      <div className="flex justify-end px-6 py-4 border-t border-gray-200">
        <Button onClick={handleClose} disabled={!confirmed}>
          {t('accessWindow.passwordModal.done')}
        </Button>
      </div>
    </Modal>
  );
};

export default AccessWindowPasswordModal;
