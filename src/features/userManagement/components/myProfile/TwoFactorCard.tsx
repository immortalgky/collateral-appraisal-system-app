import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Alert from '@shared/components/Alert';
import { redirectToLogin, session } from '@features/auth/utils/auth';
import { logout } from '@features/auth/utils/logout';
import {
  useDisableTwoFactor,
  useEnableTwoFactor,
  useRegenerateRecoveryCodes,
  useSetUpNewDevice,
  useSetupTwoFactor,
} from '../../api/users';
import { useTwoFactorErrorMessage } from '../../api/twoFactorErrors';
import type { TwoFactorSetupResponse, UserProfile } from '../../types';
import ProfileSection from './ProfileSection';
import RecoveryCodesModal from './RecoveryCodesModal';
import TwoFactorCodeModal from './TwoFactorCodeModal';
import TwoFactorSetupPanel from './TwoFactorSetupPanel';

/** Longer than the dialogs' 300 ms leave transition (Modal.tsx). */
const LEAVE_MS = 400;

/**
 * Own two-factor settings. Shown for Local and LDAP accounts alike. The secrets (the key being
 * enrolled, the recovery codes) live in this component's state only and are cleared on close.
 */
const TwoFactorCard = ({ me }: { me: UserProfile }) => {
  const { t } = useTranslation(['userManagement']);
  const errorMessage = useTwoFactorErrorMessage();
  const setupTwoFactor = useSetupTwoFactor();
  const enableTwoFactor = useEnableTwoFactor();
  const disableTwoFactor = useDisableTwoFactor();
  const regenerateCodes = useRegenerateRecoveryCodes();
  const setUpNewDevice = useSetUpNewDevice();

  const [enrolling, setEnrolling] = useState<TwoFactorSetupResponse | null>(null);
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newDevice, setNewDevice] = useState(false);

  const startEnrolment = () =>
    setupTwoFactor.mutate(undefined, {
      onSuccess: data => {
        setEnrolling(data);
        setEnrolOpen(true);
        setupTwoFactor.reset();
      },
      onError: err => toast.error(errorMessage(err, t('twoFactor.setupFailed'))),
    });

  // Secrets are dropped only once their dialog has finished fading out, so the QR code and the
  // recovery codes do not vanish mid-animation.
  useEffect(() => {
    if (enrolOpen) return;
    const id = setTimeout(() => setEnrolling(null), LEAVE_MS);
    return () => clearTimeout(id);
  }, [enrolOpen]);

  // Only one dialog at a time: the code dialog closes first, the recovery codes open after it.
  const recoveryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(recoveryTimer.current), []);
  const revealRecoveryCodes = (codes: string[]) => {
    setRecoveryCodes(codes);
    clearTimeout(recoveryTimer.current);
    recoveryTimer.current = setTimeout(() => setRecoveryOpen(true), LEAVE_MS);
  };
  const closeRecoveryCodes = () => {
    setRecoveryOpen(false);
    clearTimeout(recoveryTimer.current);
    recoveryTimer.current = setTimeout(() => setRecoveryCodes(null), LEAVE_MS);
  };

  return (
    <ProfileSection icon="mobile-screen-button" color="teal" title={t('twoFactor.title')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-base-content">
            <span
              title={
                me.twoFactorEnabled ? t('twoFactor.statusOnTitle') : t('twoFactor.statusOffTitle')
              }
              className={`size-2 rounded-full ${me.twoFactorEnabled ? 'bg-green-600' : 'bg-gray-300'}`}
            />
            {me.twoFactorEnabled ? t('twoFactor.statusOn') : t('twoFactor.statusOff')}
          </span>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {me.twoFactorEnabled
              ? t('twoFactor.recoveryCodesLeft', { n: me.recoveryCodesLeft })
              : t('twoFactor.hint')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {me.twoFactorEnabled ? (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="rotate-right" style="solid" className="size-3.5!" />}
                onClick={() => setRegenerating(true)}
              >
                {t('twoFactor.regenerate.button')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="mobile-screen-button" style="solid" className="size-3.5!" />}
                onClick={() => setNewDevice(true)}
              >
                {t('twoFactor.newDevice.button')}
              </Button>
              {!me.twoFactorRequired && (
                <Button variant="danger" size="sm" onClick={() => setDisabling(true)}>
                  {t('twoFactor.disable.button')}
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              isLoading={setupTwoFactor.isPending}
              leftIcon={<Icon name="shield-halved" style="solid" className="size-3.5!" />}
              onClick={startEnrolment}
            >
              {t('twoFactor.enable.button')}
            </Button>
          )}
        </div>
      </div>

      {!me.twoFactorEnabled && me.twoFactorRequired && (
        <p className="mt-3 text-xs text-gray-500">{t('twoFactor.requiredNotEnabledNote')}</p>
      )}

      {me.twoFactorEnabled && me.twoFactorRequired && (
        <p className="mt-3 text-xs text-gray-500">{t('twoFactor.requiredNote')}</p>
      )}

      <TwoFactorCodeModal
        isOpen={enrolOpen}
        onClose={() => setEnrolOpen(false)}
        title={t('twoFactor.enable.title')}
        hint={t('twoFactor.enable.scanHint')}
        submitLabel={t('twoFactor.enable.submit')}
        onSubmit={async code => {
          const { recoveryCodes: codes } = await enableTwoFactor.mutateAsync({ code });
          enableTwoFactor.reset();
          revealRecoveryCodes(codes);
        }}
      >
        {enrolling && <TwoFactorSetupPanel setup={enrolling} />}
      </TwoFactorCodeModal>

      <TwoFactorCodeModal
        isOpen={disabling}
        onClose={() => setDisabling(false)}
        title={t('twoFactor.disable.title')}
        hint={t('twoFactor.disable.hint')}
        submitLabel={t('twoFactor.disable.submit')}
        submitVariant="danger"
        onSubmit={async code => {
          await disableTwoFactor.mutateAsync({ code });
          toast.success(t('twoFactor.disable.done'));
        }}
      />

      <TwoFactorCodeModal
        isOpen={regenerating}
        onClose={() => setRegenerating(false)}
        title={t('twoFactor.regenerate.title')}
        hint={t('twoFactor.regenerate.hint')}
        submitLabel={t('twoFactor.regenerate.submit')}
        onSubmit={async code => {
          const { recoveryCodes: codes } = await regenerateCodes.mutateAsync({ code });
          regenerateCodes.reset();
          revealRecoveryCodes(codes);
        }}
      />

      <TwoFactorCodeModal
        isOpen={newDevice}
        onClose={() => setNewDevice(false)}
        title={t('twoFactor.newDevice.title')}
        hint={t('twoFactor.newDevice.hint')}
        submitLabel={t('twoFactor.newDevice.submit')}
        submitVariant="danger"
        allowRecoveryCode
        codeLabel={t('twoFactor.newDevice.codeLabel')}
        invalidCodeMessage={t('twoFactor.newDevice.invalidCode')}
        onSubmit={async code => {
          await setUpNewDevice.mutateAsync({ code });
          // Every session, this one too, is already gone on the server: sign out the normal way (it
          // answers 200 for an ended session) so no "return to this page" or stale state is kept.
          // If that call failed (or threw) nothing navigated: go to the sign-in page, saying "signed
          // out" (not "ended", which promises saved work) since this was a deliberate reset. The
          // request itself succeeded, so nothing here may show as a code error in the modal.
          const signedOut = await logout().catch(() => false);
          if (!signedOut) {
            session.clear(); // what logout() clears on success: no per-tab state of this user survives
            try {
              redirectToLogin(null, 'signed-out');
            } catch {
              // best effort, as in logout(): the next 401 sends the user there
            }
          }
        }}
      >
        <Alert variant="warning" role="note">
          {t('twoFactor.newDevice.warning')}
        </Alert>
      </TwoFactorCodeModal>

      <RecoveryCodesModal
        isOpen={recoveryOpen}
        onClose={closeRecoveryCodes}
        codes={recoveryCodes ?? []}
      />
    </ProfileSection>
  );
};

export default TwoFactorCard;
