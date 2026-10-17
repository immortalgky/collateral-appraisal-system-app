import { isAxiosError, type AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@shared/utils/errorUtils';

/** `errorCode` of the API's 400 when the last sign-in is too old to add a passkey. */
export const PASSKEY_REAUTH_REQUIRED = 'PasskeyReauthRequired';
/** The sealed registration state ran out (or was already used): ask for fresh options. */
export const PASSKEY_STATE_EXPIRED = 'PasskeyStateExpired';

/** The user already has the maximum number of passkeys. */
export const PASSKEY_LIMIT_REACHED = 'PasskeyLimitReached';
export const PASSKEY_ALREADY_REGISTERED = 'PasskeyAlreadyRegistered';
/** The only error that belongs on the name field. */
export const PASSKEY_NAME_INVALID = 'PasskeyNameInvalid';

/** The API's `errorCode` of a failed passkey call, if it sent one. */
export const passkeyErrorCode = (err: unknown) =>
  // A mutation's `error` is null while nothing has failed.
  err ? extractApiError(err as AxiosError).errorCode : undefined;

// The 400s of POST /register that say the passkey was NOT saved. Anything else (a network error, a
// timeout, a 5xx) may have committed it, and PasskeyAlreadyRegistered means the server has it.
const NOT_SAVED_CODES = [
  PASSKEY_STATE_EXPIRED,
  'PasskeyRegistrationFailed',
  PASSKEY_LIMIT_REACHED,
  PASSKEY_NAME_INVALID,
];

/** A failure that may go away on its own (no answer, or the server broke): worth a retry button. */
export const passkeyFailureIsTransient = (err: unknown) =>
  isAxiosError(err) && (!err.response || err.response.status >= 500);

/** Did the API definitely refuse to save the passkey just registered? */
export const passkeyDefinitelyNotSaved = (err: unknown) =>
  isAxiosError(err) &&
  err.response?.status === 400 &&
  NOT_SAVED_CODES.includes(passkeyErrorCode(err) ?? '');

/**
 * Text for a failed own-passkey call: a translation for each errorCode the API sends, else the
 * server's `detail`, else `fallback`.
 */
export const usePasskeyErrorMessage = () => {
  const { t } = useTranslation(['userManagement']);
  const byCode: Record<string, string> = {
    [PASSKEY_REAUTH_REQUIRED]: t('passkeys.errors.reauthRequired'),
    [PASSKEY_STATE_EXPIRED]: t('passkeys.errors.stateExpired'),
    [PASSKEY_LIMIT_REACHED]: t('passkeys.errors.limitReached'),
    PasskeyRegistrationFailed: t('passkeys.errors.registrationFailed'),
    [PASSKEY_ALREADY_REGISTERED]: t('passkeys.errors.alreadyRegistered'),
    [PASSKEY_NAME_INVALID]: t('passkeys.errors.nameInvalid'),
  };
  return (err: unknown, fallback: string) => {
    const { errorCode, detail } = extractApiError(err as AxiosError);
    return (errorCode && byCode[errorCode]) || detail || fallback;
  };
};
