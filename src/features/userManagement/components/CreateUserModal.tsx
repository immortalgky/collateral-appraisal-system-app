import { useState } from 'react';
import toast from 'react-hot-toast';
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
    if (!form.username.trim()) return 'Username is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Email is not valid';
    if (!form.password) return 'Password is required';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(form.password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(form.password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(form.password)) return 'Password must contain a digit';
    if (!/[^A-Za-z0-9]/.test(form.password))
      return 'Password must contain a non-alphanumeric character';
    if (!form.firstName.trim()) return 'First name is required';
    if (!form.lastName.trim()) return 'Last name is required';
    if (form.roles.length === 0) return 'Select at least one role';
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
          toast.success('User created');
          handleClose();
          if (data?.id) onCreated?.(data.id);
        },
        onError: (err: any) => {
          const detail =
            err?.response?.data?.detail ||
            err?.response?.data?.title ||
            'Failed to create user';
          toast.error(detail);
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create User" size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
        <TextInput
          label="Username"
          value={form.username}
          onChange={e => setField('username', e.currentTarget.value)}
          required
          placeholder="jdoe"
        />
        <TextInput
          label="Email"
          type="email"
          value={form.email}
          onChange={e => setField('email', e.currentTarget.value)}
          required
          placeholder="jdoe@example.com"
        />
        <TextInput
          label="First Name"
          value={form.firstName}
          onChange={e => setField('firstName', e.currentTarget.value)}
          required
        />
        <TextInput
          label="Last Name"
          value={form.lastName}
          onChange={e => setField('lastName', e.currentTarget.value)}
          required
        />
        <TextInput
          label="Password"
          type="password"
          value={form.password}
          onChange={e => setField('password', e.currentTarget.value)}
          required
          placeholder="At least 8 chars, upper/lower/digit/symbol"
          autoComplete="new-password"
        />
        <TextInput
          label="Position"
          value={form.position}
          onChange={e => setField('position', e.currentTarget.value)}
        />
        <TextInput
          label="Department"
          value={form.department}
          onChange={e => setField('department', e.currentTarget.value)}
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <div className="block text-xs font-medium text-gray-700 mb-1">
            Roles <span className="text-red-500">*</span>
          </div>
          {allRoles.length === 0 ? (
            <div className="text-xs text-gray-400">No roles available</div>
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
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          isLoading={createUser.isPending}
          onClick={handleCreate}
        >
          Create
        </Button>
      </div>
    </Modal>
  );
};

export default CreateUserModal;
