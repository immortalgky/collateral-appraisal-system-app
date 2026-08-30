import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { formatLocaleDateTime } from '@shared/utils/dateUtils';
import ChangePasswordModal from '../ChangePasswordModal';
import type { UserProfile } from '../../types';
import ProfileSection from './ProfileSection';
import ReadOnlyField from './ReadOnlyField';

interface ProfileSecurityTabProps {
  me: UserProfile;
  isLdap: boolean;
}

const ProfileSecurityTab = ({ me, isLdap }: ProfileSecurityTabProps) => {
  const { t, i18n } = useTranslation(['userManagement', 'common']);
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <ProfileSection icon="shield-halved" color="rose" title={t('sections.security')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label={t('fields.authSource')}
            value={isLdap ? t('fields.authSourceLdap') : t('fields.authSourceLocal')}
          />
          <ReadOnlyField
            label={t('fields.status')}
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`size-1.5 rounded-full ${me.isActive ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                {me.isActive ? t('status.active') : t('status.inactive')}
              </span>
            }
          />
          <ReadOnlyField
            label={t('fields.lastLogin')}
            value={me.lastLoginAt ? formatLocaleDateTime(me.lastLoginAt, i18n.language) : null}
          />
          <ReadOnlyField
            label={t('myProfile.passwordChangedAt')}
            value={
              me.passwordChangedAt
                ? formatLocaleDateTime(me.passwordChangedAt, i18n.language)
                : null
            }
          />
        </div>
      </ProfileSection>

      <ProfileSection icon="key" color="amber" title={t('myProfile.password')}>
        {isLdap ? (
          // The backend rejects a password change for non-local accounts, so the
          // button is not rendered at all rather than failing on click.
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('myProfile.passwordManagedByAd')}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('myProfile.passwordHint')}
            </p>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Icon name="key" style="regular" className="size-3.5" />}
              onClick={() => setChangingPassword(true)}
            >
              {t('buttons.changePassword')}
            </Button>
          </div>
        )}
      </ProfileSection>

      <ProfileSection icon="clock-rotate-left" color="slate" title={t('myProfile.session')}>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('myProfile.sessionPolicy')}</p>
      </ProfileSection>

      <ChangePasswordModal
        isOpen={changingPassword}
        onClose={() => setChangingPassword(false)}
        userId={me.id}
      />
    </div>
  );
};

export default ProfileSecurityTab;
