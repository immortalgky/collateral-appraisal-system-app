import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@shared/utils/errorUtils';

/** `errorCode` of the API's 400 for a wrong code (TwoFactorService.InvalidCodeErrorCode). */
export const INVALID_TWO_FACTOR_CODE = 'InvalidTwoFactorCode';

/** errorCodes meaning the card's idea of the 2FA state is stale, so /auth/me should be re-read. */
export const STALE_STATE_CODES = [
  'TwoFactorAlreadyEnabled',
  'TwoFactorNotEnabled',
  'TwoFactorRequiredByPolicy',
];

/**
 * Text for a failed own-2FA call: a translation for each errorCode the API sends, else the
 * server's `detail`, else `fallback`. `invalidCode` replaces the text for a wrong code.
 */
export const useTwoFactorErrorMessage = (invalidCode?: string) => {
  const { t } = useTranslation(['userManagement']);
  // A Map: errorCode comes from the server, and an object lookup would find "constructor".
  const byCode = new Map([
    [INVALID_TWO_FACTOR_CODE, invalidCode ?? t('twoFactor.errors.invalidCode')],
    ['TwoFactorLockedOut', t('twoFactor.errors.lockedOut')],
    ['TwoFactorAlreadyEnabled', t('twoFactor.errors.alreadyEnabled')],
    ['TwoFactorNotEnabled', t('twoFactor.errors.notEnabled')],
    ['TwoFactorRequiredByPolicy', t('twoFactor.errors.requiredByPolicy')],
    ['TwoFactorSaveFailed', t('twoFactor.errors.saveFailed')],
  ]);
  return (err: unknown, fallback: string) => {
    const { errorCode, detail } = extractApiError(err as AxiosError);
    return (errorCode && byCode.get(errorCode)) || detail || fallback;
  };
};
