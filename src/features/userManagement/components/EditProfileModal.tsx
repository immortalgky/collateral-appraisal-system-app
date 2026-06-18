import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import TextInput from '@shared/components/inputs/TextInput';
import { useUpdateProfile } from '../api/users';
import type { UserProfile } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

const EditProfileModal = ({ isOpen, onClose, profile }: EditProfileModalProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    position: profile.position ?? '',
    department: profile.department ?? '',
  });

  const updateField = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!form.firstName || !form.lastName) {
      toast.error(t('validation.firstAndLastNameRequired'));
      return;
    }
    updateProfile.mutate(
      {
        firstName: form.firstName,
        lastName: form.lastName,
        position: form.position || null,
        department: form.department || null,
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.profileUpdated'));
          onClose();
        },
        onError: () => toast.error(t('toasts.profileUpdateFailed')),
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('dialogs.editUser.title')} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
        <TextInput
          label={t('fields.firstName')}
          value={form.firstName}
          onChange={e => updateField('firstName', e.currentTarget.value)}
          required
          placeholder={t('placeholders.firstName')}
        />
        <TextInput
          label={t('fields.lastName')}
          value={form.lastName}
          onChange={e => updateField('lastName', e.currentTarget.value)}
          required
          placeholder={t('placeholders.lastName')}
        />
        <TextInput
          label={t('fields.position')}
          value={form.position}
          onChange={e => updateField('position', e.currentTarget.value)}
          placeholder={t('placeholders.position')}
        />
        <TextInput
          label={t('fields.department')}
          value={form.department}
          onChange={e => updateField('department', e.currentTarget.value)}
          placeholder={t('placeholders.department')}
        />
      </div>
      <div className="flex justify-end gap-2 px-6 pb-6">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          isLoading={updateProfile.isPending}
          onClick={handleSave}
        >
          {t('common:actions.save')}
        </Button>
      </div>
    </Modal>
  );
};

export default EditProfileModal;
