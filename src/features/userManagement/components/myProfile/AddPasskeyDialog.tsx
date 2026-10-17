import { useEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import { useAuthStore } from '@features/auth/store';
import { startSignIn } from '@features/auth/utils/auth';
import {
  PASSKEY_NAME_MAX,
  PASSKEY_OPTIONS_MAX_AGE_MS,
  credentialToJson,
  useGetPasskeyRegisterOptions,
  useRegisterPasskey,
  validPasskeyName,
} from '../../api/passkeys';
import {
  PASSKEY_LIMIT_REACHED,
  PASSKEY_NAME_INVALID,
  PASSKEY_REAUTH_REQUIRED,
  PASSKEY_STATE_EXPIRED,
  passkeyDefinitelyNotSaved,
  passkeyErrorCode,
  passkeyFailureIsTransient,
  usePasskeyErrorMessage,
} from '../../api/passkeyErrors';
import { passkeysSupported, signalUnknownCredential } from '../../passkeySupport';

/** Longer than the dialog's 300 ms leave transition (Modal.tsx). */
const LEAVE_MS = 400;

// 'field': about the name, shown on the Name field. 'error': anything else that went wrong.
// 'info': nothing went wrong (a dismissed prompt, refreshed options).
type Notice = { tone: 'field' | 'error' | 'info'; text: string };

// idle; the browser's prompt is open (Cancel and close abort it); the registration is being saved
// (closing is blocked: a cancelled save would still go through).
type Phase = 'idle' | 'prompt' | 'saving';

/**
 * Add a passkey: a name, then the browser's own prompt (Touch ID, Windows Hello, a phone).
 *
 * The options are fetched when the dialog opens, not on the confirm click: Safari drops the user
 * activation across an await, and navigator.credentials.create() needs it. So the confirm handler
 * does only synchronous work before calling create().
 */
const AddPasskeyDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const errorMessage = usePasskeyErrorMessage();
  const getOptions = useGetPasskeyRegisterOptions();
  const registerPasskey = useRegisterPasskey();
  const { mutate: fetchOptions, reset: resetOptions } = getOptions;

  const [name, setName] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const prompt = useRef<AbortController | null>(null);
  const saving = useRef(false); // `phase === 'saving'`, but already true before the re-render
  const supported = passkeysSupported();
  // Whose passkey this is: the sign-in below starts from the same account, not whoever is next.
  const username = useAuthStore(state => state.user?.username);

  useEffect(() => {
    if (!isOpen || !supported) return;
    // A fresh form even when reopened before the delayed reset below has run.
    setName('');
    setNotice(null);
    fetchOptions();
  }, [isOpen, supported, fetchOptions]);

  // Start over only once the dialog has finished fading out, so the form does not change under it.
  useEffect(() => {
    if (isOpen) return;
    const id = setTimeout(() => {
      setName('');
      setNotice(null);
      resetOptions();
    }, LEAVE_MS);
    return () => clearTimeout(id);
  }, [isOpen, resetOptions]);

  // Closing during the browser prompt dismisses it. Not during the save.
  const requestClose = () => {
    if (saving.current) return;
    prompt.current?.abort();
    onClose();
  };

  const reauthRequired = passkeyErrorCode(getOptions.error) === PASSKEY_REAUTH_REQUIRED;
  const optionsError =
    getOptions.isError && !reauthRequired
      ? errorMessage(getOptions.error, t('passkeys.add.prepareFailed'))
      : null;
  // Whatever the last attempt said is moot once fresh options could not be had.
  const shownNotice = getOptions.isError ? null : notice;

  const create = async (
    options: PublicKeyCredentialCreationOptionsJSON,
    publicKey: PublicKeyCredentialCreationOptions,
    trimmed: string,
    state: string,
  ) => {
    const controller = new AbortController();
    prompt.current = controller;
    let credential: PublicKeyCredential | undefined;
    let sent = false; // has the registration request left for the server?
    try {
      // Called before any await of this handler: still inside the click's user activation.
      credential =
        ((await navigator.credentials.create({
          publicKey,
          signal: controller.signal,
        })) as PublicKeyCredential | null) ?? undefined;
      if (!credential) throw new DOMException('no credential was made', 'NotSupportedError');
      // The ref, not only the state: Cancel or Esc before the re-render still sees the save coming.
      saving.current = true;
      setPhase('saving');
      const credentialJson = credentialToJson(credential);
      sent = true;
      await registerPasskey.mutateAsync({ state, name: trimmed, credential: credentialJson });
      toast.success(t('passkeys.toasts.added'));
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // closed: say nothing
      // The authenticator made a credential the server will not have: have the provider drop it.
      // That is when the request never left, or the API refused it for a reason we know of; after a
      // network error or a 5xx the save may have gone through.
      if (credential && (!sent || passkeyDefinitelyNotSaved(err))) {
        signalUnknownCredential(options.rp.id ?? window.location.hostname, credential.id);
      }
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          // The user dismissed the prompt (or it timed out): nothing went wrong, so no red error.
          setNotice({ tone: 'info', text: t('passkeys.add.cancelled') });
        } else {
          // InvalidStateError: this authenticator already holds a passkey for the account.
          const key =
            err.name === 'InvalidStateError'
              ? 'passkeys.errors.alreadyRegistered'
              : 'passkeys.add.createFailed';
          setNotice({ tone: 'error', text: t(key) });
        }
      } else {
        setNotice({
          tone: passkeyErrorCode(err) === PASSKEY_NAME_INVALID ? 'field' : 'error',
          text: errorMessage(err, t('passkeys.toasts.addFailed')),
        });
        // The next try needs fresh options when the sealed state ran out; when the limit was hit
        // meanwhile (the refetch then fails with it, which also turns the submit button off); and
        // after an unclear failure (no answer, a 5xx), since the passkey may have been saved: a
        // retry must then list it in excludeCredentials.
        const code = passkeyErrorCode(err);
        if (
          code === PASSKEY_STATE_EXPIRED ||
          code === PASSKEY_LIMIT_REACHED ||
          passkeyFailureIsTransient(err)
        ) {
          fetchOptions();
        }
      }
    } finally {
      prompt.current = null;
      saving.current = false;
      setPhase('idle');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const registration = getOptions.data;
    if (!registration || phase !== 'idle') return;
    const trimmed = name.trim();
    if (!validPasskeyName(trimmed)) {
      setNotice({ tone: 'field', text: t('passkeys.errors.nameInvalid') });
      return;
    }
    if (Date.now() - registration.issuedAt > PASSKEY_OPTIONS_MAX_AGE_MS) {
      // create() on expired options would leave an orphan passkey in the user's keychain that the
      // API then refuses. It has to start inside this click (Safari), so a refresh cannot be awaited
      // here: fetch fresh options and ask for one more click.
      fetchOptions();
      setNotice({ tone: 'info', text: t('passkeys.add.refreshed') });
      return;
    }
    let publicKey: PublicKeyCredentialCreationOptions;
    try {
      publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(registration.options);
    } catch {
      setNotice({ tone: 'error', text: t('passkeys.add.createFailed') });
      return;
    }
    setPhase('prompt');
    setNotice(null);
    void create(registration.options, publicKey, trimmed, registration.state);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      title={t('passkeys.add.title')}
      size="sm"
      showCloseButton={phase !== 'saving'}
    >
      {!supported ? (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-sm text-gray-700">
            {t('passkeys.add.unsupported')}
          </p>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={requestClose}>
              {t('common:actions.close')}
            </Button>
          </div>
        </div>
      ) : reauthRequired ? (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-sm text-gray-700">
            {t('passkeys.add.reauthBody')}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={requestClose}>
              {t('common:actions.cancel')}
            </Button>
            {/* Back to the profile; the sign-in is interactive, which resets the 10-minute window. */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => startSignIn('/profile', { loginHint: username })}
            >
              {t('passkeys.add.reauthButton')}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">{t('passkeys.add.hint')}</p>
          <Input
            label={t('passkeys.add.nameLabel')}
            type="text"
            autoComplete="off"
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus -- the dialog exists only to name the passkey
            maxLength={PASSKEY_NAME_MAX}
            value={name}
            onChange={e => {
              setName(e.target.value);
              setNotice(null);
            }}
            placeholder={t('passkeys.add.namePlaceholder')}
            helperText={t('passkeys.add.nameHint')}
            error={shownNotice?.tone === 'field' ? shownNotice.text : undefined}
          />
          {/* The Input's error text is not a live region; this mirrors it for screen readers. */}
          {shownNotice?.tone === 'field' && (
            <p role="alert" className="sr-only">
              {shownNotice.text}
            </p>
          )}
          {shownNotice?.tone === 'error' && (
            <p role="alert" className="text-sm text-danger">
              {shownNotice.text}
            </p>
          )}
          {shownNotice?.tone === 'info' && (
            <p role="status" className="text-sm text-gray-600">
              {shownNotice.text}
            </p>
          )}
          {optionsError && (
            <div className="flex items-center justify-between gap-3">
              <p role="alert" className="text-sm text-danger">
                {optionsError}
              </p>
              {/* No answer or a server fault may pass; a refusal (the limit, say) will not. */}
              {passkeyFailureIsTransient(getOptions.error) && (
                <Button variant="outline" size="xs" onClick={() => fetchOptions()}>
                  {t('passkeys.add.retry')}
                </Button>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={phase === 'saving'} onClick={requestClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={phase !== 'idle' || getOptions.isPending}
              disabled={!getOptions.data || !name.trim()}
            >
              {t('passkeys.add.submit')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AddPasskeyDialog;
