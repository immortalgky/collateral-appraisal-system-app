import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useChangePassword, useGetPasswordPolicy } from '../api/users';
import PasswordPolicyChecklist from './PasswordPolicyChecklist';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

const ChangePasswordModal = ({ isOpen, onClose, userId }: ChangePasswordModalProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const changePassword = useChangePassword(userId);
  const { data: policy } = useGetPasswordPolicy();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});
  const [showPasswords, setShowPasswords] = useState(false);

  const minLength = policy?.requiredLength ?? 8;

  const schema = z
    .object({
      currentPassword: z.string().min(1, t('validation.currentPasswordRequired')),
      newPassword: z.string().min(minLength, t('passwordPolicy.minLength', { count: minLength })),
      confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: t('validation.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    });

  const updateField = (key: keyof typeof emptyForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleClose = () => {
    setForm(emptyForm);
    setErrors({});
    onClose();
  };

  const handleSave = () => {
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<typeof emptyForm> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof typeof emptyForm;
        if (field) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    changePassword.mutate(result.data, {
      onSuccess: () => {
        toast.success(t('toasts.passwordChanged'));
        handleClose();
      },
      onError: (err: any) => {
        const msg =
          err?.apiError?.detail || err?.apiError?.title || t('toasts.passwordChangeFailed');
        toast.error(msg);
      },
    });
  };

  const inputType = showPasswords ? 'text' : 'password';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('dialogs.changePassword.title')}
      size="sm"
    >
      <div className="flex flex-col gap-4 p-6">
        {/* Current password */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('fields.currentPassword')} <span className="text-danger">*</span>
          </label>
          <input
            type={inputType}
            value={form.currentPassword}
            onChange={e => updateField('currentPassword', e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
              errors.currentPassword ? 'border-danger' : 'border-gray-200'
            }`}
            placeholder={t('placeholders.enterCurrentPassword')}
          />
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-danger">{errors.currentPassword}</p>
          )}
        </div>

        {/* New password */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('fields.newPassword')} <span className="text-danger">*</span>
          </label>
          <input
            type={inputType}
            value={form.newPassword}
            onChange={e => updateField('newPassword', e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
              errors.newPassword ? 'border-danger' : 'border-gray-200'
            }`}
          />
          {errors.newPassword && <p className="mt-1 text-xs text-danger">{errors.newPassword}</p>}
        </div>

        {/* Password policy checklist */}
        <PasswordPolicyChecklist password={form.newPassword} />

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('fields.confirmNewPassword')} <span className="text-danger">*</span>
          </label>
          <input
            type={inputType}
            value={form.confirmPassword}
            onChange={e => updateField('confirmPassword', e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
              errors.confirmPassword ? 'border-danger' : 'border-gray-200'
            }`}
            placeholder={t('placeholders.reEnterNewPassword')}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-danger">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Show/hide toggle */}
        <button
          type="button"
          onClick={() => setShowPasswords(p => !p)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 self-start"
        >
          <Icon name={showPasswords ? 'eye-slash' : 'eye'} style="regular" className="size-3.5" />
          {showPasswords ? t('buttons.hidePasswords') : t('buttons.showPasswords')}
        </button>
      </div>

      <div className="flex justify-end gap-2 px-6 pb-6">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          isLoading={changePassword.isPending}
          onClick={handleSave}
        >
          {t('buttons.changePassword')}
        </Button>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
