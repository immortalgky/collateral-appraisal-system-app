import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import { useTwoFactorErrorMessage } from '../../api/twoFactorErrors';

interface TwoFactorCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Short explanation above the code field. */
  hint?: string;
  /** Rendered between the hint and the code field (the QR code when enrolling). */
  children?: ReactNode;
  submitLabel: string;
  submitVariant?: 'primary' | 'danger';
  /**
   * Also accept an unused recovery code (like `ab12c-d34ef`), not only 6 digits: the field then takes
   * any text, and the server validates and normalises what is sent.
   */
  allowRecoveryCode?: boolean;
  /** Replaces the field's label (default: "6-digit code"). */
  codeLabel?: string;
  /** Replaces the text for a wrong code (default: the authenticator-app one). */
  invalidCodeMessage?: string;
  /** Sends the code; rejects with the failed request's error. Resolving closes the modal. */
  onSubmit: (code: string) => Promise<unknown>;
}

const CODE_LENGTH = 6;
const RECOVERY_INPUT_MAX_LENGTH = 64;

/**
 * Asks for one 6-digit authenticator code (or, with `allowRecoveryCode`, a recovery code) and sends
 * it. A wrong code comes back as a 400 ProblemDetails (never a 401, which would log the SPA out),
 * shown under the field rather than as a toast so the user can retype it without losing the dialog.
 */
const TwoFactorCodeModal = ({
  isOpen,
  onClose,
  title,
  hint,
  children,
  submitLabel,
  submitVariant = 'primary',
  allowRecoveryCode = false,
  codeLabel,
  invalidCodeMessage,
  onSubmit,
}: TwoFactorCodeModalProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const errorMessage = useTwoFactorErrorMessage(invalidCodeMessage);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // A recovery code counts only its letters and digits, so "12 34" or "ab-12c" is not enough to send.
  const complete = allowRecoveryCode
    ? code.replace(/[^a-z0-9]/gi, '').length >= CODE_LENGTH
    : code.length === CODE_LENGTH;

  const close = () => {
    setCode('');
    setError(null);
    onClose();
  };
  // Not while the code is being sent: a "cancelled" turn-off would still go through.
  const requestClose = () => {
    if (!pending) close();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!complete || pending) return;
    setPending(true);
    setError(null);
    try {
      await onSubmit(code.trim());
      close();
    } catch (err) {
      setError(errorMessage(err, t('twoFactor.errors.generic')));
      // Back to the field with the digits selected, ready to retype.
      inputRef.current?.focus();
      inputRef.current?.select();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      title={title}
      size="sm"
      showCloseButton={!pending}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {hint && <p className="text-sm text-gray-600">{hint}</p>}
        {children}
        <Input
          ref={inputRef}
          label={codeLabel ?? t('twoFactor.codeLabel')}
          type="text"
          inputMode={allowRecoveryCode ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          // Not sliced in JS: the server validates. This only stops a pasted blob from being posted.
          maxLength={allowRecoveryCode ? RECOVERY_INPUT_MAX_LENGTH : undefined}
          autoFocus // eslint-disable-line jsx-a11y/no-autofocus -- the dialog exists only to enter this code
          value={code}
          onChange={e => {
            setCode(
              allowRecoveryCode
                ? e.target.value
                : e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH),
            );
            setError(null);
          }}
          placeholder={allowRecoveryCode ? undefined : t('twoFactor.codePlaceholder')}
          error={error ?? undefined}
          className="font-mono tracking-widest"
        />
        {/* The Input's own error text is not a live region; this mirrors it for screen readers. */}
        {error && (
          <p role="alert" className="sr-only">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={pending} onClick={requestClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            variant={submitVariant}
            size="sm"
            isLoading={pending}
            disabled={!complete}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TwoFactorCodeModal;
