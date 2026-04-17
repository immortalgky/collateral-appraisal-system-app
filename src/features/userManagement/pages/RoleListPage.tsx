import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import RoleDetailPanel from '../components/RoleDetailPanel';
import { useGetRoles, useCreateRole } from '../api/roles';
import type { RoleScope } from '../types';

const SCOPE_OPTIONS = [
  { value: 'Bank', label: 'Bank' },
  { value: 'Company', label: 'Company' },
];

type ScopeTab = 'Bank' | 'Company';

const RoleListPage = () => {
  const [activeTab, setActiveTab] = useState<ScopeTab>('Bank');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', scope: 'Bank' as RoleScope });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedRoleId(null);
  }, [activeTab]);

  const { data, isLoading } = useGetRoles({
    search: debouncedSearch || undefined,
    scope: activeTab,
    pageNumber: 1,
    pageSize: 50,
  });

  const roles = data?.items ?? [];
  const createRole = useCreateRole();

  const handleOpenCreate = () => {
    setCreateForm({ name: '', description: '', scope: activeTab });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    if (!createForm.name || !createForm.scope) {
      toast.error('Name and scope are required');
      return;
    }
    createRole.mutate(
      { name: createForm.name, description: createForm.description, scope: createForm.scope, permissionIds: [] },
      {
        onSuccess: (data: any) => {
          toast.success('Role created');
          setShowCreateModal(false);
          // Select the newly created role if ID returned
          if (data?.id) setSelectedRoleId(data.id);
        },
        onError: () => toast.error('Failed to create role'),
      },
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <SectionHeader
        title="Roles"
        subtitle="Manage roles and their permissions"
        icon="user-shield"
        iconColor="purple"
      />

      <div className="flex gap-4 flex-1 min-h-0 mt-4">
        {/* Left panel — role list */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          {/* Scope toggle tabs */}
          <div className="flex border-b border-gray-100">
            {(['Bank', 'Company'] as ScopeTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search + Add */}
          <div className="px-3 pt-3 pb-2 flex gap-2">
            <div className="relative flex-1">
              <Icon
                name="magnifying-glass"
                style="regular"
                className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              title="Add role"
              className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors"
            >
              <Icon name="plus" style="solid" className="size-3.5" />
            </button>
          </div>

          {/* Role list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
                </tbody>
              </table>
            ) : roles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs gap-1">
                <Icon name="user-shield" style="regular" className="size-7 opacity-40" />
                <span>No roles found</span>
              </div>
            ) : (
              roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 transition-colors',
                    selectedRoleId === role.id
                      ? 'bg-primary/5 border-l-2 border-primary'
                      : 'hover:bg-gray-50 border-l-2 border-transparent',
                  )}
                >
                  <div className="text-sm font-medium text-gray-800 truncate">{role.name}</div>
                  {role.description && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{role.description}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — role detail */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm min-h-0 overflow-y-auto">
          {selectedRoleId ? (
            <RoleDetailPanel
              key={selectedRoleId}
              roleId={selectedRoleId}
              onDeleted={() => setSelectedRoleId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Icon name="user-shield" style="regular" className="size-12 opacity-30" />
              <p className="text-sm">Select a role to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Role"
        size="md"
      >
        <div className="grid grid-cols-1 gap-4 p-6">
          <TextInput
            label="Name"
            value={createForm.name}
            onChange={e => {
              const value = e.currentTarget.value;
              setCreateForm(prev => ({ ...prev, name: value }));
            }}
            required
            placeholder="Role name"
          />
          <Dropdown
            label="Scope"
            value={createForm.scope}
            onChange={(val: string | null) =>
              setCreateForm(prev => ({ ...prev, scope: (val ?? 'Bank') as RoleScope }))
            }
            options={SCOPE_OPTIONS}
            required
          />
          <TextInput
            label="Description"
            value={createForm.description}
            onChange={e => {
              const value = e.currentTarget.value;
              setCreateForm(prev => ({ ...prev, description: value }));
            }}
            placeholder="Brief description of this role"
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" isLoading={createRole.isPending} onClick={handleCreate}>
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default RoleListPage;
