import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  secret: string;
  /** Whether this secret came from a create or a rotate, to pick the right copy. */
  variant: 'created' | 'rotated';
}

/**
 * One-time display of a freshly minted client secret. The secret is never retrievable again,
 * so the modal hides the header close (X) and leads with a copy affordance and a warning.
 * (Backdrop/Esc still dismiss, per the shared Modal — the warning makes the stakes clear.)
 */
const SecretRevealModal = ({ isOpen, onClose, clientId, secret, variant }: Props) => {
  const { t } = useTranslation('oauthAdmin');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('clients.secret.title')} size="md" showCloseButton={false}>
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <Icon name="triangle-exclamation" style="solid" className="size-5 text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-800">
            {variant === 'created'
              ? t('clients.secret.createdIntro')
              : t('clients.secret.rotatedIntro')}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {t('clients.secret.clientId')}
          </label>
          <div className="font-mono text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 break-all">
            {clientId}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {t('clients.secret.secret')}
          </label>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 font-mono text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 break-all">
              {secret}
            </div>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Icon name={copied ? 'check' : 'copy'} style="regular" className="size-4 mr-1" />
              {copied ? t('clients.secret.copied') : t('clients.secret.copy')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end px-6 py-4 border-t border-gray-200">
        <Button onClick={onClose}>{t('clients.secret.done')}</Button>
      </div>
    </Modal>
  );
};

export default SecretRevealModal;
