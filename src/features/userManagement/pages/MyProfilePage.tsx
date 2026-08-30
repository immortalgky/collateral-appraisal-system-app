import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Avatar from '@shared/components/Avatar';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import { useLocalizedCompanyName } from '@shared/utils/companyName';
import { useGetMe } from '../api/users';
import { isLdapAuthSource } from '../authSource';
import ProfileInfoTab from '../components/myProfile/ProfileInfoTab';
import ProfileSecurityTab from '../components/myProfile/ProfileSecurityTab';
import ProfilePreferencesTab from '../components/myProfile/ProfilePreferencesTab';
import ProfileAccessTab from '../components/myProfile/ProfileAccessTab';

const TABS = ['profile', 'security', 'preferences', 'access'] as const;
type ProfileTab = (typeof TABS)[number];

const isProfileTab = (value: string | null): value is ProfileTab =>
  value !== null && (TABS as readonly string[]).includes(value);

/**
 * The signed-in user's own profile. Reachable from the avatar dropdown by every
 * authenticated user — no permission guard, since it only ever shows and edits
 * the caller's own record via /auth/me and /auth/profile.
 *
 * Not to be confused with UserProfilePage, which is the admin user list.
 */
const MyProfilePage = () => {
  const { t } = useTranslation(['userManagement', 'nav', 'common']);
  const localizeCompanyName = useLocalizedCompanyName();
  const { data: me, isLoading, isError } = useGetMe();
  const [searchParams, setSearchParams] = useSearchParams();

  useBreadcrumb(t('nav:userMenu.yourProfile'), 'user');

  // The active tab rides in the URL so a refresh (or a shared link) lands back
  // on the same section instead of resetting to Profile.
  const rawTab = searchParams.get('tab');
  const activeTab: ProfileTab = isProfileTab(rawTab) ? rawTab : 'profile';

  const selectTab = (tab: ProfileTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'profile') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const fullName = useMemo(
    () => (me ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || me.username : ''),
    [me],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton variant="rounded" height={112} />
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={280} />
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">{t('myProfile.loadFailed')}</p>
      </div>
    );
  }

  const isLdap = isLdapAuthSource(me.authSource);
  const subtitleParts = [
    me.position,
    me.department,
    me.companyId && me.companyName
      ? localizeCompanyName(me.companyName, me.companyNameLocal)
      : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      {/* Identity header */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-base-300 dark:bg-base-200">
        <Avatar src={me.avatarUrl} name={fullName} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* text-lg! — index.css carries a leftover `h1 { font-size: 3.2em }` from the
                Vite template, and unlayered CSS beats Tailwind utilities. */}
            <h1 className="truncate text-lg! font-semibold text-gray-900 dark:text-base-content">
              {fullName}
            </h1>
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                isLdap ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600',
              )}
            >
              <Icon name={isLdap ? 'building-lock' : 'user'} style="solid" className="size-2.5" />
              {isLdap ? t('fields.authSourceLdap') : t('fields.authSourceLocal')}
            </span>
          </div>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{me.email ?? '—'}</p>
          {subtitleParts.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {subtitleParts.join(' · ')}
            </p>
          )}
        </div>
        {me.employeeId && (
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('fields.employeeId')}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-base-content">
              {me.employeeId}
            </p>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t('nav:userMenu.yourProfile')}
        className="flex w-full gap-0.5 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-base-300 dark:bg-base-300"
      >
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => selectTab(tab)}
            className={clsx(
              'flex-auto whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm dark:bg-base-100 dark:text-base-content'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-base-content',
            )}
          >
            {t(`myProfile.tabs.${tab}` as never)}
          </button>
        ))}
      </div>

      {/* Hidden rather than unmounted: ProfileInfoTab holds the edit form in local
          state, and unmounting it would throw away unsaved typing the moment someone
          clicked another tab — with no prompt and no way back. */}
      <div className={clsx(activeTab !== 'profile' && 'hidden')}>
        <ProfileInfoTab me={me} isLdap={isLdap} />
      </div>
      <div className={clsx(activeTab !== 'security' && 'hidden')}>
        <ProfileSecurityTab me={me} isLdap={isLdap} />
      </div>
      <div className={clsx(activeTab !== 'preferences' && 'hidden')}>
        <ProfilePreferencesTab />
      </div>
      <div className={clsx(activeTab !== 'access' && 'hidden')}>
        <ProfileAccessTab me={me} />
      </div>
    </div>
  );
};

export default MyProfilePage;
