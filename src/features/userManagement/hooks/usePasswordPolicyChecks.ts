import { useTranslation } from 'react-i18next';
import { useGetPasswordPolicy } from '../api/users';

export interface PasswordPolicyCheck {
  key: string;
  label: string;
  passed: boolean;
}

/**
 * Evaluates a candidate password against the DB-maintained password policy and returns one check
 * per active rule plus an `allPassed` convenience flag. Mirrors the server-side DbPasswordValidator
 * complexity rules (length / character classes / unique characters). Expiry, history, and blocklist
 * are server-only and not surfaced here.
 */
export const usePasswordPolicyChecks = (password: string) => {
  const { t } = useTranslation(['userManagement']);
  const { data: policy } = useGetPasswordPolicy();

  const checks: PasswordPolicyCheck[] = policy
    ? [
        {
          key: 'length',
          label: t('passwordPolicy.minLength', { count: policy.requiredLength }),
          passed: password.length >= policy.requiredLength,
        },
        ...(policy.requireUppercase
          ? [
              {
                key: 'upper',
                label: t('passwordPolicy.requireUppercase'),
                passed: /[A-Z]/.test(password),
              },
            ]
          : []),
        ...(policy.requireLowercase
          ? [
              {
                key: 'lower',
                label: t('passwordPolicy.requireLowercase'),
                passed: /[a-z]/.test(password),
              },
            ]
          : []),
        ...(policy.requireDigit
          ? [
              {
                key: 'digit',
                label: t('passwordPolicy.requireDigit'),
                passed: /[0-9]/.test(password),
              },
            ]
          : []),
        ...(policy.requireNonAlphanumeric
          ? [
              {
                key: 'symbol',
                label: t('passwordPolicy.requireSymbol'),
                passed: /[^a-zA-Z0-9]/.test(password),
              },
            ]
          : []),
        ...(policy.requiredUniqueChars > 1
          ? [
              {
                key: 'unique',
                label: t('passwordPolicy.requireUniqueChars', { count: policy.requiredUniqueChars }),
                passed: new Set(password).size >= policy.requiredUniqueChars,
              },
            ]
          : []),
      ]
    : [];

  // Until the policy loads, don't block submission (server is the source of truth).
  const allPassed = checks.every(c => c.passed);

  return { checks, allPassed, policyLoaded: !!policy };
};
