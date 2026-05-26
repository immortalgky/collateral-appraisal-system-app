import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import clsx from 'clsx';
import type { ParameterItem } from './ParameterGroupTable';
import ParameterDetailModal from './ParameterDetailModal';
import type { ParameterFormValues } from './ParameterDetailModal';

interface ParameterDetailTableProps {
  group: string;
  parameters: ParameterItem[];
  isLoading?: boolean;
  onUpdate?: (id: number, data: Partial<Omit<ParameterItem, 'parId' | 'group'>>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

const ParameterDetailTable = ({
  group,
  parameters,
  isLoading,
  onUpdate,
  onDelete,
}: ParameterDetailTableProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<ParameterItem | null>(null);

  const filtered = useMemo(() => {
    return parameters.filter(p => {
      if (statusFilter === 'active' && !p.isActive) return false;
      if (statusFilter === 'inactive' && p.isActive) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    });
  }, [parameters, search, statusFilter]);

  const openEdit = (param: ParameterItem) => {
    setEditingParam(param);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingParam(null);
  };

  const handleSubmit = async (data: ParameterFormValues) => {
    setIsSaving(true);
    try {
      if (editingParam) {
        await onUpdate?.(editingParam.parId, data);
        toast.success('Parameter updated');
      }
      closeModal();
    } catch (error: any) {
      toast.error(error?.apiError?.detail || 'Failed to save parameter.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await onDelete?.(deletingId);
      toast.success('Parameter deleted');
    } catch (error: any) {
      toast.error(error?.apiError?.detail || 'Failed to delete parameter.');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const deletingParam = parameters.find(p => p.parId === deletingId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon
            name="magnifying-glass"
            style="regular"
            className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by code or description..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-2 capitalize transition-colors',
                statusFilter === s
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-500 hover:bg-gray-50',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length !== parameters.length && (
        <div className="px-4 pb-2">
          <span className="text-xs text-gray-400">
            Showing {filtered.length} of {parameters.length} parameter(s)
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="bg-primary/10">
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg w-24">
                Seq
              </th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left w-36">Code</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left">
                Description
              </th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left w-24">
                Country
              </th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left w-24">
                Language
              </th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-24">
                Status
              </th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  <Icon
                    name="rectangle-list"
                    style="regular"
                    className="size-8 mx-auto mb-2 text-gray-300"
                  />
                  <p className="text-sm">No parameters found</p>
                </td>
              </tr>
            ) : (
              filtered.map(param => (
                <tr
                  key={param.parId}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-500">{param.seqNo}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono font-medium text-gray-800">
                      {param.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">{param.description}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 text-center">{param.country}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 text-center">{param.language}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        param.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {param.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => openEdit(param)}
                        leftIcon={
                          <Icon name="pen-to-square" style="regular" className="size-3.5" />
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={isDeleting}
                        onClick={() => setDeletingId(param.parId)}
                        leftIcon={
                          <Icon name="trash-can" style="regular" className="size-3.5 text-danger" />
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <ParameterDetailModal
        isOpen={modalOpen}
        isEditing={editingParam !== null}
        defaultValues={editingParam}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        group={group}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Parameter"
        message={`Are you sure you want to delete "${deletingParam?.description ?? ''}" (${deletingParam?.code ?? ''})? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ParameterDetailTable;
