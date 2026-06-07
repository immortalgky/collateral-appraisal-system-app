import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import TextInput from '@shared/components/inputs/TextInput';
import Checkbox from '@shared/components/inputs/Checkbox';
import { useCreateUser } from '../api/users';
import { useGetRoles } from '../api/roles';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (userId: string) => void;
}

interface FormState {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  roles: string[];
}

const EMPTY_FORM: FormState = {
  username: '',
  password: '',
  email: '',
  firstName: '',
  lastName: '',
  position: '',
  department: '',
  roles: [],
};

const CreateUserModal = ({ isOpen, onClose, onCreated }: CreateUserModalProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const createUser = useCreateUser();
  const { data: rolesData } = useGetRoles({ pageSize: 200 });
  const allRoles = rolesData?.items ?? [];

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleRole = (roleId: string) =>
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(id => id !== roleId)
        : [...prev.roles, roleId],
    }));

  const validate = (): string | null => {
    if (!form.username.trim()) return t('validation.usernameRequired');
    if (!form.email.trim()) return t('validation.emailRequired');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return t('validation.emailInvalid');
    if (!form.password) return t('validation.passwordRequired');
    if (form.password.length < 8) return t('validation.passwordMinLength');
    if (!/[A-Z]/.test(form.password)) return t('validation.passwordUppercase');
    if (!/[a-z]/.test(form.password)) return t('validation.passwordLowercase');
    if (!/[0-9]/.test(form.password)) return t('validation.passwordDigit');
    if (!/[^A-Za-z0-9]/.test(form.password)) return t('validation.passwordSymbol');
    if (!form.firstName.trim()) return t('validation.firstNameRequired');
    if (!form.lastName.trim()) return t('validation.lastNameRequired');
    if (form.roles.length === 0) return t('validation.selectAtLeastOneRole');
    return null;
  };

  const handleCreate = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    createUser.mutate(
      {
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        position: form.position.trim() || null,
        department: form.department.trim() || null,
        roles: form.roles,
      },
      {
        onSuccess: data => {
          toast.success(t('toasts.userCreated'));
          handleClose();
          if (data?.id) onCreated?.(data.id);
        },
        onError: (err: any) => {
          const detail =
            err?.response?.data?.detail ||
            err?.response?.data?.title ||
            t('toasts.userUpdateFailed');
          toast.error(detail);
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.createUser.title')} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
        <TextInput
          label={t('fields.username')}
          value={form.username}
          onChange={e => setField('username', e.currentTarget.value)}
          required
          placeholder={t('placeholders.username')}
        />
        <TextInput
          label={t('fields.email')}
          type="email"
          value={form.email}
          onChange={e => setField('email', e.currentTarget.value)}
          required
          placeholder={t('placeholders.email')}
        />
        <TextInput
          label={t('fields.firstName')}
          value={form.firstName}
          onChange={e => setField('firstName', e.currentTarget.value)}
          required
        />
        <TextInput
          label={t('fields.lastName')}
          value={form.lastName}
          onChange={e => setField('lastName', e.currentTarget.value)}
          required
        />
        <TextInput
          label={t('fields.password')}
          type="password"
          value={form.password}
          onChange={e => setField('password', e.currentTarget.value)}
          required
          placeholder={t('placeholders.passwordHint')}
          autoComplete="new-password"
        />
        <TextInput
          label={t('fields.position')}
          value={form.position}
          onChange={e => setField('position', e.currentTarget.value)}
        />
        <TextInput
          label={t('fields.department')}
          value={form.department}
          onChange={e => setField('department', e.currentTarget.value)}
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <div className="block text-xs font-medium text-gray-700 mb-1">
            {t('sections.roles')} <span className="text-red-500">*</span>
          </div>
          {allRoles.length === 0 ? (
            <div className="text-xs text-gray-400">{t('empty.noRolesAvailable')}</div>
          ) : (
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {allRoles.map(role => (
                <Checkbox
                  key={role.id}
                  label={`${role.name}${role.description ? ` — ${role.description}` : ''}`}
                  checked={form.roles.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  size="sm"
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 px-6 pb-6">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          {t('common:actions.cancel')}
        </Button>
        <Button variant="primary" size="sm" isLoading={createUser.isPending} onClick={handleCreate}>
          {t('buttons.create')}
        </Button>
      </div>
    </Modal>
  );
};

export default CreateUserModal;
