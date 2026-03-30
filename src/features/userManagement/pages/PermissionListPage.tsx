import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Pagination from '@shared/components/Pagination';
import {
  useGetPermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
} from '../api/permissions';
import type { Permission, CreatePermissionRequest } from '../types';

const PAGE_SIZE = 20;

const TABLE_SKELETON_COLUMNS = [
  { width: 'w-32' },
  { width: 'w-40' },
  { width: 'w-20' },
  { width: 'w-48' },
  { width: 'w-16' },
];

const MODULE_OPTIONS = [
  { value: 'Auth', label: 'Auth' },
  { value: 'Workflow', label: 'Workflow' },
  { value: 'Appraisal', label: 'Appraisal' },
  { value: 'Request', label: 'Request' },
  { value: 'Common', label: 'Common' },
];

type PermissionFormData = {
  permissionCode: string;
  displayName: string;
  description: string;
  module: string;
};

const emptyForm: PermissionFormData = {
  permissionCode: '',
  displayName: '',
  description: '',
  module: '',
};

const PermissionListPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Pagination component is 0-based; backend is 1-based — we store 0-based internally
  const [pageIndex, setPageIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form, setForm] = useState<PermissionFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  // Debounce search — reset to page 1 on new search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPageIndex(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useGetPermissions({
    search: debouncedSearch || undefined,
    pageNumber: pageIndex + 1, // convert 0-based index to 1-based page number
    pageSize: PAGE_SIZE,
  });

  const permissions = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  const handleOpenCreate = () => {
    setEditingPermission(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setForm({
      permissionCode: permission.permissionCode,
      displayName: permission.displayName,
      description: permission.description,
      module: permission.module,
    });
    setShowModal(true);
  };

  const handleOpenDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleCloseDelete = () => {
    setDeleteConfirm({ isOpen: false, id: null });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm.id) return;
    deletePermission.mutate(deleteConfirm.id, {
      onSuccess: () => {
        toast.success('Permission deleted successfully');
        handleCloseDelete();
      },
      onError: () => toast.error('Failed to delete permission'),
    });
  };

  const updateField = <K extends keyof PermissionFormData>(key: K, value: PermissionFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.permissionCode || !form.displayName || !form.module) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingPermission) {
      updatePermission.mutate(
        {
          id: editingPermission.id,
          displayName: form.displayName,
          description: form.description,
          module: form.module,
        },
        {
          onSuccess: () => {
            toast.success('Permission updated successfully');
            setShowModal(false);
          },
          onError: () => toast.error('Failed to update permission'),
        },
      );
    } else {
      const request: CreatePermissionRequest = {
        permissionCode: form.permissionCode,
        displayName: form.displayName,
        description: form.description,
        module: form.module,
      };
      createPermission.mutate(request, {
        onSuccess: () => {
          toast.success('Permission created successfully');
          setShowModal(false);
        },
        onError: () => toast.error('Failed to create permission'),
      });
    }
  };

  const isSaving = createPermission.isPending || updatePermission.isPending;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title="Permissions"
        subtitle="Manage system permissions that can be assigned to roles"
        icon="shield-halved"
        iconColor="blue"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            Add Permission
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        {/* Search */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="relative flex-1 max-w-sm">
            <Icon
              name="magnifying-glass"
              style="regular"
              className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code or display name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Display Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Permission Code
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Module
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Description
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowSkeleton columns={TABLE_SKELETON_COLUMNS} rows={5} />
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    <Icon name="shield-halved" style="regular" className="size-8 mx-auto mb-2 opacity-40" />
                    <p>No permissions found</p>
                  </td>
                </tr>
              ) : (
                permissions.map(permission => (
                  <tr key={permission.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{permission.displayName}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {permission.permissionCode}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {permission.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {permission.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(permission)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Icon name="pen-to-square" style="regular" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(permission.id)}
                          className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Icon name="trash-can" style="regular" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalCount > 0 && (
          <Pagination
            currentPage={pageIndex}
            totalPages={Math.ceil(totalCount / PAGE_SIZE)}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPageIndex}
            showPageSizeSelector={false}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPermission ? 'Edit Permission' : 'Add Permission'}
        size="md"
      >
        <div className="grid grid-cols-1 gap-4 p-6">
          <TextInput
            label="Permission Code"
            value={form.permissionCode}
            onChange={e => updateField('permissionCode', e.currentTarget.value)}
            disabled={!!editingPermission}
            required
            placeholder="e.g., permissions.read"
          />
          <TextInput
            label="Display Name"
            value={form.displayName}
            onChange={e => updateField('displayName', e.currentTarget.value)}
            required
            placeholder="e.g., View Permissions"
          />
          <Dropdown
            label="Module"
            value={form.module}
            onChange={(val: string | null) => updateField('module', val ?? '')}
            options={MODULE_OPTIONS}
            required
          />
          <TextInput
            label="Description"
            value={form.description}
            onChange={e => updateField('description', e.currentTarget.value)}
            placeholder="Brief description of what this permission allows"
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSubmit}>
            {editingPermission ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Permission"
        message="Are you sure you want to delete this permission? This action cannot be undone."
        confirmText="Delete"
        isLoading={deletePermission.isPending}
      />
    </div>
  );
};

export default PermissionListPage;
