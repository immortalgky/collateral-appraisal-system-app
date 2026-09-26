import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import { useHasPermission } from '@shared/hooks/useHasPermission';
import {
  useCreateWebhookSubscription,
  useRevealWebhookSecret,
  useUpdateWebhookSubscription,
} from '../api/webhookSubscriptions';
import type {
  WebhookAuthType,
  WebhookHttpMethod,
  WebhookSecretField,
  WebhookSubscription,
} from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the modal is in edit mode; otherwise create mode. */
  subscription: WebhookSubscription | null;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

interface SecretInputProps {
  label: string;
  placeholder: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  /** Edit mode with a secret already stored: show "set" + reveal/replace instead of an input. */
  stored: boolean;
  /** The stored secret predates encryption (plaintext row) — warn so the admin re-enters it. */
  storedPlaintext: boolean;
  /** Shown above the input when a stored secret must be re-entered (e.g. its endpoint changed). */
  reenterNote?: string;
  replacing: boolean;
  onReplace: () => void;
  /** Back out of a replacement and keep the stored secret. */
  onKeep: () => void;
  subscriptionId: string | null;
  field: WebhookSecretField;
}

/**
 * A write-only secret field. With a stored secret it shows "Set" and, for holders of
 * WEBHOOK_SECRET_REVEAL, an audited reveal. The revealed value lives in this component's state and
 * the reveal mutation's `data`; Hide/Replace/a stored-secret change clear both, and closing the modal
 * unmounts them (the Headless UI Dialog unmounts its content; the mutation has gcTime 0).
 */
