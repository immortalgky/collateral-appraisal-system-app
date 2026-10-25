import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useHasPermission } from '@shared/hooks/useHasPermission';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import Dropdown from '@shared/components/inputs/Dropdown';
import Switch from '@shared/components/inputs/Switch';
import Toggle from '@shared/components/inputs/Toggle';
import {
  useCreateWebhookSubscription,
  useGetWebhookEventTypes,
  useToggleWebhookSubscription,
  useUpdateWebhookSubscription,
} from '../api/webhookSubscriptions';
import PanelSection from './PanelSection';
import WebhookSecretField from './WebhookSecretField';
import type { WebhookAuthType, WebhookHttpMethod, WebhookSubscription } from '../types';

interface WebhookSubscriptionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the panel is in edit mode; otherwise create mode. */
  subscription: WebhookSubscription | null;
  /** Edit mode footer: ask the page to confirm and delete this subscription. */
  onRequestDelete: (subscription: WebhookSubscription) => void;
}

type EventScope = 'all' | 'single';

const METHOD_OPTIONS = [
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
];

const WebhookSubscriptionPanel = ({
  isOpen,
  onClose,
  subscription,
  onRequestDelete,
}: WebhookSubscriptionPanelProps) => {
  const { t } = useTranslation('webhookAdmin');
  const isEdit = subscription !== null;
  const canReveal = useHasPermission('WEBHOOK_SECRET_REVEAL');

  const [systemCode, setSystemCode] = useState('');
  const [eventScope, setEventScope] = useState<EventScope>('all');
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
  const toggleMutation = useToggleWebhookSubscription();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { reset: resetCreateMutation } = createMutation;
  const { reset: resetUpdateMutation } = updateMutation;
  // The one place the mutations are reset (a conflict message, a closed panel). Never while a request
  // is in flight: a reset detaches the observer, so onSuccess (and the panel closing) would never run.
  const resetMutations = () => {
    if (isPending) return;
    resetCreateMutation();
    resetUpdateMutation();
  };
  // Nor can the panel be closed under a request: Esc, the backdrop, X and Cancel all land here.
  const handleClose = () => {
    if (!isPending) onClose();
  };
  // Only the create panel offers a single event; the list is fetched when it opens.
  const eventTypesQuery = useGetWebhookEventTypes(isOpen && !isEdit);
  const eventTypes = eventTypesQuery.data ?? [];
  const isConflict =
    (createMutation.error as { apiError?: { status?: number } } | null)?.apiError?.status === 409;

  // This component stays mounted while the panel is closed — don't keep typed secrets in state,
  // nor in the mutations' `variables` (gcTime 0 only applies once no observer is attached). Waits out
  // a request that is still in flight.
  useEffect(() => {
    if (isOpen || isPending) return;
    setSecretKey('');
    setClientSecret('');
    resetCreateMutation();
    resetUpdateMutation();
  }, [isOpen, isPending, resetCreateMutation, resetUpdateMutation]);

  // Reset the form whenever the panel opens for a different target.
  useEffect(() => {
    if (!isOpen) return;
    setSystemCode(subscription?.systemCode ?? '');
    setEventScope('all');
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
        {
          ...connection,
          systemCode: systemCode.trim(),
          eventType: eventScope === 'single' ? eventType : undefined,
        },
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
    (isEdit || (systemCode.trim() !== '' && (eventScope === 'all' || eventType !== ''))) &&
    callbackUrl.trim() !== '' &&
    credentialsOk;

  const eventLabel = subscription?.eventType ?? t('subscriptions.catchAll');

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      width="xl"
      title={
        isEdit ? (
          <>
            {subscription.systemCode}
            <span className="ml-1.5 text-sm font-normal text-gray-500">
              ·{' '}
              <span className={subscription.eventType ? 'font-mono' : undefined}>{eventLabel}</span>
            </span>
          </>
        ) : (
          t('subscriptions.form.createTitle')
        )
      }
      subtitle={isEdit ? undefined : t('subscriptions.form.createSubtitle')}
      headerActions={
        isEdit ? (
          <Switch
            variant="primary"
            size="sm"
            label={t('subscriptions.form.active')}
            checked={subscription.isActive}
            disabled={toggleMutation.isPending}
            onChange={isActive => toggleMutation.mutate({ id: subscription.id, isActive })}
          />
        ) : undefined
      }
      footer={
        <div className="flex items-center gap-2">
          {isEdit ? (
            <Button
              variant="ghost"
              size="md"
              className="-ml-2 text-danger!"
              onClick={() => onRequestDelete(subscription)}
              disabled={isPending}
              leftIcon={<Icon name="trash" style="regular" className="text-sm" />}
            >
              {t('subscriptions.form.delete')}
            </Button>
          ) : (
            <span className="text-xs text-gray-500">{t('subscriptions.form.createNote')}</span>
          )}
          <span className="flex-1" />
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            {t('subscriptions.form.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending} isLoading={isPending}>
            {isEdit ? t('subscriptions.form.save') : t('subscriptions.form.create')}
          </Button>
        </div>
      }
    >
      {/* One disabled fieldset covers every field (and the secret box's buttons) while a request is in flight. */}
      <fieldset disabled={isPending} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0 pb-2">
        {/* The routing key is chosen once, at creation. */}
        {!isEdit && (
          <PanelSection title={t('subscriptions.form.sections.systemEvent')}>
            <div className="w-1/2">
              <Input
                label={t('subscriptions.form.systemCode')}
                required
                value={systemCode}
                onChange={e => {
                  setSystemCode(e.target.value);
                  resetMutations();
                }}
                placeholder={t('subscriptions.form.systemCodePlaceholder')}
              />
            </div>
            <fieldset>
              <legend className="mb-1 block text-xs font-medium text-gray-700">
                {t('subscriptions.form.eventScope')}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(['all', 'single'] as const).map(scope => (
                  <label
                    key={scope}
                    className={clsx(
                      'grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 rounded-lg border px-3 py-2.5',
                      eventScope === scope
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}
                  >
                    <input
                      type="radio"
                      name="webhook-event-scope"
                      className="row-span-2 mt-1 size-4 accent-primary"
                      checked={eventScope === scope}
                      onChange={() => {
                        setEventScope(scope);
                        resetMutations();
                      }}
                    />
                    <span className="text-sm font-medium text-gray-800">
                      {scope === 'all'
                        ? t('subscriptions.form.scopeAll')
                        : t('subscriptions.form.scopeSingle')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {scope === 'all'
                        ? t('subscriptions.form.scopeAllDesc')
                        : t('subscriptions.form.scopeSingleDesc')}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Dropdown
              label={t('subscriptions.form.eventType')}
              options={eventTypes.map(code => ({ value: code, label: code }))}
              value={eventType}
              onChange={(value: string | null) => {
                setEventType(value ?? '');
                resetMutations();
              }}
              disabled={eventScope === 'all'}
              placeholder={t('subscriptions.form.eventTypePlaceholder', {
                count: eventTypes.length,
              })}
              showValuePrefix={false}
              showPlaceholderOption={false}
            />
            {isConflict && (
              <p role="alert" className="text-xs text-danger">
                {t('subscriptions.form.conflict', {
                  // What was submitted, not what is typed now.
                  pair: `${createMutation.variables?.systemCode} / ${createMutation.variables?.eventType ?? t('subscriptions.catchAll')}`,
                })}
              </p>
            )}
            <p className="-mt-1 text-xs text-gray-500">
              {t('subscriptions.form.createLockedHint')}
            </p>
          </PanelSection>
        )}

        <PanelSection title={t('subscriptions.form.sections.destination')}>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-700">
              {t('subscriptions.form.callbackUrl')}
              {!isEdit && <span className="ml-0.5 text-danger">*</span>}
            </span>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
              <Dropdown
                options={METHOD_OPTIONS}
                value={httpMethod}
                onChange={(value: WebhookHttpMethod) => setHttpMethod(value)}
                showValuePrefix={false}
                showPlaceholderOption={false}
                aria-label={t('subscriptions.form.httpMethod')}
              />
              <Input
                type="url"
                value={callbackUrl}
                onChange={e => setCallbackUrl(e.target.value)}
                placeholder={t('subscriptions.form.callbackUrlPlaceholder')}
                aria-label={t('subscriptions.form.callbackUrl')}
                className="font-mono"
              />
            </div>
            {isEdit && !isTokenBearer && (
              <p className="mt-1 text-xs text-gray-500">
                {t('subscriptions.form.callbackUrlHint')}
              </p>
            )}
          </div>
        </PanelSection>

        <PanelSection title={t('subscriptions.form.sections.auth')}>
          <Toggle
            label={t('subscriptions.form.authType')}
            options={[
              t('subscriptions.form.authTypes.HMAC'),
              t('subscriptions.form.authTypes.TokenBearer'),
            ]}
            checked={isTokenBearer}
            onChange={bearer => setAuthType(bearer ? 'TokenBearer' : 'HMAC')}
          />

          {isTokenBearer ? (
            <>
              <Input
                type="url"
                label={t('subscriptions.form.tokenEndpoint')}
                required={!isEdit}
                value={tokenEndpoint}
                onChange={e => setTokenEndpoint(e.target.value)}
                placeholder={t('subscriptions.form.tokenEndpointPlaceholder')}
                className="font-mono"
              />
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start gap-3">
                <Input
                  label={t('subscriptions.form.clientId')}
                  required={!isEdit}
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="font-mono"
                />
                <WebhookSecretField
                  label={t('subscriptions.form.clientSecret')}
                  placeholder={t('subscriptions.form.clientSecretPlaceholder')}
                  hint=""
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
              </div>
              <p className="-mt-1 text-xs text-gray-500">
                {t('subscriptions.form.clientSecretHint')}
                {canReveal &&
                  hasStoredClientSecret &&
                  !replaceClientSecret &&
                  ` · ${t('subscriptions.form.revealAudited')}`}
              </p>
            </>
          ) : (
            <WebhookSecretField
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
              plaintextNote={t('subscriptions.form.secretPlaintextNote')}
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
        </PanelSection>

        {isEdit && (
          <PanelSection title={t('subscriptions.form.sections.systemEvent')}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('subscriptions.form.systemCode')}
                value={subscription.systemCode}
                disabled
                readOnly
              />
              <Input
                label={t('subscriptions.form.eventType')}
                value={subscription.eventType ?? t('subscriptions.form.scopeAll')}
                className={subscription.eventType ? 'font-mono' : undefined}
                disabled
                readOnly
              />
            </div>
            <p className="-mt-1 text-xs text-gray-500">{t('subscriptions.form.editLockedHint')}</p>
          </PanelSection>
        )}
      </fieldset>
    </SlideOverPanel>
  );
};

export default WebhookSubscriptionPanel;
