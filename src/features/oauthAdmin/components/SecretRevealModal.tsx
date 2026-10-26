import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useCopied } from '../hooks/useCopied';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId: string;
  secret: string;
  /** Whether this secret came from a create or a rotate, to pick the right copy. */
  variant: 'created' | 'rotated';
}

const valueClass =
  'flex items-center gap-2 rounded-lg border border-(--palette-line) bg-(--palette-surface-2) py-1.5 pr-1.5 pl-3';

/**
 * One-time display of a freshly minted client secret. The secret is never retrievable again, so
 * the modal hides the header close (X), leads with a warning and keeps "Done" disabled until the
 * admin confirms the secret is stored. (Backdrop/Esc still dismiss, per the shared Modal.)
 */
const SecretRevealModal = ({ isOpen, onClose, clientName, clientId, secret, variant }: Props) => {
  const { t } = useTranslation('oauthAdmin');
  const [secretCopied, copySecret] = useCopied();
  const [idCopied, copyId] = useCopied();
  const [stored, setStored] = useState(false);

  const handleClose = () => {
    setStored(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('clients.secret.title', { name: clientName })}
      size="md"
      showCloseButton={false}
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="-mt-2 text-xs text-(--palette-ink-2)">
          {variant === 'created' ? t('clients.secret.createdSub') : t('clients.secret.rotatedSub')}
        </p>

        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-(--palette-warn-wash) px-3 py-2.5 dark:border-amber-500/30"
        >
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="mt-0.5 shrink-0 text-sm text-amber-500"
          />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {t('clients.secret.warning')}
          </p>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-(--palette-ink)">
            {t('clients.secret.clientId')}
          </span>
          <div className={valueClass}>
            <span className="min-w-0 flex-1 font-mono text-xs break-all text-(--palette-ink)">
              {clientId}
            </span>
            <Button variant="outline" size="sm" onClick={() => void copyId(clientId)}>
              {idCopied ? t('clients.secret.copied') : t('clients.secret.copy')}
            </Button>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-(--palette-ink)">
            {t('clients.secret.secret')}
          </span>
          <div className={valueClass}>
            <span className="min-w-0 flex-1 font-mono text-xs break-all text-(--palette-ink)">
              {secret}
            </span>
            <Button
              size="sm"
              onClick={() => void copySecret(secret)}
              leftIcon={
                <Icon name={secretCopied ? 'check' : 'copy'} style="regular" className="text-xs" />
              }
            >
              {secretCopied ? t('clients.secret.copied') : t('clients.secret.copy')}
            </Button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-(--palette-ink)">
          <input
            type="checkbox"
            checked={stored}
            onChange={e => setStored(e.target.checked)}
            className="size-4 accent-primary-700"
          />
          {t('clients.secret.stored')}
        </label>
      </div>

      <div className="flex justify-end border-t border-(--palette-line) px-6 py-3">
        <Button onClick={handleClose} disabled={!stored}>
          {t('clients.secret.done')}
        </Button>
      </div>
    </Modal>
  );
};

export default SecretRevealModal;
