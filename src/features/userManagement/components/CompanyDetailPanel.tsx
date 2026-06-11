import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { Skeleton } from '@shared/components/Skeleton';
import {
  useGetAdminCompanyById,
  useUpdateAdminCompany,
  useDeleteAdminCompany,
} from '../api/companies';
import type { UpdateCompanyRequest } from '../types';

interface CompanyDetailPanelProps {
  companyId: string;
  onDeleted: () => void;
}

type EditForm = Omit<UpdateCompanyRequest, 'loanTypes'> & { loanTypesStr: string };

const defaultForm = (): EditForm => ({
  name: '',
  taxId: '',
  phone: '',
  email: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  contactPerson: '',
  hostCompanyCode: '',
  loanTypesStr: '',
  isActive: true,
  bankAccountNo: '',
  bankAccountName: '',
});

const CompanyDetailPanel = ({ companyId, onDeleted }: CompanyDetailPanelProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const { data: company, isLoading } = useGetAdminCompanyById(companyId);
  const updateCompany = useUpdateAdminCompany();
  const deleteCompany = useDeleteAdminCompany();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(defaultForm());
  const [showDelete, setShowDelete] = useState(false);

  const handleOpenEdit = () => {
    if (!company) return;
    setEditForm({
      name: company.name,
      taxId: company.taxId ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      street: company.street ?? '',
      city: company.city ?? '',
      province: company.province ?? '',
      postalCode: company.postalCode ?? '',
      contactPerson: company.contactPerson ?? '',
      hostCompanyCode: company.hostCompanyCode ?? '',
      loanTypesStr: (company.loanTypes ?? []).join(', '),
      isActive: company.isActive,
      bankAccountNo: company.bankAccountNo ?? '',
      bankAccountName: company.bankAccountName ?? '',
    });
    setShowEditModal(true);
  };

  const handleSave = () => {
    if (!editForm.name) {
      toast.error(t('validation.nameRequired'));
      return;
    }
    const loanTypes = editForm.loanTypesStr
      ? editForm.loanTypesStr
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];
    updateCompany.mutate(
      {
        id: companyId,
        name: editForm.name,
        taxId: editForm.taxId || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        street: editForm.street || null,
        city: editForm.city || null,
        province: editForm.province || null,
        postalCode: editForm.postalCode || null,
        contactPerson: editForm.contactPerson || null,
        hostCompanyCode: editForm.hostCompanyCode || null,
        loanTypes,
        isActive: editForm.isActive,
        bankAccountNo: editForm.bankAccountNo || null,
        bankAccountName: editForm.bankAccountName || null,
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.companyUpdated'));
          setShowEditModal(false);
        },
        onError: () => toast.error(t('toasts.companyUpdateFailed')),
      },
    );
  };

  const handleConfirmDelete = () => {
    deleteCompany.mutate(companyId, {
      onSuccess: () => {
        toast.success(t('toasts.companyDeleted'));
        setShowDelete(false);
        onDeleted();
      },
      onError: () => toast.error(t('toasts.companyDeleteFailed')),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-40" variant="rounded" />
        <Skeleton className="h-4 w-64" variant="rounded" />
        <Skeleton className="h-32 w-full" variant="rounded" />
        <Skeleton className="h-32 w-full" variant="rounded" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* General Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="building" style="solid" className="size-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">{t('sections.general')}</span>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            {t('buttons.edit')}
          </button>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
          <InfoRow label={t('fields.companyName')} value={company.name} />
          <InfoRow label={t('fields.taxId')} value={company.taxId} />
          <InfoRow label={t('fields.phone')} value={company.phone} />
          <InfoRow label={t('fields.email')} value={company.email} />
          <InfoRow label={t('fields.contactPerson')} value={company.contactPerson} />
          <InfoRow label={t('fields.hostCompanyCode')} value={company.hostCompanyCode} />
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t('fields.status')}</div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                company.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {company.isActive ? t('status.active') : t('status.inactive')}
            </span>
          </div>
        </div>
      </section>

      {/* Address Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Icon name="location-dot" style="solid" className="size-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-800">{t('sections.address')}</span>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
          <InfoRow label={t('fields.street')} value={company.street} />
          <InfoRow label={t('fields.city')} value={company.city} />
          <InfoRow label={t('fields.province')} value={company.province} />
          <InfoRow label={t('fields.postalCode')} value={company.postalCode} />
        </div>
      </section>

      {/* Bank Account Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Icon name="landmark" style="solid" className="size-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-800">{t('sections.bankAccount')}</span>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
          <InfoRow label={t('fields.bankAccountNo')} value={company.bankAccountNo} />
          <InfoRow label={t('fields.bankAccountName')} value={company.bankAccountName} />
        </div>
      </section>

      {/* Loan Types */}
      {(company.loanTypes ?? []).length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Icon name="tags" style="solid" className="size-4 text-cyan-500" />
            <span className="text-sm font-semibold text-gray-800">{t('fields.loanTypes')}</span>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-1.5">
            {(company.loanTypes ?? []).map(lt => (
              <span
                key={lt}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700"
              >
                {lt}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Security Section */}
      <section className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100">
          <Icon name="triangle-exclamation" style="solid" className="size-4 text-danger" />
          <span className="text-sm font-semibold text-gray-800">{t('sections.security')}</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-3">{t('security.deleteCompanyWarning')}</p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDelete(true)}
            leftIcon={<Icon name="trash-can" style="regular" className="size-3.5" />}
          >
            {t('buttons.deleteCompany')}
          </Button>
        </div>
      </section>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('dialogs.editCompany.title')}
        size="xl"
      >
        <div className="grid grid-cols-2 gap-4 p-6">
          <TextInput
            label={t('fields.companyName')}
            value={editForm.name}
            onChange={e => setEditForm(prev => ({ ...prev, name: e.currentTarget.value }))}
            required
            placeholder={t('placeholders.companyName')}
          />
          <TextInput
            label={t('fields.taxId')}
            value={editForm.taxId ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, taxId: e.currentTarget.value }))}
            placeholder={t('placeholders.taxId')}
          />
          <TextInput
            label={t('fields.phone')}
            value={editForm.phone ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, phone: e.currentTarget.value }))}
            placeholder={t('placeholders.phone')}
          />
          <TextInput
            label={t('fields.email')}
            value={editForm.email ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, email: e.currentTarget.value }))}
            placeholder={t('placeholders.email')}
          />
          <TextInput
            label={t('fields.contactPerson')}
            value={editForm.contactPerson ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, contactPerson: e.currentTarget.value }))}
            placeholder={t('placeholders.contactPerson')}
          />
          <TextInput
            label={t('fields.hostCompanyCode')}
            value={editForm.hostCompanyCode ?? ''}
            onChange={e =>
              setEditForm(prev => ({ ...prev, hostCompanyCode: e.currentTarget.value }))
            }
            placeholder={t('placeholders.hostCompanyCode')}
            maxLength={10}
          />
          <div className="flex items-center gap-3 pt-5">
            <input
              type="checkbox"
              id="company-isActive"
              checked={editForm.isActive ?? true}
              onChange={e => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            <label htmlFor="company-isActive" className="text-sm text-gray-700">
              {t('fields.isActive')}
            </label>
          </div>
          <TextInput
            label={t('fields.street')}
            value={editForm.street ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, street: e.currentTarget.value }))}
            placeholder={t('placeholders.street')}
          />
          <TextInput
            label={t('fields.city')}
            value={editForm.city ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, city: e.currentTarget.value }))}
            placeholder={t('placeholders.city')}
          />
          <TextInput
            label={t('fields.province')}
            value={editForm.province ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, province: e.currentTarget.value }))}
            placeholder={t('placeholders.province')}
          />
          <TextInput
            label={t('fields.postalCode')}
            value={editForm.postalCode ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, postalCode: e.currentTarget.value }))}
            placeholder={t('placeholders.postalCode')}
          />
          <TextInput
            label={t('fields.bankAccountNo')}
            value={editForm.bankAccountNo ?? ''}
            onChange={e => setEditForm(prev => ({ ...prev, bankAccountNo: e.currentTarget.value }))}
            placeholder={t('placeholders.bankAccountNo')}
          />
          <TextInput
            label={t('fields.bankAccountName')}
            value={editForm.bankAccountName ?? ''}
            onChange={e =>
              setEditForm(prev => ({ ...prev, bankAccountName: e.currentTarget.value }))
            }
            placeholder={t('placeholders.bankAccountName')}
          />
          <div className="col-span-2">
            <TextInput
              label={t('fields.loanTypes')}
              value={editForm.loanTypesStr}
              onChange={e =>
                setEditForm(prev => ({ ...prev, loanTypesStr: e.currentTarget.value }))
              }
              placeholder={t('placeholders.loanTypes')}
            />
            <p className="text-xs text-gray-400 mt-1">{t('hints.loanTypesComma')}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateCompany.isPending}
            onClick={handleSave}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleConfirmDelete}
        title={t('dialogs.deleteCompany.title')}
        message={t('dialogs.deleteCompany.message', { name: company.name })}
        confirmText={t('common:actions.delete')}
        isLoading={deleteCompany.isPending}
      />
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string | null | undefined;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div>
    <div className="text-xs text-gray-400 mb-0.5">{label}</div>
    <div className="text-sm text-gray-700">{value || '—'}</div>
  </div>
);

export default CompanyDetailPanel;
