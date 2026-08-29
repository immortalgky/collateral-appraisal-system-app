import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { useLocalizedCompanyName } from '@shared/utils/companyName';
import type { UserRole } from '@shared/config/navigationTypes';
import { allRoles, getRoleDisplayName } from '../../roleMeta';
import type { UserProfile } from '../../types';
import ProfileSection from './ProfileSection';

interface ProfileAccessTabProps {
  me: UserProfile;
}

/**
 * /auth/me hands back raw role names. Resolve a display label for the ones we
 * know and show the raw string for anything the backend adds later.
 */
const isKnownRole = (role: string): role is UserRole => (allRoles as string[]).includes(role);
const roleLabel = (role: string) => (isKnownRole(role) ? getRoleDisplayName(role) : role);

const Pill = ({
  tone,
  dot,
  children,
}: {
  tone: string;
  dot: string;
  children: React.ReactNode;
}) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${tone}`}
  >
    <span className={`size-1.5 rounded-full ${dot}`} />
    {children}
  </span>
);

const ProfileAccessTab = ({ me }: ProfileAccessTabProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const localizeCompanyName = useLocalizedCompanyName();
  const [permissionSearch, setPermissionSearch] = useState('');

  const permissions = useMemo(() => {
    const sorted = [...me.permissions].sort((a, b) => a.localeCompare(b));
    const term = permissionSearch.trim().toUpperCase();
    return term ? sorted.filter(p => p.toUpperCase().includes(term)) : sorted;
  }, [me.permissions, permissionSearch]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600 dark:border-base-300 dark:bg-base-200 dark:text-gray-300">
        <Icon name="circle-info" style="solid" className="mt-0.5 size-4 shrink-0 text-gray-400" />
        <p>{t('myProfile.accessHint')}</p>
      </div>

      {me.companyId && me.companyName && (
        <ProfileSection icon="building" color="blue" title={t('fields.company')}>
          <p className="text-sm text-gray-900 dark:text-base-content">
            {localizeCompanyName(me.companyName, me.companyNameLocal)}
          </p>
        </ProfileSection>
      )}

      <ProfileSection
        icon="user-shield"
        color="violet"
        title={t('sections.roles')}
        count={me.roles.length}
      >
        {me.roles.length === 0 ? (
          <p className="text-sm text-gray-400">{t('empty.noRolesAssigned')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {me.roles.map(role => (
              <Pill key={role} tone="bg-violet-50 text-violet-700" dot="bg-violet-400">
                {roleLabel(role)}
              </Pill>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        icon="users-rectangle"
        color="amber"
        title={t('sections.groups')}
        count={me.groups.length}
      >
        {me.groups.length === 0 ? (
          <p className="text-sm text-gray-400">{t('empty.noGroupsAssigned')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {me.groups.map(group => (
              <Pill
                key={group.groupId}
                tone="bg-amber-50 text-amber-700"
                dot={group.scope === 'Bank' ? 'bg-blue-400' : 'bg-amber-400'}
              >
                {group.groupName}
              </Pill>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        icon="people-group"
        color="teal"
        title={t('sections.teams')}
        count={me.teams.length}
      >
        {me.teams.length === 0 ? (
          <p className="text-sm text-gray-400">{t('empty.noTeamsAssigned')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {me.teams.map(team => (
              <Pill
                key={team.teamId}
                tone="bg-teal-50 text-teal-700"
                dot={team.scope === 'Bank' ? 'bg-blue-400' : 'bg-teal-400'}
              >
                {team.teamName}
              </Pill>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        icon="key"
        color="slate"
        title={t('sections.permissions')}
        count={me.permissions.length}
        action={
          <input
            type="search"
            value={permissionSearch}
            onChange={e => setPermissionSearch(e.currentTarget.value)}
            placeholder={t('placeholders.searchPermissionsShort')}
            className="w-44 rounded-lg border border-gray-200 px-2.5 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-base-300 dark:bg-base-100"
          />
        }
      >
        {permissions.length === 0 ? (
          <p className="text-sm text-gray-400">
            {me.permissions.length === 0 ? t('empty.noPermissionsAssigned') : t('empty.noResults')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {permissions.map(permission => (
              <span
                key={permission}
                className="rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-700 dark:bg-base-300 dark:text-gray-200"
              >
                {permission}
              </span>
            ))}
          </div>
        )}
      </ProfileSection>
    </div>
  );
};

export default ProfileAccessTab;
