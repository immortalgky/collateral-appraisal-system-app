import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import ListSortMenu from '../components/ListSortMenu';
import {
  useGetPermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
} from '../api/permissions';
import type { Permission, CreatePermissionRequest } from '../types';

const MODULES = ['Auth', 'Workflow', 'Appraisal', 'Request', 'Common'] as const;
const MODULE_OPTIONS = MODULES.map(m => ({ value: m, label: m }));

const MODULE_BADGE: Record<string, string> = {
  Auth: 'bg-blue-50 text-blue-700',
  Workflow: 'bg-violet-50 text-violet-700',
  Appraisal: 'bg-emerald-50 text-emerald-700',
  Request: 'bg-amber-50 text-amber-700',
  Common: 'bg-gray-100 text-gray-600',
};
const moduleBadge = (m: string) => MODULE_BADGE[m] ?? 'bg-gray-100 text-gray-600';

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
  const { t } = useTranslation(['userManagement', 'common']);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form, setForm] = useState<PermissionFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Permissions are a bounded reference set — load all and filter client-side.
  const { data, isLoading } = useGetPermissions({
    search: debouncedSearch || undefined,
    pageNumber: 1,
    pageSize: 500,
  });

  const permissions = data?.items ?? [];
  const totalCount = data?.totalCount ?? permissions.length;

  const filtered = useMemo(() => {
    const rows = moduleFilter ? permissions.filter(p => p.module === moduleFilter) : permissions;
    return [...rows].sort((a, b) => {
      const cmp =
        sortKey === 'module'
          ? a.module.localeCompare(b.module) || a.displayName.localeCompare(b.displayName)
          : a.displayName.localeCompare(b.displayName);
      return sortAsc ? cmp : -cmp;
    });
  }, [permissions, moduleFilter, sortKey, sortAsc]);

  const SORT_OPTIONS = [
    { key: 'name', label: t('sort.name') },
    { key: 'module', label: t('sort.module') },
  ];

  const selectedPermission = permissions.find(p => p.id === selectedId) ?? null;

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

  const handleConfirmDelete = () => {
    if (!deleteConfirm.id) return;
    deletePermission.mutate(deleteConfirm.id, {
      onSuccess: () => {
        toast.success(t('toasts.permissionDeleted'));
        if (selectedId === deleteConfirm.id) setSelectedId(null);
        setDeleteConfirm({ isOpen: false, id: null });
      },
      onError: (err: any) =>
        toast.error(err?.apiError?.detail ?? t('toasts.permissionDeleteFailed')),
    });
  };

  const updateField = <K extends keyof PermissionFormData>(
    key: K,
    value: PermissionFormData[K],
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.permissionCode || !form.displayName || !form.module) {
      toast.error(t('validation.fillAllRequired'));
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
            toast.success(t('toasts.permissionUpdated'));
            setShowModal(false);
          },
          onError: () => toast.error(t('toasts.permissionUpdateFailed')),
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
          toast.success(t('toasts.permissionCreated'));
          setShowModal(false);
        },
        onError: () => toast.error(t('toasts.permissionCreateFailed')),
      });
    }
  };

  const isSaving = createPermission.isPending || updatePermission.isPending;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('page.permissions.title')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.permissions.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — permission list */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
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
                placeholder={t('placeholders.searchPermissions')}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              title={t('buttons.addPermission')}
              aria-label={t('buttons.addPermission')}
              className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors"
            >
              <Icon name="plus" style="solid" className="size-3.5" />
            </button>
            <ListSortMenu
              options={SORT_OPTIONS}
              sortKey={sortKey}
              asc={sortAsc}
              onChange={(key, asc) => {
                setSortKey(key);
                setSortAsc(asc);
              }}
            />
          </div>

          {/* Module filter chips */}
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setModuleFilter('')}
              className={clsx(
                'px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
                moduleFilter === ''
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              )}
            >
              {t('filters.all')}
            </button>
            {MODULES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModuleFilter(m)}
                className={clsx(
                  'px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
                  moduleFilter === m
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={8} />
                </tbody>
              </table>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs gap-1">
                <Icon name="shield-halved" style="regular" className="size-7 opacity-40" />
                <span>{t('empty.noPermissionsFound')}</span>
              </div>
            ) : (
              filtered.map(permission => (
                <button
                  key={permission.id}
                  type="button"
                  onClick={() => setSelectedId(permission.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 transition-colors',
                    selectedId === permission.id
                      ? 'bg-primary/5 border-l-2 border-primary'
                      : 'hover:bg-gray-50 border-l-2 border-transparent',
                  )}
                >
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {permission.displayName}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <code className="text-[10px] text-gray-400 truncate">
                      {permission.permissionCode}
                    </code>
                    <span
                      className={clsx(
                        'shrink-0 ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                        moduleBadge(permission.module),
                      )}
                    >
                      {permission.module}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — permission detail */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto">
          {selectedPermission ? (
            <div className="flex flex-col gap-4 p-6">
              {/* General Section */}
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md bg-blue-50">
                      <Icon name="circle-info" style="solid" className="size-3 text-blue-500" />
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      {t('sections.general')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedPermission)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Icon name="pen-to-square" style="regular" className="size-3.5" />
                    {t('buttons.edit')}
                  </button>
                </div>
                <div className="px-4 py-4 space-y-2">
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">{t('fields.displayName')}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedPermission.displayName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">{t('fields.permissionCode')}</div>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      {selectedPermission.permissionCode}
                    </code>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">{t('fields.module')}</div>
                    <span
                      className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        moduleBadge(selectedPermission.module),
                      )}
                    >
                      {selectedPermission.module}
                    </span>
                  </div>
                  {selectedPermission.description && (
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">{t('fields.description')}</div>
                      <div className="text-sm text-gray-600">{selectedPermission.description}</div>
                    </div>
                  )}
                </div>
              </section>

              {/* Security Section */}
              <section className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100">
                  <span className="flex size-6 items-center justify-center rounded-md bg-red-50">
                    <Icon
                      name="triangle-exclamation"
                      style="solid"
                      className="size-3 text-danger"
                    />
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {t('sections.security')}
                  </span>
                </div>
                <div className="px-4 py-4">
                  <p className="text-xs text-gray-500 mb-3">
                    {t('security.deletePermissionWarning')}
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteConfirm({ isOpen: true, id: selectedPermission.id })}
                    leftIcon={<Icon name="trash-can" style="regular" className="size-3.5" />}
                  >
                    {t('buttons.deletePermission')}
                  </Button>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Icon name="shield-halved" style="regular" className="size-12 opacity-30" />
              <p className="text-sm">{t('empty.selectPermission')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          editingPermission ? t('dialogs.editPermission.title') : t('dialogs.addPermission.title')
        }
        size="md"
      >
        <div className="grid grid-cols-1 gap-4 p-6">
          <TextInput
            label={t('fields.permissionCode')}
            value={form.permissionCode}
            onChange={e => updateField('permissionCode', e.currentTarget.value)}
            disabled={!!editingPermission}
            required
            placeholder={t('placeholders.permissionCodeExample')}
          />
          <TextInput
            label={t('fields.displayName')}
            value={form.displayName}
            onChange={e => updateField('displayName', e.currentTarget.value)}
            required
            placeholder={t('placeholders.displayNameExample')}
          />
          <Dropdown
            label={t('fields.module')}
            value={form.module}
            onChange={(val: string | null) => updateField('module', val ?? '')}
            options={MODULE_OPTIONS}
            required
          />
          <TextInput
            label={t('fields.description')}
            value={form.description}
            onChange={e => updateField('description', e.currentTarget.value)}
            placeholder={t('placeholders.permissionDescription')}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSubmit}>
            {editingPermission ? t('buttons.update') : t('buttons.create')}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title={t('dialogs.deletePermission.title')}
        message={t('dialogs.deletePermission.message')}
        confirmText={t('common:actions.delete')}
        isLoading={deletePermission.isPending}
      />
    </div>
  );
};

export default PermissionListPage;
