import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Badge from '@shared/components/Badge';
import Input from '@shared/components/Input';
import { useHasPermission } from '@shared/hooks/useHasPermission';
import { copyToClipboard } from '@shared/utils/clipboard';
import { useRevealWebhookSecret } from '../api/webhookSubscriptions';
import type { WebhookSecretField as SecretFieldName } from '../types';

interface WebhookSecretFieldProps {
  label: string;
  placeholder: string;
  /** Helper line under the field; leave empty to render it elsewhere (a field in a grid cell). */
  hint: string;
  value: string;
  onChange: (value: string) => void;
  /** Edit mode with a secret already stored: show "set" + reveal/replace instead of an input. */
  stored: boolean;
  /** The stored secret predates encryption (plaintext row) — warn so the admin re-enters it. */
  storedPlaintext: boolean;
  /** Longer explanation of a plaintext secret, shown inside the box. */
  plaintextNote?: string;
  /** Shown above the input when a stored secret must be re-entered (e.g. its endpoint changed). */
  reenterNote?: string;
  replacing: boolean;
  onReplace: () => void;
  /** Back out of a replacement and keep the stored secret. */
  onKeep: () => void;
  subscriptionId: string | null;
  field: SecretFieldName;
}

const linkClass = 'text-xs font-medium text-primary hover:underline disabled:opacity-50';

/**
 * A write-only secret field. With a stored secret it shows "Set" and, for holders of
 * WEBHOOK_SECRET_REVEAL, an audited reveal. The revealed value lives in this component's state and
 * the reveal mutation's `data`; Hide/Replace/a stored-secret change clear both, and closing the panel
 * unmounts them (the Headless UI Dialog unmounts its content; the mutation has gcTime 0).
 */
const WebhookSecretField = ({
  label,
  placeholder,
  hint,
  value,
  onChange,
  stored,
  storedPlaintext,
  plaintextNote,
  reenterNote,
  replacing,
  onReplace,
  onKeep,
  subscriptionId,
  field,
}: WebhookSecretFieldProps) => {
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

  // The helper guards the missing clipboard (plain http); the value stays selectable (select-all)
  // so the admin can still copy it by hand.
  const handleCopy = () => {
    if (revealed === null) return;
    copyToClipboard(
      revealed,
      () => toast.success(t('subscriptions.form.copied')),
      () => toast.error(t('subscriptions.form.copyFailed')),
    );
  };

  return (
    <div>
      {stored && !replacing ? (
        <>
          <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
          <div
            className={
              storedPlaintext
                ? 'flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2'
                : 'flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2'
            }
          >
            <div className="flex min-h-[1.5rem] items-center gap-2.5">
              {revealed === null ? (
                <>
                  <span className="font-mono tracking-widest text-gray-500">••••••••</span>
                  <Badge
                    tone={storedPlaintext ? 'yellow' : 'green'}
                    className="whitespace-nowrap bg-white!"
                  >
                    {storedPlaintext
                      ? t('subscriptions.secretBadge.plaintext')
                      : t('subscriptions.secretBadge.encrypted')}
                  </Badge>
                </>
              ) : (
                <span className="min-w-0 select-all break-all font-mono text-sm text-gray-900">
                  {revealed}
                </span>
              )}
              <span className="flex-1" />
              {canReveal &&
                (revealed === null ? (
                  <button
                    type="button"
                    onClick={handleReveal}
                    disabled={revealMutation.isPending}
                    className={linkClass}
                  >
                    {t('subscriptions.form.reveal')}
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={handleCopy} className={linkClass}>
                      {t('subscriptions.form.copy')}
                    </button>
                    <button
                      type="button"
                      onClick={hide}
                      className="text-xs font-medium text-gray-500 hover:underline"
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
                className={linkClass}
              >
                {t('subscriptions.form.replaceSecret')}
              </button>
            </div>
            {storedPlaintext && plaintextNote && (
              <p className="text-xs text-amber-800">{plaintextNote}</p>
            )}
          </div>
        </>
      ) : (
        <>
          {reenterNote && <p className="mb-1 text-xs text-amber-700">{reenterNote}</p>}
          <Input
            type="password"
            autoComplete="new-password"
            label={label}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="font-mono"
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
      {hint && (
        <p className="mt-1 text-xs text-gray-500">
          {hint}
          {stored && !replacing && canReveal && ` · ${t('subscriptions.form.revealAudited')}`}
        </p>
      )}
    </div>
  );
};

export default WebhookSecretField;
