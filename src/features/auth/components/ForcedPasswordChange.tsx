import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import PasswordPolicyChecklist from '@features/userManagement/components/PasswordPolicyChecklist';
import { usePasswordPolicyChecks } from '@features/userManagement/hooks/usePasswordPolicyChecks';
import { useChangePassword } from '@features/userManagement/api/users';
import { useAuthStore } from '../store';
import { logout } from '../utils/logout';

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * Full-screen, non-dismissable gate shown by ProtectedRoute when the signed-in user has
 * `mustChangePassword` set (newly created Local account or admin reset). The only escape is
 * signing out. On success we invalidate the current-user query so /auth/me is re-fetched with
 * the flag cleared, releasing the guard.
 */
const ForcedPasswordChange = () => {
  const { t } = useTranslation(['userManagement', 'common']);
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id) ?? '';
  const changePassword = useChangePassword(userId);

  const [form, setForm] = useState(emptyForm);
  const [showPasswords, setShowPasswords] = useState(false);
  const { allPassed } = usePasswordPolicyChecks(form.newPassword);

  const update = (key: keyof typeof emptyForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.currentPassword) {
      toast.error(t('validation.currentPasswordRequired'));
      return;
    }
    if (!allPassed) {
      toast.error(t('validation.passwordPolicyNotMet'));
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error(t('validation.passwordsDoNotMatch'));
      return;
    }
    changePassword.mutate(form, {
      onSuccess: async () => {
        toast.success(t('toasts.passwordChanged'));
        // /auth/me now returns mustChangePassword=false → guard releases.
        await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      },
      onError: (err: any) =>
        toast.error(
          err?.apiError?.detail || err?.apiError?.title || t('toasts.passwordChangeFailed'),
        ),
    });
  };

  const inputType = showPasswords ? 'text' : 'password';

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-(--palette-surface-2) p-4">
      <div className="w-full max-w-xl rounded-xl border border-(--palette-line-soft) bg-(--palette-surface) p-8 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--palette-warn-wash)">
            <Icon name="key" style="solid" className="size-4 text-amber-500" />
          </div>
          <div>
            <div className="text-base font-semibold leading-tight text-(--palette-ink)">
              {t('forcedPasswordChange.title')}
            </div>
            <p className="mt-0.5 text-xs text-(--palette-gray-500)">
              {t('forcedPasswordChange.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-(--palette-ink)">
              {t('fields.currentPassword')} <span className="text-danger">*</span>
            </label>
            <input
              type={inputType}
              value={form.currentPassword}
              onChange={e => update('currentPassword', e.target.value)}
              className="w-full rounded-lg border border-(--palette-line) px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={t('placeholders.enterCurrentPassword')}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-(--palette-ink)">
              {t('fields.newPassword')} <span className="text-danger">*</span>
            </label>
            <input
              type={inputType}
              value={form.newPassword}
              onChange={e => update('newPassword', e.target.value)}
              className="w-full rounded-lg border border-(--palette-line) px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoComplete="new-password"
            />
          </div>

          <PasswordPolicyChecklist password={form.newPassword} />

          <div>
            <label className="mb-1 block text-xs font-medium text-(--palette-ink)">
              {t('fields.confirmNewPassword')} <span className="text-danger">*</span>
            </label>
            <input
              type={inputType}
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              className="w-full rounded-lg border border-(--palette-line) px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={t('placeholders.reEnterNewPassword')}
              autoComplete="new-password"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords(p => !p)}
            className="flex items-center gap-1.5 self-start text-xs text-(--palette-gray-500) hover:text-(--palette-ink)"
          >
            <Icon name={showPasswords ? 'eye-slash' : 'eye'} style="regular" className="size-3.5" />
            {showPasswords ? t('buttons.hidePasswords') : t('buttons.showPasswords')}
          </button>

          <Button
            variant="primary"
            size="sm"
            isLoading={changePassword.isPending}
            onClick={handleSubmit}
          >
            {t('buttons.changePassword')}
          </Button>

          <button
            type="button"
            onClick={() => void logout()}
            className="text-center text-xs text-(--palette-gray-400) hover:text-(--palette-gray-600)"
          >
            {t('forcedPasswordChange.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForcedPasswordChange;