const SecretInput = ({
  label,
  placeholder,
  hint,
  value,
  onChange,
  stored,
  storedPlaintext,
  reenterNote,
  replacing,
  onReplace,
  onKeep,
  subscriptionId,
  field,
}: SecretInputProps) => {
  const { t } = useTranslation('webhookAdmin');
  const canReveal = useHasPermission('WEBHOOK_SECRET_REVEAL');
  const revealMutation = useRevealWebhookSecret();
  const [revealed, setRevealed] = useState<string | null>(null);

  // Drop the plaintext as soon as the stored secret stops applying (e.g. the admin edited the token
  // endpoint): undoing that edit must not bring the value back on screen without a new audited reveal.
  const { reset: resetReveal } = revealMutation;
  useEffect(() => {
    setRevealed(null);
    resetReveal();
  }, [stored, resetReveal]);

  // Clears both copies of the plaintext: this state and the mutation observer's `data`.
  const hide = () => {
    setRevealed(null);
    revealMutation.reset();
  };

  const handleReveal = () => {
    if (!subscriptionId) return;
    revealMutation.mutate({ id: subscriptionId, field }, { onSuccess: setRevealed });
  };

  const handleCopy = () => {
    if (revealed === null) return;
    // navigator.clipboard is undefined outside a secure context (plain http); the value stays
    // selectable (select-all) so the admin can still copy it by hand.
    if (!navigator.clipboard) {
      toast.error(t('subscriptions.form.copyFailed'));
      return;
    }
    navigator.clipboard.writeText(revealed).then(
      () => toast.success(t('subscriptions.form.copied')),
      () => toast.error(t('subscriptions.form.copyFailed')),
    );
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      {stored && !replacing ? (
        <div className="rounded-lg border border-gray-200 px-3 py-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-500">
              {revealed === null ? (
                <>
                  <span className="font-mono mr-2">••••••••</span>
                  {storedPlaintext ? (
                    <span className="text-amber-700">
                      {t('subscriptions.form.secretPlaintext')}
                    </span>
                  ) : (
                    t('subscriptions.form.secretSet')
                  )}
                </>
              ) : (
                <span className="font-mono text-gray-900 break-all select-all">{revealed}</span>
              )}
            </span>
            <div className="flex shrink-0 items-center gap-3">
              {canReveal &&
                (revealed === null ? (
                  <button
                    type="button"
                    onClick={handleReveal}
                    disabled={revealMutation.isPending}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {t('subscriptions.form.reveal')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-xs text-primary hover:underline"
                    >
                      {t('subscriptions.form.copy')}
                    </button>
                    <button
                      type="button"
                      onClick={hide}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      {t('subscriptions.form.hide')}
                    </button>
                  </>
                ))}
              <button
                type="button"
                onClick={() => {
                  hide();
                  onReplace();
                }}
                className="text-xs text-primary hover:underline"
              >
                {t('subscriptions.form.replaceSecret')}
              </button>
            </div>
          </div>
          {canReveal && (
            <p className="text-xs text-gray-400">{t('subscriptions.form.revealAudited')}</p>
          )}
        </div>
      ) : (
        <>
          {reenterNote && <p className="mb-1 text-xs text-amber-700">{reenterNote}</p>}
          <input
            type="password"
            autoComplete="new-password"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${inputClass} font-mono`}
          />
          {stored && replacing && (
            <button
              type="button"
              onClick={onKeep}
              className="mt-1 text-xs text-gray-500 hover:underline"
            >
              {t('subscriptions.form.keepSecret')}
            </button>
          )}
        </>
      )}
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
};

const WebhookSubscriptionFormModal = ({ isOpen, onClose, subscription }: Props) => {
  const { t } = useTranslation('webhookAdmin');
  const isEdit = subscription !== null;

  const [systemCode, setSystemCode] = useState('');
  const [eventType, setEventType] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState<WebhookHttpMethod>('POST');
  const [authType, setAuthType] = useState<WebhookAuthType>('HMAC');
  const [tokenEndpoint, setTokenEndpoint] = useState('');
  const [clientId, setClientId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  // In edit mode a stored secret stays unless the admin opts to replace it.
  const [replaceSecretKey, setReplaceSecretKey] = useState(false);
  const [replaceClientSecret, setReplaceClientSecret] = useState(false);

  const createMutation = useCreateWebhookSubscription();
  const updateMutation = useUpdateWebhookSubscription();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { reset: resetCreate } = createMutation;
  const { reset: resetUpdate } = updateMutation;

  // Reset the form whenever the modal opens for a different target.
  useEffect(() => {
    if (!isOpen) {
      // This component stays mounted while the modal is closed — don't keep typed secrets in state,
      // nor in the mutations' `variables` (gcTime 0 only applies once no observer is attached).
      setSecretKey('');
      setClientSecret('');
      resetCreate();
      resetUpdate();
      return;
    }
    setSystemCode(subscription?.systemCode ?? '');
    setEventType(subscription?.eventType ?? '');
    setCallbackUrl(subscription?.callbackUrl ?? '');
    setHttpMethod(subscription?.httpMethod ?? 'POST');
    setAuthType(subscription?.authType ?? 'HMAC');
    setTokenEndpoint(subscription?.tokenEndpoint ?? '');
    setClientId(subscription?.clientId ?? '');
    setSecretKey('');
    setClientSecret('');
    setReplaceSecretKey(false);
    setReplaceClientSecret(false);
    // Key on subscription?.id, not the object: a background refetch of the list passes a new object
    // with the same id and must not re-fire this effect and wipe the user's in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, subscription?.id]);

  const isTokenBearer = authType === 'TokenBearer';
  // Likewise for HMAC: the backend won't keep the stored SecretKey once CallbackUrl changes.
  const callbackChanged = isEdit && callbackUrl.trim() !== subscription.callbackUrl;
  const hasStoredSecretKey = isEdit && subscription.hasSecretKey && !callbackChanged;
  // The backend refuses to keep a stored ClientSecret once TokenEndpoint, ClientId or CallbackUrl
  // changes — otherwise an editor could redirect the secret or a fresh bearer token to their own host.
  const tokenTargetChanged =
    isEdit &&
    (tokenEndpoint.trim() !== (subscription.tokenEndpoint ?? '') ||
      clientId.trim() !== (subscription.clientId ?? '') ||
      callbackUrl.trim() !== subscription.callbackUrl);
  const hasStoredClientSecret = isEdit && subscription.hasClientSecret && !tokenTargetChanged;
  // A secret must be typed when none is stored, or when the admin chose to replace it.
  const needsSecretKey = !hasStoredSecretKey || replaceSecretKey;
  const needsClientSecret = !hasStoredClientSecret || replaceClientSecret;

  const handleSubmit = () => {
    const connection = {
      callbackUrl: callbackUrl.trim(),
      httpMethod,
      authType,
      tokenEndpoint: isTokenBearer ? tokenEndpoint.trim() : undefined,
      clientId: isTokenBearer ? clientId.trim() : undefined,
      secretKey: !isTokenBearer && needsSecretKey && secretKey ? secretKey : undefined,
      clientSecret: isTokenBearer && needsClientSecret && clientSecret ? clientSecret : undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id: subscription.id, request: connection }, { onSuccess: onClose });
    } else {
      createMutation.mutate(
        { ...connection, systemCode: systemCode.trim(), eventType: eventType.trim() || undefined },
        { onSuccess: onClose },
      );
    }
  };

  const credentialsOk = isTokenBearer
    ? tokenEndpoint.trim() !== '' &&
      clientId.trim() !== '' &&
      (!needsClientSecret || clientSecret.trim() !== '')
    : !needsSecretKey || secretKey.trim() !== '';
  const canSubmit =
    (isEdit || systemCode.trim() !== '') && callbackUrl.trim() !== '' && credentialsOk;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('subscriptions.form.editTitle') : t('subscriptions.form.createTitle')}
      size="md"
    >
      <div className="px-6 py-5 space-y-4">
        {/* System code + event type: the routing key, fixed after creation */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('subscriptions.form.systemCode')}</label>
            <input
              type="text"
              value={systemCode}
              disabled={isEdit}
              onChange={e => setSystemCode(e.target.value)}
              placeholder={t('subscriptions.form.systemCodePlaceholder')}
              className={`${inputClass} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
            />
          </div>
          <div>
            <label className={labelClass}>{t('subscriptions.form.eventType')}</label>
            <input
              type="text"
              value={eventType}
              disabled={isEdit}
              onChange={e => setEventType(e.target.value)}
              placeholder={
                isEdit ? t('subscriptions.catchAll') : t('subscriptions.form.eventTypePlaceholder')
              }
              className={`${inputClass} font-mono ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-gray-400">
          {isEdit
            ? t('subscriptions.form.systemCodeLocked')
            : t('subscriptions.form.eventTypeHint')}
        </p>

        {/* Callback URL + method */}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className={labelClass}>{t('subscriptions.form.callbackUrl')}</label>
            <input
              type="url"
              value={callbackUrl}
              onChange={e => setCallbackUrl(e.target.value)}
              placeholder="https://example.com/webhooks/cas"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('subscriptions.form.httpMethod')}</label>
            <select
              value={httpMethod}
              onChange={e => setHttpMethod(e.target.value as WebhookHttpMethod)}
              className={inputClass}
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
        </div>

        {/* Auth type */}
        <div>
          <label className={labelClass}>{t('subscriptions.form.authType')}</label>
          <select
            value={authType}
            onChange={e => setAuthType(e.target.value as WebhookAuthType)}
            className={inputClass}
          >
            <option value="HMAC">{t('subscriptions.form.authTypes.HMAC')}</option>
            <option value="TokenBearer">{t('subscriptions.form.authTypes.TokenBearer')}</option>
          </select>
        </div>

        {isTokenBearer ? (
          <>
            <div>
              <label className={labelClass}>{t('subscriptions.form.tokenEndpoint')}</label>
              <input
                type="url"
                value={tokenEndpoint}
                onChange={e => setTokenEndpoint(e.target.value)}
                placeholder="https://example.com/api/auth/token"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('subscriptions.form.clientId')}</label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <SecretInput
              label={t('subscriptions.form.clientSecret')}
              placeholder={t('subscriptions.form.clientSecretPlaceholder')}
              hint={t('subscriptions.form.clientSecretHint')}
              value={clientSecret}
              onChange={value => {
                setClientSecret(value);
                // Typing a secret is a replacement: keep the input and send it even if the admin
                // later undoes the endpoint/URL change that made the field appear.
                if (value) setReplaceClientSecret(true);
              }}
              stored={hasStoredClientSecret}
              storedPlaintext={isEdit && !subscription.clientSecretEncrypted}
              reenterNote={
                tokenTargetChanged && subscription?.hasClientSecret
                  ? t('subscriptions.form.clientSecretReenter')
                  : undefined
              }
              replacing={replaceClientSecret}
              onReplace={() => setReplaceClientSecret(true)}
              onKeep={() => {
                setClientSecret('');
                setReplaceClientSecret(false);
              }}
              subscriptionId={subscription?.id ?? null}
              field="ClientSecret"
            />
          </>
        ) : (
          <SecretInput
            label={t('subscriptions.form.secretKey')}
            placeholder={t('subscriptions.form.secretKeyPlaceholder')}
            hint={t('subscriptions.form.secretKeyHint')}
            value={secretKey}
            onChange={value => {
              setSecretKey(value);
              if (value) setReplaceSecretKey(true);
            }}
            stored={hasStoredSecretKey}
            storedPlaintext={isEdit && !subscription.secretKeyEncrypted}
            reenterNote={
              callbackChanged && subscription?.hasSecretKey
                ? t('subscriptions.form.secretKeyReenter')
                : undefined
            }
            replacing={replaceSecretKey}
            onReplace={() => setReplaceSecretKey(true)}
            onKeep={() => {
              setSecretKey('');
              setReplaceSecretKey(false);
            }}
            subscriptionId={subscription?.id ?? null}
            field="SecretKey"
          />
        )}
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
