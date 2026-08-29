import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import TextInput from '@shared/components/inputs/TextInput';
import { useUpdateProfile } from '../../api/users';
import type { UserProfile } from '../../types';
import ProfileSection from './ProfileSection';
import ReadOnlyField from './ReadOnlyField';

interface ProfileInfoTabProps {
  me: UserProfile;
  isLdap: boolean;
}

const toForm = (me: UserProfile) => ({
  firstName: me.firstName,
  lastName: me.lastName,
  position: me.position ?? '',
  department: me.department ?? '',
});

/**
 * Editable identity fields. For LDAP accounts everything here is read-only:
 * SyncLdapAttributesAsync overwrites first/last name, email, department and
 * position from Active Directory on every sign-in, so an edit would silently
 * disappear at the user's next login.
 */
const ProfileInfoTab = ({ me, isLdap }: ProfileInfoTabProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState(() => toForm(me));

  const updateField = (key: keyof ReturnType<typeof toForm>, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Compare trimmed: handleSave sends trimmed values, so an untrimmed field would
  // otherwise stay "dirty" forever after a successful save.
  const isDirty =
    form.firstName.trim() !== me.firstName ||
    form.lastName.trim() !== me.lastName ||
    form.position.trim() !== (me.position ?? '') ||
    form.department.trim() !== (me.department ?? '');

  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error(t('validation.firstAndLastNameRequired'));
      return;
    }
    updateProfile.mutate(
      {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        // UpdateProfileCommandHandler assigns every field unconditionally, so leaving
        // avatarUrl out of the payload would null the user's stored avatar.
        avatarUrl: me.avatarUrl ?? null,
        position: form.position.trim() || null,
        department: form.department.trim() || null,
      },
      {
        onSuccess: () => toast.success(t('toasts.profileUpdated')),
        onError: () => toast.error(t('toasts.profileUpdateFailed')),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {isLdap && (
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
          <Icon name="circle-info" style="solid" className="mt-0.5 size-4 shrink-0" />
          <p>{t('myProfile.ldapManaged')}</p>
        </div>
      )}

      <ProfileSection icon="id-card" color="blue" title={t('sections.general')}>
        {isLdap ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyField label={t('fields.firstName')} value={me.firstName} />
            <ReadOnlyField label={t('fields.lastName')} value={me.lastName} />
            <ReadOnlyField label={t('fields.position')} value={me.position} />
            <ReadOnlyField label={t('fields.department')} value={me.department} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label={t('fields.firstName')}
                value={form.firstName}
                onChange={e => updateField('firstName', e.currentTarget.value)}
                required
                maxLength={100}
                placeholder={t('placeholders.firstName')}
              />
              <TextInput
                label={t('fields.lastName')}
                value={form.lastName}
                onChange={e => updateField('lastName', e.currentTarget.value)}
                required
                maxLength={100}
                placeholder={t('placeholders.lastName')}
              />
              <TextInput
                label={t('fields.position')}
                value={form.position}
                onChange={e => updateField('position', e.currentTarget.value)}
                maxLength={100}
                placeholder={t('placeholders.position')}
              />
              <TextInput
                label={t('fields.department')}
                value={form.department}
                onChange={e => updateField('department', e.currentTarget.value)}
                maxLength={100}
                placeholder={t('placeholders.department')}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setForm(toForm(me))}
                disabled={!isDirty || updateProfile.isPending}
              >
                {t('common:actions.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={updateProfile.isPending}
                disabled={!isDirty}
              >
                {t('common:actions.save')}
              </Button>
            </div>
          </>
        )}
      </ProfileSection>

      {/* Fields only an administrator can change. Shown so the user can quote
          them when raising a request rather than guessing. */}
      <ProfileSection icon="lock" color="slate" title={t('myProfile.managedByAdmin')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField label={t('fields.username')} value={me.username} />
          <ReadOnlyField label={t('fields.email')} value={me.email} />
          <ReadOnlyField label={t('fields.employeeId')} value={me.employeeId} />
          <ReadOnlyField label={t('fields.aoCode')} value={me.aoCode} />
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('myProfile.contactAdminToChange')}
        </p>
      </ProfileSection>
    </div>
  );
};

export default ProfileInfoTab;
