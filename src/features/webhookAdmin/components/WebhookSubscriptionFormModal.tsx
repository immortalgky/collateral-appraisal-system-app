import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import {
  useCreateWebhookSubscription,
  useUpdateWebhookSubscription,
} from '../api/webhookSubscriptions';
import type { WebhookSubscription } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the modal is in edit mode; otherwise create mode. */
  subscription: WebhookSubscription | null;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

const WebhookSubscriptionFormModal = ({ isOpen, onClose, subscription }: Props) => {
  const { t } = useTranslation('webhookAdmin');
  const isEdit = subscription !== null;

  const [systemCode, setSystemCode] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  // In edit mode the existing secret stays unless the admin opts to replace it.
  const [replaceSecret, setReplaceSecret] = useState(false);

  const createMutation = useCreateWebhookSubscription();
  const updateMutation = useUpdateWebhookSubscription();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Reset the form whenever the modal opens for a different target.
  useEffect(() => {
    if (!isOpen) return;
    setSystemCode(subscription?.systemCode ?? '');
    setCallbackUrl(subscription?.callbackUrl ?? '');
    setSecretKey('');
    setReplaceSecret(false);
    // Key on subscription?.id, not the object: a background refetch of the list passes a new object
    // with the same id and must not re-fire this effect and wipe the user's in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, subscription?.id]);

  const handleSubmit = () => {
    if (isEdit) {
      updateMutation.mutate(
        {
          id: subscription!.id,
          request: {
            callbackUrl,
            secretKey: replaceSecret && secretKey ? secretKey : undefined,
          },
        },
        { onSuccess: onClose },
      );
    } else {
      createMutation.mutate(
        { systemCode, callbackUrl, secretKey },
        { onSuccess: onClose },
      );
    }
  };

  const canSubmit = isEdit
    ? callbackUrl.trim() !== '' && (!replaceSecret || secretKey.trim() !== '')
    : systemCode.trim() !== '' && callbackUrl.trim() !== '' && secretKey.trim() !== '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('subscriptions.form.editTitle') : t('subscriptions.form.createTitle')}
      size="md"
    >
      <div className="px-6 py-5 space-y-4">
        {/* System code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('subscriptions.form.systemCode')}
          </label>
          <input
            type="text"
            value={systemCode}
            disabled={isEdit}
            onChange={e => setSystemCode(e.target.value)}
            placeholder={t('subscriptions.form.systemCodePlaceholder')}
            className={`${inputClass} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          {isEdit && (
            <p className="mt-1 text-xs text-gray-400">{t('subscriptions.form.systemCodeLocked')}</p>
          )}
        </div>

        {/* Callback URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('subscriptions.form.callbackUrl')}
          </label>
          <input
            type="url"
            value={callbackUrl}
            onChange={e => setCallbackUrl(e.target.value)}
            placeholder="https://example.com/webhooks/cas"
            className={inputClass}
          />
        </div>

        {/* Secret key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('subscriptions.form.secretKey')}
          </label>

          {isEdit && !replaceSecret ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <span className="text-sm text-gray-500 font-mono">
                ••••{subscription?.secretLast4 ?? '____'}
              </span>
              <button
                type="button"
                onClick={() => setReplaceSecret(true)}
                className="text-xs text-primary hover:underline"
              >
                {t('subscriptions.form.replaceSecret')}
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder={t('subscriptions.form.secretKeyPlaceholder')}
              className={`${inputClass} font-mono`}
            />
          )}
          <p className="mt-1 text-xs text-gray-400">{t('subscriptions.form.secretKeyHint')}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          {t('subscriptions.form.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
          {isEdit ? t('subscriptions.form.save') : t('subscriptions.form.create')}
        </Button>
      </div>
    </Modal>
  );
};

export default WebhookSubscriptionFormModal;
