import { useState } from 'react';
import toast from 'react-hot-toast';
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
      toast.error('First name and last name are required');
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
          toast.success('Profile updated');
          onClose();
        },
        onError: () => toast.error('Failed to update profile'),
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
        <TextInput
          label="First Name"
          value={form.firstName}
          onChange={e => updateField('firstName', e.currentTarget.value)}
          required
          placeholder="First name"
        />
        <TextInput
          label="Last Name"
          value={form.lastName}
          onChange={e => updateField('lastName', e.currentTarget.value)}
          required
          placeholder="Last name"
        />
        <TextInput
          label="Position"
          value={form.position}
          onChange={e => updateField('position', e.currentTarget.value)}
          placeholder="e.g., Senior Appraiser"
        />
        <TextInput
          label="Department"
          value={form.department}
          onChange={e => updateField('department', e.currentTarget.value)}
          placeholder="e.g., Appraisal Division"
        />
      </div>
      <div className="flex justify-end gap-2 px-6 pb-6">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" isLoading={updateProfile.isPending} onClick={handleSave}>
          Save
        </Button>
      </div>
    </Modal>
  );
};

export default EditProfileModal;
