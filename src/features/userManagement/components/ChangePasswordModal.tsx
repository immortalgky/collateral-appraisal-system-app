import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useChangePassword } from '../api/users';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

const ChangePasswordModal = ({ isOpen, onClose, userId }: ChangePasswordModalProps) => {
  const changePassword = useChangePassword(userId);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});
  const [showPasswords, setShowPasswords] = useState(false);

  const updateField = (key: keyof typeof emptyForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error on change
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
        toast.success('Password changed successfully');
        handleClose();
      },
      onError: (err: any) => {
        const msg = err?.apiError?.detail || err?.apiError?.title || 'Failed to change password';
        toast.error(msg);
      },
    });
  };

  const inputType = showPasswords ? 'text' : 'password';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Password" size="sm">
      <div className="flex flex-col gap-4 p-6">
        {/* Current password */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Current Password <span className="text-danger">*</span>
          </label>
          <input
            type={inputType}
            value={form.currentPassword}
            onChange={e => updateField('currentPassword', e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
              errors.currentPassword ? 'border-danger' : 'border-gray-200'
            }`}
            placeholder="Enter current password"
          />
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-danger">{errors.currentPassword}</p>
          )}
        </div>

        {/* New password */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            New Password <span className="text-danger">*</span>
          </label>
          <input
            type={inputType}
            value={form.newPassword}
            onChange={e => updateField('newPassword', e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
              errors.newPassword ? 'border-danger' : 'border-gray-200'
            }`}
            placeholder="At least 8 characters"
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-danger">{errors.newPassword}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Confirm New Password <span className="text-danger">*</span>
          </label>
          <input
            type={inputType}
            value={form.confirmPassword}
            onChange={e => updateField('confirmPassword', e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
              errors.confirmPassword ? 'border-danger' : 'border-gray-200'
            }`}
            placeholder="Re-enter new password"
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
          {showPasswords ? 'Hide' : 'Show'} passwords
        </button>
      </div>

      <div className="flex justify-end gap-2 px-6 pb-6">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" isLoading={changePassword.isPending} onClick={handleSave}>
          Change Password
        </Button>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
