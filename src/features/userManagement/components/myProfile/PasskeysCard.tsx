import { useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import Icon from '@shared/components/Icon';
import { formatLocaleDate, formatLocaleDateTime } from '@shared/utils/dateUtils';
import { useDeletePasskey, useGetMyPasskeys } from '../../api/passkeys';
import { usePasskeyErrorMessage } from '../../api/passkeyErrors';
import type { Passkey } from '../../types';
import AddPasskeyDialog from './AddPasskeyDialog';
import ProfileSection from './ProfileSection';
import RenamePasskeyDialog from './RenamePasskeyDialog';

/**
 * Own passkeys: list, add, rename, delete. Shown for Local and LDAP accounts alike. Only what the
 * API returns is shown, so the type is "synced or bound to this device", not the vendor's name.
 */
const PasskeysCard = () => {
  const { t, i18n } = useTranslation(['userManagement', 'common']);
  const errorMessage = usePasskeyErrorMessage();
  const { data: passkeys, isLoading } = useGetMyPasskeys();
  const deletePasskey = useDeletePasskey();

  const [adding, setAdding] = useState(false);
  // The passkey being renamed stays set after the dialog closes, so it does not change while it
  // fades out; `session` is a new key per opening, so the field starts from the current name.
  const [renaming, setRenaming] = useState<{ passkey: Passkey; session: number } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  // Same for the passkey being deleted: its name stays in the dialog while it closes.
  const [deleting, setDeleting] = useState<Passkey | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = () => {
    if (!deleting) return;
    const done = () => {
      toast.success(t('passkeys.toasts.deleted'));
      setDeleteOpen(false);
    };
    deletePasskey.mutate(deleting.id, {
      onSuccess: done,
      // Already gone (another tab, an administrator): the aim is met, and the list refreshes.
      onError: err =>
        isAxiosError(err) && err.response?.status === 404
          ? done()
          : toast.error(errorMessage(err, t('passkeys.toasts.deleteFailed'))),
    });
  };

  const th = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-600';

  return (
    <ProfileSection
      icon="fingerprint"
      color="blue"
      title={t('passkeys.title')}
      action={
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Icon name="plus" style="solid" className="size-3.5!" />}
          onClick={() => setAdding(true)}
        >
          {t('passkeys.add.button')}
        </Button>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">{t('passkeys.description')}</p>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-gray-500">{t('common:status.loading')}</p>
        ) : !passkeys ? (
          // Only when there is nothing to show: a failed background refetch keeps the cached table.
          <p className="text-sm text-gray-500">{t('passkeys.loadFailed')}</p>
        ) : passkeys.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            {t('passkeys.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={th}>{t('passkeys.columns.name')}</th>
                  <th className={th}>{t('passkeys.columns.type')}</th>
                  <th className={th}>{t('passkeys.columns.added')}</th>
                  <th className={th}>{t('passkeys.columns.lastUsed')}</th>
                  <th className={th}>
                    <span className="sr-only">{t('passkeys.columns.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {passkeys.map(passkey => (
                  <tr key={passkey.id}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <Icon
                          name="key"
                          style="regular"
                          className="shrink-0 text-base text-gray-500"
                        />
                        <span
                          className="max-w-[16rem] truncate font-medium text-gray-900"
                          title={passkey.name}
                        >
                          {passkey.name}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        tone={passkey.synced ? 'teal' : 'gray'}
                        dot={false}
                        className="whitespace-nowrap"
                      >
                        {passkey.synced ? t('passkeys.typeSynced') : t('passkeys.typeDevice')}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">
                      {formatLocaleDate(passkey.createdAt, i18n.language)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">
                      {passkey.lastUsedAt ? (
                        formatLocaleDateTime(passkey.lastUsedAt, i18n.language)
                      ) : (
                        <span className="text-gray-500">{t('passkeys.neverUsed')}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setRenaming(prev => ({ passkey, session: (prev?.session ?? 0) + 1 }));
                            setRenameOpen(true);
                          }}
                        >
                          {t('passkeys.rename.button')}
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          className="text-danger!"
                          onClick={() => {
                            setDeleting(passkey);
                            setDeleteOpen(true);
                          }}
                        >
                          {t('passkeys.delete.button')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ul className="mt-4 flex list-disc flex-col gap-1.5 rounded-lg bg-gray-50 py-3 pl-8 pr-4 text-xs text-gray-600">
        <li>{t('passkeys.notes.recentSignIn')}</li>
        <li>{t('passkeys.notes.lostDevice')}</li>
      </ul>

      <AddPasskeyDialog isOpen={adding} onClose={() => setAdding(false)} />

      <RenamePasskeyDialog
        key={renaming?.session}
        passkey={renaming?.passkey ?? null}
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('passkeys.delete.title')}
        message={t('passkeys.delete.message', { name: deleting?.name ?? '' })}
        confirmText={t('passkeys.delete.button')}
        variant="danger"
        isLoading={deletePasskey.isPending}
      />
    </ProfileSection>
  );
};

export default PasskeysCard;
